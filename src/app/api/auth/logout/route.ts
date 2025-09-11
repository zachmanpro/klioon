import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { UserService } from '@/lib/auth/amplify-client';

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: true, // Not an error if user isn't logged in
          message: 'No active session found',
          code: 'NO_SESSION'
        },
        { status: 200 }
      );
    }

    // Optional: Update user's last activity
    try {
      await UserService.updateUser(session.user.id, {
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update user last activity on logout:', error);
      // Don't fail logout for this
    }

    // Get redirect URL from request body if provided
    const body = await request.json().catch(() => ({}));
    const { redirectTo = '/' } = body;

    // Return success response
    // The actual session cleanup is handled by NextAuth.js signOut()
    return NextResponse.json(
      {
        success: true,
        message: 'Logout successful',
        redirectTo,
        code: 'LOGOUT_SUCCESS'
      },
      { 
        status: 200,
        headers: {
          // Clear any custom cookies we might have set
          'Set-Cookie': [
            'remember-me=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/',
            'user-preferences=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/',
          ].join(', ')
        }
      }
    );

  } catch (error) {
    console.error('Logout API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process logout request',
        code: 'LOGOUT_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json(
      {
        isLoggedIn: !!session?.user,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          role: session.user.role,
        } : null,
        expires: session?.expires,
        code: 'SESSION_STATUS'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Session status check error:', error);
    
    return NextResponse.json(
      { 
        isLoggedIn: false,
        user: null,
        error: 'Failed to check session status',
        code: 'STATUS_ERROR'
      },
      { status: 500 }
    );
  }
}