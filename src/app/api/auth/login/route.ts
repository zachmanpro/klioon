import { NextRequest, NextResponse } from 'next/server';
import { signIn } from 'next-auth/react';
import { rateLimiter } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 login attempts per 15 minutes per IP)
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimiter.check(ip, 'login', 5, 900);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // The actual authentication is handled by NextAuth.js
    // This endpoint is mainly for rate limiting and API responses
    // Redirect to NextAuth callback
    return NextResponse.json(
      { 
        message: 'Please use NextAuth.js signIn function for authentication',
        redirectTo: '/api/auth/signin'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}