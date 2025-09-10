import { NextRequest, NextResponse } from 'next/server';
import { validateRegistrationInput } from '@/lib/auth/validation';
import { UserService } from '@/lib/auth/amplify-client';
import { hashPassword } from '@/lib/auth/config';
import { rateLimiter } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (3 registrations per hour per IP)
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimiter.check(ip, 'registration', 3, 3600);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input data
    const validationResult = validateRegistrationInput(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path[0],
            message: issue.message,
          }))
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, role } = validationResult.data;

    // Check if user already exists
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create user in Amplify DataStore
    const newUser = await UserService.createUser({
      email,
      firstName,
      lastName,
      role,
      emailVerified: false,
      isActive: true,
    });

    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Store hashed password separately (you'll need a secure storage mechanism)
    // This could be in a separate table or encrypted field
    await storeUserPassword(newUser.id, hashedPassword);

    // Send email verification (implement this based on your email service)
    try {
      await sendVerificationEmail(email, newUser.id);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails - user can request new verification
    }

    // Return success response (without sensitive data)
    return NextResponse.json(
      {
        message: 'User account created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          emailVerified: newUser.emailVerified,
        },
        needsEmailVerification: true,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to store password hash securely
async function storeUserPassword(userId: string, hashedPassword: string): Promise<void> {
  // TODO: Implement secure password storage
  // This could be:
  // 1. A separate password table in your database
  // 2. An encrypted field in the user record
  // 3. A secure key-value store
  
  // For now, this is a placeholder
  // In production, you might use something like:
  // await passwordStorage.store(userId, hashedPassword);
  
  console.log(`Storing password hash for user ${userId}`);
}

// Helper function to send email verification
async function sendVerificationEmail(email: string, userId: string): Promise<void> {
  // TODO: Implement email verification sending
  // This should generate a verification token and send an email
  
  // Generate verification token
  const verificationToken = generateVerificationToken();
  
  // Store token with expiration (implement this)
  // await storeVerificationToken(userId, verificationToken);
  
  // Send email (implement with your email service)
  // await emailService.sendVerificationEmail(email, verificationToken);
  
  console.log(`Sending verification email to ${email} for user ${userId}`);
}

// Helper function to generate verification token
function generateVerificationToken(): string {
  return crypto.randomUUID();
}

// Helper function to check available usernames/emails
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
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

    // Check if email is already taken
    const existingUser = await UserService.getUserByEmail(email);
    
    return NextResponse.json({
      available: !existingUser,
      email,
    });

  } catch (error) {
    console.error('Email check error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}