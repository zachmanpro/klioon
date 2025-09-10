'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, X, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export function EmailVerificationBanner({ onDismiss, className }: EmailVerificationBannerProps) {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if email is verified or banner is dismissed
  if (!user || user.emailVerified || isDismissed) {
    return null;
  }

  const handleResendEmail = async () => {
    if (!user.email) return;

    setIsResending(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 5000); // Hide success message after 5 seconds
      } else {
        const data = await response.json();
        console.error('Failed to resend verification email:', data.error);
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isSuccess) {
    return (
      <Alert className={`bg-green-900/20 border-green-800 text-green-400 ${className}`}>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Verification email sent successfully! Please check your inbox.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSuccess(false)}
            className="h-auto p-1 text-green-400 hover:text-green-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={`bg-yellow-900/20 border-yellow-800 text-yellow-400 ${className}`}>
      <Mail className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <p className="font-medium">Please verify your email address</p>
          <p className="text-sm text-yellow-300/80 mt-1">
            Check your inbox and click the verification link to complete your account setup.
          </p>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResendEmail}
            disabled={isResending}
            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend'
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-auto p-1 text-yellow-400 hover:text-yellow-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}