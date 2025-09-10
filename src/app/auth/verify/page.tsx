'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Mail, Loader2, RefreshCw } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('resend');
      setMessage('No verification token provided. You can request a new verification email below.');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify?token=${verificationToken}`);
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=email-verified');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Email verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Verification email sent successfully! Please check your inbox.');
      } else {
        setMessage(data.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
            <h3 className="text-xl font-semibold text-white">Verifying Email</h3>
            <p className="text-slate-400 text-center">
              Please wait while we verify your email address...
            </p>
          </CardContent>
        );

      case 'success':
        return (
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-400" />
            <h3 className="text-xl font-semibold text-white">Email Verified!</h3>
            <p className="text-slate-400 text-center">{message}</p>
            <div className="space-y-3 w-full max-w-sm">
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue to Sign In
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        );

      case 'error':
        return (
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <h3 className="text-xl font-semibold text-white">Verification Failed</h3>
            </div>

            <Alert className="bg-red-900/20 border-red-800 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-slate-400 mb-4">
                  Need a new verification email? Enter your email address below:
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 
                               text-white placeholder:text-slate-400 rounded-md
                               focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <Button
                    onClick={handleResendVerification}
                    disabled={isResending || !email}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-center space-y-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/login')}
                  className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          </CardContent>
        );

      case 'resend':
        return (
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Mail className="h-12 w-12 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Email Verification</h3>
              <p className="text-slate-400 text-center">
                Enter your email address to receive a verification link
              </p>
            </div>

            {message && (
              <Alert className="bg-blue-900/20 border-blue-800 text-blue-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 
                           text-white placeholder:text-slate-400 rounded-md
                           focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              
              <Button
                onClick={handleResendVerification}
                disabled={isResending || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Email'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/login')}
                className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
              >
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                    flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-slate-900 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Email Verification
          </CardTitle>
          <CardDescription className="text-slate-400">
            Verify your email to complete your BIGZ account setup
          </CardDescription>
        </CardHeader>
        
        {renderContent()}
      </Card>
    </div>
  );
}