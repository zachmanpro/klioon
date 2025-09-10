import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/amplify-client';
import { rateLimiter } from '@/lib/utils/rate-limiter';

// In-memory storage for verification tokens (use Redis in production)
const verificationTokens = new Map<string, {
  userId: string;
  email: string;
  expiresAt: number;
  used: boolean;
}>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Check if token exists and is valid
    const tokenData = verificationTokens.get(token);
    
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (Date.now() > tokenData.expiresAt) {
      verificationTokens.delete(token);
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (tokenData.used) {
      return NextResponse.json(
        { error: 'Verification token has already been used' },
        { status: 400 }
      );
    }

    // Verify the user's email
    const success = await UserService.verifyEmail(tokenData.userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      );
    }

    // Mark token as used
    tokenData.used = true;
    verificationTokens.set(token, tokenData);

    // Get updated user data
    const user = await UserService.getUserById(tokenData.userId);

    return NextResponse.json({
      message: 'Email verified successfully',
      user: user ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      } : null,
    });

  } catch (error) {
    console.error('Email verification error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per hour per IP)
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimiter.check(ip, 'emailVerification', 5, 3600);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many verification requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await UserService.getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    verificationTokens.set(verificationToken, {
      userId: user.id,
      email: user.email,
      expiresAt,
      used: false,
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.firstName, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Verification email sent successfully',
      email: user.email,
    });

  } catch (error) {
    console.error('Send verification email error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to send verification email
async function sendVerificationEmail(
  email: string, 
  firstName: string, 
  token: string
): Promise<void> {
  // TODO: Implement actual email sending with your email service
  // This is a placeholder implementation
  
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`;
  
  console.log(`
    Verification Email for ${email}:
    ---
    Hi ${firstName},
    
    Please verify your email address by clicking the link below:
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you didn't create an account with BIGZ, please ignore this email.
    
    Thanks,
    The BIGZ Team
    ---
  `);

  // In production, you would use a service like:
  // - SendGrid
  // - AWS SES
  // - Mailgun
  // - Resend
  // etc.
  
  // Example with a hypothetical email service:
  // await emailService.send({
  //   to: email,
  //   subject: 'Verify your BIGZ account',
  //   template: 'email-verification',
  //   data: {
  //     firstName,
  //     verificationUrl,
  //   },
  // });
}