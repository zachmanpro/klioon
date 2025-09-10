'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { validateRouteAccess } from '../../middleware';
import type { UserRole } from '@/types/user';

interface RouteProtectionResult {
  isLoading: boolean;
  canAccess: boolean;
  error: string | null;
  redirecting: boolean;
}

/**
 * Hook for client-side route protection
 */
export function useRouteProtection(requiredRole?: UserRole): RouteProtectionResult {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Validate route access
    const validation = validateRouteAccess(pathname, user?.role);
    
    if (!validation.canAccess) {
      setError(validation.reason || 'Access denied');
      
      if (validation.redirectTo) {
        setRedirecting(true);
        router.push(validation.redirectTo);
        return;
      }
    }

    // If specific role is required, check it
    if (requiredRole && user?.role) {
      const roleHierarchy: Record<UserRole, number> = {
        reader: 1,
        writer: 2,
        moderator: 3,
      };

      const hasRequiredRole = roleHierarchy[user.role] >= roleHierarchy[requiredRole];
      
      if (!hasRequiredRole) {
        setError(`This page requires ${requiredRole} role or higher`);
        setRedirecting(true);
        
        // Redirect to appropriate dashboard based on user role
        const redirectPaths: Record<UserRole, string> = {
          reader: '/dashboard',
          writer: '/write',
          moderator: '/admin',
        };
        
        router.push(redirectPaths[user.role]);
        return;
      }
    }

    setError(null);
    setIsLoading(false);
  }, [authLoading, user, pathname, requiredRole, router]);

  return {
    isLoading: isLoading || authLoading,
    canAccess: !error && !redirecting,
    error,
    redirecting,
  };
}

/**
 * Hook for checking specific permissions
 */
export function usePermissions() {
  const { user, hasRole } = useAuth();

  return {
    // Role checks
    canRead: hasRole('reader'),
    canWrite: hasRole('writer'),
    canModerate: hasRole('moderator'),
    
    // Specific role checks
    isReader: user?.role === 'reader',
    isWriter: user?.role === 'writer',
    isModerator: user?.role === 'moderator',
    
    // Permission helpers
    canAccessRoute: (requiredRole: UserRole) => {
      if (!user?.role) return false;
      return hasRole(requiredRole);
    },
    
    canManageUsers: hasRole('moderator'),
    canCreateStories: hasRole('writer'),
    canModerateContent: hasRole('moderator'),
    canAdministrate: hasRole('moderator'),
  };
}

/**
 * Hook for dynamic route validation
 */
export function useRouteValidator() {
  const { user } = useAuth();

  const canAccessRoute = (pathname: string): boolean => {
    const validation = validateRouteAccess(pathname, user?.role);
    return validation.canAccess;
  };

  const getRedirectPath = (pathname: string): string | null => {
    const validation = validateRouteAccess(pathname, user?.role);
    return validation.redirectTo || null;
  };

  const getAccessError = (pathname: string): string | null => {
    const validation = validateRouteAccess(pathname, user?.role);
    return validation.canAccess ? null : validation.reason || null;
  };

  return {
    canAccessRoute,
    getRedirectPath,
    getAccessError,
  };
}