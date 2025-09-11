'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform((val) => val.toLowerCase().trim()),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ForgotPasswordForm({ onSuccess, onError, className }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ retryAfter?: number } | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setRateLimitInfo(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      // Handle rate limiting
      if (response.status === 429) {
        setRateLimitInfo({ retryAfter: result.retryAfter });
        setErrorMessage(result.error);
        onError?.(result.error);
        return;
      }

      // Handle other errors
      if (!response.ok) {
        setErrorMessage(result.error || 'Failed to send reset email');
        onError?.(result.error);
        return;
      }

      // Success
      setIsSuccess(true);
      setSubmittedEmail(data.email);
      setErrorMessage(null);
      onSuccess?.(data.email);

    } catch (error) {
      console.error('Forgot password error:', error);
      const message = 'Network error. Please check your connection and try again.';
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-green-900/20 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-white">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-slate-400">
            Password reset instructions have been sent
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-800 rounded-lg space-y-3">
            <p className="text-slate-300 text-sm">
              We've sent password reset instructions to:
            </p>
            <p className="text-white font-medium break-all">
              {submittedEmail}
            </p>
            <p className="text-slate-400 text-sm">
              If you don't see the email, check your spam folder or try again with a different email address.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setIsSuccess(false);
                setSubmittedEmail('');
                setErrorMessage(null);
              }}
              variant="outline"
              className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send to Different Email
            </Button>
            
            <Link href="/login">
              <Button
                variant="ghost"
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Form state
  return (
    <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold text-white">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-slate-400">
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <Alert className="bg-red-900/20 border-red-800 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
              {rateLimitInfo?.retryAfter && (
                <div className="mt-2 flex items-center text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  Please wait {Math.ceil(rateLimitInfo.retryAfter / 60)} minutes before trying again
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                {...register('email')}
                id="email"
                type="email"
                placeholder="user@example.com"
                className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                           focus:border-blue-500 focus:ring-blue-500"
                autoComplete="email"
                autoFocus
              />
            </div>
            
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || rateLimitInfo !== null}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Reset Link...
              </>
            ) : rateLimitInfo ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Rate Limited
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Reset Link
              </>
            )}
          </Button>
        </form>

        {/* Navigation Links */}
        <div className="flex flex-col space-y-2 text-center">
          <Link href="/login">
            <Button
              variant="ghost"
              className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
          
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <Link 
              href="/register" 
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}