'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  showConfirmDialog?: boolean;
  redirectTo?: string;
  onLogoutStart?: () => void;
  onLogoutComplete?: () => void;
  onLogoutError?: (error: string) => void;
  children?: React.ReactNode;
}

export function LogoutButton({
  variant = 'ghost',
  size = 'default',
  className = '',
  showIcon = true,
  showConfirmDialog = true,
  redirectTo = '/',
  onLogoutStart,
  onLogoutComplete,
  onLogoutError,
  children,
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    onLogoutStart?.();

    try {
      // Call our logout API for cleanup
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redirectTo }),
      });

      if (!response.ok) {
        console.warn('Logout API warning:', await response.text());
        // Continue with NextAuth signout even if our API fails
      }

      // Sign out using NextAuth
      const result = await signOut({
        redirect: false,
        callbackUrl: redirectTo,
      });

      onLogoutComplete?.();

      // Redirect to the specified URL
      if (result?.url) {
        router.push(result.url);
      } else {
        router.push(redirectTo);
      }

      // Clear any client-side storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user-preferences');
        sessionStorage.clear();
      }

    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      onLogoutError?.(errorMessage);
      
      // Try to sign out with NextAuth anyway
      try {
        await signOut({ callbackUrl: redirectTo });
      } catch (fallbackError) {
        console.error('Fallback logout failed:', fallbackError);
        // Force redirect as last resort
        window.location.href = redirectTo;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const LogoutButtonContent = (
    <Button
      variant={variant}
      size={size}
      disabled={isLoading}
      className={className}
      onClick={showConfirmDialog ? undefined : handleLogout}
    >
      {isLoading ? (
        <>
          <Loader2 className={`${showIcon ? 'mr-2' : ''} h-4 w-4 animate-spin`} />
          {children || 'Signing Out...'}
        </>
      ) : (
        <>
          {showIcon && <LogOut className={`${children ? 'mr-2' : ''} h-4 w-4`} />}
          {children || 'Sign Out'}
        </>
      )}
    </Button>
  );

  if (!showConfirmDialog) {
    return LogoutButtonContent;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {LogoutButtonContent}
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Sign Out
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Are you sure you want to sign out?
            {user && (
              <span className="block mt-2 text-sm">
                You are currently signed in as{' '}
                <span className="font-medium text-slate-300">
                  {user.firstName} {user.lastName} ({user.email})
                </span>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing Out...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Quick logout button with minimal UI
 */
export function QuickLogoutButton({
  className = '',
  showText = false,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <LogoutButton
      variant="ghost"
      size={showText ? 'default' : 'icon'}
      className={`text-slate-400 hover:text-white hover:bg-slate-800 ${className}`}
      showConfirmDialog={false}
      showIcon={true}
    >
      {showText && 'Sign Out'}
    </LogoutButton>
  );
}

/**
 * Logout menu item for dropdown menus
 */
export function LogoutMenuItem({
  className = '',
  onSelect,
}: {
  className?: string;
  onSelect?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    onSelect?.();

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectTo: '/' }),
      });

      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to direct signout
      await signOut({ callbackUrl: '/' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`w-full flex items-center px-2 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing Out...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </>
      )}
    </button>
  );
}