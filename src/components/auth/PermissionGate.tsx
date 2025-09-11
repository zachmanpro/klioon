'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { UserRole, UserPermission } from '@/types/user';
import { PermissionService } from '@/lib/auth/PermissionService';

interface PermissionGateProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: UserPermission;
  requiredPermissions?: UserPermission[];
  requireAll?: boolean; // If true, user must have all permissions; if false, any permission
  fallback?: ReactNode;
  showError?: boolean;
  className?: string;
}

export function PermissionGate({
  children,
  requiredRole,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
  showError = true,
  className
}: PermissionGateProps) {
  const { user, isLoading } = useAuth();
  const permissionService = new PermissionService();

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className || ''}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-purple-600">Loading...</span>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return showError ? (
      <div className={`text-center p-8 ${className || ''}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Authentication Required</h3>
          <p className="text-red-700">You must be logged in to access this content.</p>
        </div>
      </div>
    ) : null;
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole) {
    // For hierarchical roles, check if current role is sufficient
    if (!permissionService.isRoleHigherThan(user.role, requiredRole)) {
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return showError ? (
        <div className={`text-center p-8 ${className || ''}`}>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied</h3>
            <p className="text-red-700">You do not have permission to access this page.</p>
            <p className="text-sm text-red-600 mt-2">
              Required role: <span className="font-medium">{permissionService.getRoleDisplayInfo(requiredRole).name}</span>
            </p>
            <p className="text-sm text-red-600">
              Your role: <span className="font-medium">{permissionService.getRoleDisplayInfo(user.role).name}</span>
            </p>
          </div>
        </div>
      ) : null;
    }
  }

  // Check single permission
  if (requiredPermission && !permissionService.hasPermission(user.role, requiredPermission)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return showError ? (
      <div className={`text-center p-8 ${className || ''}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Insufficient Permissions</h3>
          <p className="text-red-700">You do not have the required permissions to access this content.</p>
          <p className="text-sm text-red-600 mt-2">
            Required permission: <span className="font-medium">{requiredPermission}</span>
          </p>
        </div>
      </div>
    ) : null;
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? permissionService.hasAllPermissions(user.role, requiredPermissions)
      : permissionService.hasAnyPermission(user.role, requiredPermissions);

    if (!hasAccess) {
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return showError ? (
        <div className={`text-center p-8 ${className || ''}`}>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Insufficient Permissions</h3>
            <p className="text-red-700">
              You need {requireAll ? 'all' : 'at least one'} of the following permissions:
            </p>
            <ul className="text-sm text-red-600 mt-2 space-y-1">
              {requiredPermissions.map(permission => (
                <li key={permission} className="font-medium">• {permission}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null;
    }
  }

  // User has access, render children
  return <div className={className}>{children}</div>;
}

// Higher-order component for role protection
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole,
  requiredPermission?: UserPermission
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGate requiredRole={requiredRole} requiredPermission={requiredPermission}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}

// Utility hook for permission checking in components
export function usePermissions() {
  const { user } = useAuth();
  const permissionService = new PermissionService();

  return {
    hasRole: (role: UserRole) => user?.role === role,
    hasPermission: (permission: UserPermission) => 
      user ? permissionService.hasPermission(user.role, permission) : false,
    hasAnyPermission: (permissions: UserPermission[]) =>
      user ? permissionService.hasAnyPermission(user.role, permissions) : false,
    hasAllPermissions: (permissions: UserPermission[]) =>
      user ? permissionService.hasAllPermissions(user.role, permissions) : false,
    canPerformAction: (resource: string, action: string, targetUserId?: string) =>
      user ? permissionService.canPerformAction(user.role, resource, action, targetUserId, user.id) : false,
    getPermissions: () => user ? permissionService.getPermissionsForRole(user.role) : [],
  };
}