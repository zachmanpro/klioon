'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Get callback URL from search params
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Check for messages in URL params
  useEffect(() => {
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (message === 'registration-success') {
      setInfoMessage('Registration successful! Please sign in to continue.');
    } else if (message === 'verification-required') {
      setInfoMessage('Please verify your email address before signing in.');
    } else if (message === 'session-expired') {
      setInfoMessage('Your session has expired. Please sign in again.');
    }

    if (error === 'CredentialsSignin') {
      setErrorMessage('Invalid email or password. Please try again.');
    } else if (error === 'AccessDenied') {
      setErrorMessage('Access denied. Your account may be inactive.');
    } else if (error === 'EmailSignin') {
      setErrorMessage('Failed to send email. Please try again.');
    } else if (error) {
      setErrorMessage('An error occurred during sign in. Please try again.');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(callbackUrl);
    }
  }, [session, status, callbackUrl, router]);

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                      flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (status === 'authenticated') {
    return null;
  }

  const handleSuccess = () => {
    setErrorMessage(null);
    // NextAuth will handle the redirect
  };

  const handleError = (error: string) => {
    setErrorMessage(error);
    setInfoMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Info Alert */}
        {infoMessage && (
          <Alert className="bg-blue-900/20 border-blue-800 text-blue-400">
            <Info className="h-4 w-4" />
            <AlertDescription>{infoMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <Alert className="bg-red-900/20 border-red-800 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <LoginForm 
          onSuccess={handleSuccess}
          onError={handleError}
          callbackUrl={callbackUrl}
        />
      </div>
    </div>
  );
}