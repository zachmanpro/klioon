import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/amplify-client';
import { rateLimiter, RATE_LIMITS } from '@/lib/utils/rate-limiter';
import { z } from 'zod';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Validation schema for forgot password request
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform((val) => val.toLowerCase().trim()),
});

// In-memory token storage (in production, use Redis or database)
const resetTokens = new Map<string, {
  userId: string;
  token: string;
  expires: number;
  attempts: number;
}>();

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Apply rate limiting (3 requests per hour per IP)
    const rateLimitResult = await rateLimiter.check(
      ip, 
      'passwordReset', 
      RATE_LIMITS.passwordReset.limit, 
      RATE_LIMITS.passwordReset.windowSeconds
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many password reset requests. Please try again later.',
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
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid email address',
          details: validationResult.error.issues,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Check if user exists
    const user = await UserService.getUserByEmail(email);
    
    // Always return success to prevent email enumeration attacks
    // but only send email if user actually exists
    let emailSent = false;
    
    if (user && user.isActive) {
      try {
        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = Date.now() + (30 * 60 * 1000); // 30 minutes

        // Store token (in production, store hashedToken in database)
        resetTokens.set(hashedToken, {
          userId: user.id,
          token: hashedToken,
          expires,
          attempts: 0,
        });

        // Clean up expired tokens
        cleanupExpiredTokens();

        // Send reset email
        await sendPasswordResetEmail(email, resetToken, user.firstName);
        emailSent = true;

      } catch (error) {
        console.error('Password reset error:', error);
        // Don't expose internal errors to client
      }
    }

    // Always return success response
    return NextResponse.json(
      {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        emailSent, // For debugging/admin purposes
        code: 'RESET_REQUESTED'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Utility function to send password reset email
async function sendPasswordResetEmail(email: string, token: string, firstName: string) {
  // Create nodemailer transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Generate reset URL
  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

  // Email content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - BIGZ</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">BIGZ</h1>
        <p style="color: #94a3b8; margin: 10px 0 0 0;">Adventures of Big Z</p>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
        
        <p>Hi ${firstName},</p>
        
        <p>We received a request to reset your password for your BIGZ account. If you didn't make this request, you can safely ignore this email.</p>
        
        <p>To reset your password, click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">${resetUrl}</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
          This link will expire in 30 minutes for security reasons.<br>
          If you need help, contact our support team.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
        <p>© 2025 BIGZ. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    BIGZ - Password Reset Request
    
    Hi ${firstName},
    
    We received a request to reset your password for your BIGZ account. If you didn't make this request, you can safely ignore this email.
    
    To reset your password, visit this link:
    ${resetUrl}
    
    This link will expire in 30 minutes for security reasons.
    
    If you need help, contact our support team.
    
    © 2025 BIGZ. All rights reserved.
  `;

  // Send email
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"BIGZ" <noreply@bigz.com>',
    to: email,
    subject: 'Password Reset - BIGZ',
    text: textContent,
    html: htmlContent,
  });
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

// Export the token storage for use in reset-password route
export { resetTokens };