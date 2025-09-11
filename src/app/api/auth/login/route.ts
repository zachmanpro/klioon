import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, AuthRateLimiter } from '@/lib/auth/config';
import { UserService } from '@/lib/auth/amplify-client';
import { validateRegistrationInput } from '@/lib/auth/validation';
import { rateLimiter, RATE_LIMITS } from '@/lib/utils/rate-limiter';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Login request validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Apply primary rate limiting using our utility
    const rateLimitResult = await rateLimiter.check(
      ip, 
      'login', 
      RATE_LIMITS.login.limit, 
      RATE_LIMITS.login.windowSeconds
    );
    
    if (!rateLimitResult.success) {
      // Record attempt in auth rate limiter
      AuthRateLimiter.recordAttempt(ip);
      
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    // Check auth rate limiter as additional security layer
    if (AuthRateLimiter.isRateLimited(ip)) {
      return NextResponse.json(
        { 
          error: 'Login attempts temporarily blocked. Please wait before trying again.',
          code: 'AUTH_BLOCKED'
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

    // Validate input using Zod schema
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      // Record failed attempt
      AuthRateLimiter.recordAttempt(ip);
      
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: validationResult.error.issues,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { email, password, remember } = validationResult.data;

    // Check if user exists and is active
    const user = await UserService.getUserByEmail(email.toLowerCase());
    
    if (!user) {
      // Record failed attempt but don't reveal if user exists
      AuthRateLimiter.recordAttempt(ip);
      
      return NextResponse.json(
        { 
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      AuthRateLimiter.recordAttempt(ip);
      
      return NextResponse.json(
        { 
          error: 'Account has been deactivated. Please contact support.',
          code: 'ACCOUNT_DEACTIVATED'
        },
        { status: 403 }
      );
    }

    // Verify password
    let isValidPassword = false;
    try {
      if (user.passwordHash) {
        isValidPassword = await bcrypt.compare(password, user.passwordHash);
      }
    } catch (error) {
      console.error('Password verification error:', error);
      isValidPassword = false;
    }

    if (!isValidPassword) {
      // Record failed attempt
      AuthRateLimiter.recordAttempt(ip);
      
      return NextResponse.json(
        { 
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // Clear rate limiting on successful authentication
    AuthRateLimiter.clearAttempts(ip);

    // Update last login time
    try {
      await UserService.updateLastLogin(user.id);
    } catch (error) {
      console.error('Failed to update last login time:', error);
      // Don't fail the login for this
    }

    // Return success response with user data (excluding password hash)
    const { passwordHash, ...safeUserData } = user;
    
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: safeUserData,
        sessionDuration: remember ? '30 days' : '24 hours',
        nextAuthUrl: '/api/auth/callback/credentials',
        code: 'LOGIN_SUCCESS'
      },
      { 
        status: 200,
        headers: {
          'Set-Cookie': remember 
            ? 'remember-me=true; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict'
            : 'remember-me=false; Max-Age=86400; HttpOnly; Secure; SameSite=Strict'
        }
      }
    );

  } catch (error) {
    console.error('Login API error:', error);
    
    // Record error as failed attempt to prevent abuse
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               'unknown';
    AuthRateLimiter.recordAttempt(ip);
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// GET method for checking login status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          authenticated: false,
          user: null,
          code: 'NOT_AUTHENTICATED'
        },
        { status: 200 }
      );
    }

    // Validate session is still active
    const isValid = await UserService.getUserById(session.user.id);
    if (!isValid || !isValid.isActive) {
      return NextResponse.json(
        { 
          authenticated: false,
          user: null,
          code: 'SESSION_INVALID'
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          role: session.user.role,
          emailVerified: session.user.emailVerified,
          profilePicture: session.user.profilePicture,
        },
        expires: session.expires,
        code: 'AUTHENTICATED'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login status check error:', error);
    
    return NextResponse.json(
      { 
        authenticated: false,
        user: null,
        error: 'Failed to check authentication status',
        code: 'STATUS_ERROR'
      },
      { status: 500 }
    );
  }
}