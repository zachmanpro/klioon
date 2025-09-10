import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/amplify-client';
import { hashPassword } from '@/lib/auth/config';
import { rateLimiter } from '@/lib/utils/rate-limiter';
import { z } from 'zod';
import crypto from 'crypto';
import { resetTokens } from '../forgot-password/route';

// Validation schema for password reset
const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required')
    .length(64, 'Invalid reset token format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Validation schema for token verification (GET request)
const tokenVerificationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Apply rate limiting (5 attempts per 15 minutes per IP)
    const rateLimitResult = await rateLimiter.check(ip, 'passwordReset', 5, 900);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many password reset attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: validationResult.error.issues,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;

    // Hash the token to find it in storage
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenData = resetTokens.get(hashedToken);

    if (!tokenData) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired reset token',
          code: 'INVALID_TOKEN'
        },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (Date.now() > tokenData.expires) {
      resetTokens.delete(hashedToken);
      return NextResponse.json(
        { 
          error: 'Reset token has expired. Please request a new password reset.',
          code: 'TOKEN_EXPIRED'
        },
        { status: 400 }
      );
    }

    // Check attempt limit (prevent brute force)
    if (tokenData.attempts >= 3) {
      resetTokens.delete(hashedToken);
      return NextResponse.json(
        { 
          error: 'Too many attempts with this token. Please request a new password reset.',
          code: 'TOO_MANY_ATTEMPTS'
        },
        { status: 400 }
      );
    }

    // Increment attempt counter
    tokenData.attempts++;

    try {
      // Get user and verify they still exist and are active
      const user = await UserService.getUserById(tokenData.userId);
      
      if (!user || !user.isActive) {
        resetTokens.delete(hashedToken);
        return NextResponse.json(
          { 
            error: 'User account not found or has been deactivated',
            code: 'USER_NOT_FOUND'
          },
          { status: 400 }
        );
      }

      // Hash the new password
      const passwordHash = await hashPassword(password);

      // Update user password
      const updatedUser = await UserService.updateUser(user.id, {
        passwordHash,
        updatedAt: new Date().toISOString(),
      });

      if (!updatedUser) {
        throw new Error('Failed to update user password');
      }

      // Remove the used token
      resetTokens.delete(hashedToken);

      // Clean up any other expired tokens
      cleanupExpiredTokens();

      return NextResponse.json(
        {
          success: true,
          message: 'Password has been reset successfully. You can now log in with your new password.',
          code: 'PASSWORD_RESET_SUCCESS'
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Password reset error:', error);
      
      return NextResponse.json(
        { 
          error: 'Failed to reset password. Please try again.',
          code: 'RESET_FAILED'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Reset password API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Validate token parameter
    const validationResult = tokenVerificationSchema.safeParse({ token });
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid token parameter',
          code: 'INVALID_TOKEN_PARAM'
        },
        { status: 400 }
      );
    }

    // Hash the token to find it in storage
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenData = resetTokens.get(hashedToken);

    if (!tokenData) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid reset token',
          code: 'TOKEN_NOT_FOUND'
        },
        { status: 200 } // Use 200 for client-side handling
      );
    }

    // Check if token has expired
    if (Date.now() > tokenData.expires) {
      resetTokens.delete(hashedToken);
      return NextResponse.json(
        { 
          valid: false,
          error: 'Reset token has expired',
          code: 'TOKEN_EXPIRED'
        },
        { status: 200 }
      );
    }

    // Check attempt limit
    if (tokenData.attempts >= 3) {
      resetTokens.delete(hashedToken);
      return NextResponse.json(
        { 
          valid: false,
          error: 'Token has been used too many times',
          code: 'TOO_MANY_ATTEMPTS'
        },
        { status: 200 }
      );
    }

    // Verify user still exists and is active
    try {
      const user = await UserService.getUserById(tokenData.userId);
      
      if (!user || !user.isActive) {
        resetTokens.delete(hashedToken);
        return NextResponse.json(
          { 
            valid: false,
            error: 'Associated user account not found',
            code: 'USER_NOT_FOUND'
          },
          { status: 200 }
        );
      }

      const expiresIn = Math.max(0, Math.floor((tokenData.expires - Date.now()) / 1000));

      return NextResponse.json(
        {
          valid: true,
          expiresIn,
          attemptsRemaining: Math.max(0, 3 - tokenData.attempts),
          userEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Masked email
          code: 'TOKEN_VALID'
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Token verification error:', error);
      
      return NextResponse.json(
        { 
          valid: false,
          error: 'Failed to verify token',
          code: 'VERIFICATION_ERROR'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Token verification API error:', error);
    
    return NextResponse.json(
      { 
        valid: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Utility function to clean up expired tokens
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expires < now) {
      resetTokens.delete(token);
    }
  }
}