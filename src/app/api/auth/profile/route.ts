import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { UserService } from '@/lib/auth/amplify-client';
import { validateName } from '@/lib/auth/validation';

export async function GET(_request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile from DataStore
    const user = await UserService.getUserById(session.user.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user profile (without sensitive data)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const allowedUpdates = ['firstName', 'lastName', 'profilePicture'];
    const updates: Record<string, string> = {};

    // Validate and sanitize updates
    for (const [key, value] of Object.entries(body)) {
      if (allowedUpdates.includes(key) && value !== undefined) {
        if (key === 'firstName' || key === 'lastName') {
          const validation = validateName(value as string);
          if (!validation.success) {
            return NextResponse.json(
              { 
                error: `Invalid ${key}`,
                details: validation.error.issues[0]?.message 
              },
              { status: 400 }
            );
          }
          updates[key] = validation.data;
        } else if (key === 'profilePicture') {
          // Basic URL validation for profile picture
          if (typeof value === 'string' && (value === '' || value.startsWith('http'))) {
            updates[key] = value;
          } else {
            return NextResponse.json(
              { error: 'Invalid profile picture URL' },
              { status: 400 }
            );
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // Update user in DataStore
    const updatedUser = await UserService.updateUser(session.user.id, updates);
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Return updated profile
    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      profilePicture: updatedUser.profilePicture,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      lastLoginAt: updatedUser.lastLoginAt,
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to deactivate account
export async function DELETE(_request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Deactivate user account
    const success = await UserService.deactivateUser(session.user.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to deactivate account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    console.error('Account deactivation error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}