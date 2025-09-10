'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouteProtection } from '@/hooks/useRouteProtection';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types/user';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  fallback?: ReactNode;
  showError?: boolean;
  className?: string;
}

/**
 * Component for protecting routes with role-based access control
 */
export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
  showError = true,
  className = '',
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { isLoading, canAccess, error, redirecting } = useRouteProtection(requiredRole);
  const router = useRouter();

  // Show loading state
  if (isLoading || authLoading || redirecting) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-slate-950 ${className}`}>
        <Card className="w-full max-w-md bg-slate-900 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-slate-300 text-center">
              {redirecting ? 'Redirecting...' : 'Checking permissions...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if access is denied
  if (!canAccess && showError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className={`min-h-screen flex items-center justify-center bg-slate-950 p-4 ${className}`}>
        <Card className="w-full max-w-md bg-slate-900 border-slate-700">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-center">
              <div className="p-3 bg-red-900/20 rounded-full">
                <Shield className="h-8 w-8 text-red-400" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-white">Access Denied</h1>
              <p className="text-slate-400">
                {error || 'You do not have permission to access this page.'}
              </p>
              
              {requiredRole && (
                <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-300">
                    This page requires <span className="font-semibold text-blue-400">{requiredRole}</span> role or higher.
                  </p>
                  {user?.role && (
                    <p className="text-sm text-slate-400 mt-1">
                      Your current role: <span className="font-semibold text-slate-300">{user.role}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-3">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              
              <Button
                onClick={() => {
                  const dashboardPaths: Record<UserRole, string> = {
                    reader: '/dashboard',
                    writer: '/write',
                    moderator: '/admin',
                  };
                  
                  const redirectPath = user?.role ? dashboardPaths[user.role] : '/dashboard';
                  router.push(redirectPath);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Go to {user?.role === 'moderator' ? 'Admin Panel' : 
                       user?.role === 'writer' ? 'Writing Dashboard' : 'Dashboard'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children if access is granted
  return canAccess ? <>{children}</> : null;
}

/**
 * Higher-order component for protecting pages
 */
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Component for conditionally rendering content based on permissions
 */
interface PermissionGateProps {
  children: ReactNode;
  requiredRole?: UserRole;
  userRole?: UserRole;
  fallback?: ReactNode;
  showError?: boolean;
}

export function PermissionGate({
  children,
  requiredRole,
  userRole,
  fallback = null,
  showError = false,
}: PermissionGateProps) {
  const { user, hasRole } = useAuth();
  
  // Use provided user role or get from auth context
  const currentUserRole = userRole || user?.role;
  
  // If no role required, show content
  if (!requiredRole) {
    return <>{children}</>;
  }
  
  // Check if user has required role
  const hasAccess = currentUserRole ? hasRole(requiredRole) : false;
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Show error message if requested
  if (showError) {
    return (
      <Alert className="bg-yellow-900/20 border-yellow-800 text-yellow-400">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This content requires {requiredRole} role or higher.
          {currentUserRole && (
            <span className="block mt-1 text-sm">
              Your role: {currentUserRole}
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  return <>{fallback}</>;
}

/**
 * Component for role-specific navigation items
 */
interface RoleBasedNavItemProps {
  requiredRole: UserRole;
  children: ReactNode;
  exactRole?: boolean; // If true, only shows for exact role match
}

export function RoleBasedNavItem({ 
  requiredRole, 
  children, 
  exactRole = false 
}: RoleBasedNavItemProps) {
  const { user, hasRole } = useAuth();
  
  const canShow = exactRole 
    ? user?.role === requiredRole
    : hasRole(requiredRole);
  
  return canShow ? <>{children}</> : null;
}