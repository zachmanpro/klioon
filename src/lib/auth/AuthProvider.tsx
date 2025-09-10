'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { AuthUser, UserRole } from '@/types/user';

// Authentication context interface
interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  signIn: typeof signIn;
  signOut: typeof signOut;
  updateUser: (updates: Partial<AuthUser>) => void;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | null>(null);

// Hook to use the authentication context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Inner auth provider that uses NextAuth session
function InnerAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Update user state when session changes
  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
        emailVerified: session.user.emailVerified,
        profilePicture: session.user.profilePicture,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      });
    } else {
      setUser(null);
    }
  }, [session]);

  // Helper function to check if user has a specific role
  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;

    const roleHierarchy: Record<UserRole, number> = {
      reader: 1,
      writer: 2,
      moderator: 3,
    };

    return roleHierarchy[user.role] >= roleHierarchy[role];
  };

  // Function to update user data in context
  const updateUser = (updates: Partial<AuthUser>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
    hasRole,
    signIn,
    signOut,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Main auth provider that wraps NextAuth SessionProvider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InnerAuthProvider>
        {children}
      </InnerAuthProvider>
    </SessionProvider>
  );
}

// Hook for checking permissions
export function usePermissions() {
  const { user, hasRole } = useAuth();

  return {
    canRead: hasRole('reader'),
    canWrite: hasRole('writer'),
    canModerate: hasRole('moderator'),
    isReader: user?.role === 'reader',
    isWriter: user?.role === 'writer',
    isModerator: user?.role === 'moderator',
  };
}

// Hook for user profile operations
export function useUserProfile() {
  const { user, updateUser } = useAuth();

  const updateProfile = async (updates: Partial<AuthUser>) => {
    if (!user) return false;

    try {
      // Update in backend (you'll implement this in the API endpoint)
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        updateUser(updatedUser);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  return {
    user,
    updateProfile,
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    initials: user ? `${user.firstName[0]}${user.lastName[0]}` : '',
  };
}