'use client';

import { useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface LogoutOptions {
  redirectTo?: string;
  clearStorage?: boolean;
  silent?: boolean; // If true, don't show confirmation dialogs
}

interface LogoutState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

interface UseLogoutReturn {
  logout: (options?: LogoutOptions) => Promise<void>;
  logoutState: LogoutState;
  resetState: () => void;
}

/**
 * Hook for managing logout functionality
 */
export function useLogout(): UseLogoutReturn {
  const [logoutState, setLogoutState] = useState<LogoutState>({
    isLoading: false,
    error: null,
    success: false,
  });
  const router = useRouter();

  const resetState = useCallback(() => {
    setLogoutState({
      isLoading: false,
      error: null,
      success: false,
    });
  }, []);

  const logout = useCallback(async (options: LogoutOptions = {}) => {
    const {
      redirectTo = '/',
      clearStorage = true,
      silent = false,
    } = options;

    setLogoutState({
      isLoading: true,
      error: null,
      success: false,
    });

    try {
      // Step 1: Call our logout API for server-side cleanup
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ redirectTo }),
        });

        if (!response.ok) {
          console.warn('Logout API warning:', await response.text());
          // Continue with logout process even if API fails
        }
      } catch (apiError) {
        console.error('Logout API error:', apiError);
        // Continue with logout process
      }

      // Step 2: Clear client-side storage if requested
      if (clearStorage && typeof window !== 'undefined') {
        try {
          // Clear localStorage items
          const storageKeys = [
            'user-preferences',
            'theme',
            'sidebar-state',
            'draft-stories',
            'temp-data',
          ];
          
          storageKeys.forEach(key => {
            localStorage.removeItem(key);
          });

          // Clear sessionStorage
          sessionStorage.clear();

          // Clear any custom cookies (browser will handle httpOnly cookies)
          document.cookie.split(';').forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name && !name.startsWith('__')) { // Don't clear system cookies
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
          });
        } catch (storageError) {
          console.error('Error clearing storage:', storageError);
          // Continue with logout
        }
      }

      // Step 3: Sign out using NextAuth
      const result = await signOut({
        redirect: false,
        callbackUrl: redirectTo,
      });

      // Step 4: Handle redirect
      if (result?.url) {
        router.push(result.url);
      } else {
        router.push(redirectTo);
      }

      setLogoutState({
        isLoading: false,
        error: null,
        success: true,
      });

    } catch (error) {
      console.error('Logout error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      
      setLogoutState({
        isLoading: false,
        error: errorMessage,
        success: false,
      });

      // Try to fallback to basic NextAuth signout
      try {
        await signOut({ callbackUrl: redirectTo });
      } catch (fallbackError) {
        console.error('Fallback logout failed:', fallbackError);
        
        // Force redirect as last resort
        if (typeof window !== 'undefined') {
          window.location.href = redirectTo;
        }
      }
    }
  }, [router]);

  return {
    logout,
    logoutState,
    resetState,
  };
}

/**
 * Hook for logout with confirmation dialog
 */
export function useLogoutWithConfirmation() {
  const { logout, logoutState, resetState } = useLogout();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const requestLogout = useCallback((options?: LogoutOptions) => {
    setShowConfirmation(true);
    // Store options for when confirmation is accepted
    (requestLogout as any)._pendingOptions = options;
  }, []);

  const confirmLogout = useCallback(async () => {
    const options = (requestLogout as any)._pendingOptions || {};
    setShowConfirmation(false);
    await logout(options);
  }, [logout]);

  const cancelLogout = useCallback(() => {
    setShowConfirmation(false);
    (requestLogout as any)._pendingOptions = null;
  }, []);

  return {
    requestLogout,
    confirmLogout,
    cancelLogout,
    showConfirmation,
    logoutState,
    resetState,
  };
}

/**
 * Hook for automatic logout on session expiry
 */
export function useAutoLogout() {
  const { logout } = useLogout();
  
  const checkSessionAndLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (!data.isLoggedIn) {
        // Session has expired, logout automatically
        await logout({ silent: true, redirectTo: '/login' });
      }
    } catch (error) {
      console.error('Session check error:', error);
      // On error, assume session is invalid and logout
      await logout({ silent: true, redirectTo: '/login' });
    }
  }, [logout]);

  return {
    checkSessionAndLogout,
  };
}

/**
 * Hook for bulk logout (logout from all devices/sessions)
 */
export function useBulkLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useLogout();

  const logoutAllDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // This would require backend implementation to invalidate all user sessions
      const response = await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to logout from all devices');
      }

      // Logout from current device
      await logout({ redirectTo: '/login' });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Bulk logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  return {
    logoutAllDevices,
    isLoading,
    error,
  };
}