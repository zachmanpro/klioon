'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Mail, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Login form validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  callbackUrl?: string;
}

export function LoginForm({ onSuccess, onError, className, callbackUrl = '/' }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const watchedEmail = watch('email', '');

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setErrorMessage(result.error);
        onError?.(result.error);
      } else if (result?.ok) {
        onSuccess?.();
        // Redirect will be handled by NextAuth
        window.location.href = callbackUrl;
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = 'An unexpected error occurred. Please try again.';
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle magic link sign in
  const handleMagicLinkSignIn = async () => {
    if (!watchedEmail || errors.email) {
      setErrorMessage('Please enter a valid email address first');
      return;
    }

    setIsEmailLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('email', {
        email: watchedEmail,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setErrorMessage(result.error);
        onError?.(result.error);
      } else {
        // Show success message for magic link
        setErrorMessage(null);
        // You might want to show a success state here
      }
    } catch (error) {
      console.error('Magic link error:', error);
      const message = 'Failed to send magic link. Please try again.';
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold text-white">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-slate-400">
          Sign in to continue your BIGZ adventure
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <Alert className="bg-red-900/20 border-red-800 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
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
              />
            </div>
            
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <a 
                href="/auth/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                           focus:border-blue-500 focus:ring-blue-500"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full bg-slate-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-400">
              Or continue with
            </span>
          </div>
        </div>

        {/* Magic Link Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleMagicLinkSignIn}
          disabled={isEmailLoading || !watchedEmail || !!errors.email}
          className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {isEmailLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Magic Link...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Magic Link
            </>
          )}
        </Button>

        {/* Registration Link */}
        <div className="text-center">
          <p className="text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <a 
              href="/register" 
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Create one
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}