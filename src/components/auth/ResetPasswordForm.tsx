'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft, 
  Clock,
  Shield,
  X
} from 'lucide-react';
import Link from 'next/link';

// Form validation schema
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

interface TokenValidation {
  valid: boolean;
  error?: string;
  expiresIn?: number;
  attemptsRemaining?: number;
  userEmail?: string;
  code?: string;
}

export function ResetPasswordForm({ token, onSuccess, onError, className }: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValidation, setTokenValidation] = useState<TokenValidation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const watchedPassword = watch('password', '');

  // Validate token on component mount
  useEffect(() => {
    validateToken();
  }, [token]);

  // Calculate password strength
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(watchedPassword));
  }, [watchedPassword]);

  const validateToken = async () => {
    if (!token) {
      setTokenValidation({
        valid: false,
        error: 'No reset token provided',
        code: 'NO_TOKEN'
      });
      setIsValidatingToken(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
      const result = await response.json();
      
      setTokenValidation(result);
      
      if (!result.valid) {
        onError?.(result.error || 'Invalid reset token');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValidation({
        valid: false,
        error: 'Failed to validate reset token',
        code: 'VALIDATION_ERROR'
      });
    } finally {
      setIsValidatingToken(false);
    }
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error || 'Failed to reset password');
        onError?.(result.error);
        
        // If token is invalid/expired, update validation state
        if (['INVALID_TOKEN', 'TOKEN_EXPIRED', 'TOO_MANY_ATTEMPTS'].includes(result.code)) {
          setTokenValidation({
            valid: false,
            error: result.error,
            code: result.code
          });
        }
        return;
      }

      // Success
      setIsSuccess(true);
      setErrorMessage(null);
      onSuccess?.();

    } catch (error) {
      console.error('Reset password error:', error);
      const message = 'Network error. Please check your connection and try again.';
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    
    // Length
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    
    // Character types
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
    
    // Complexity
    if (password.length >= 16) strength += 10;
    
    return Math.min(100, strength);
  };

  const getStrengthLabel = (strength: number): string => {
    if (strength < 25) return 'Very Weak';
    if (strength < 50) return 'Weak';
    if (strength < 75) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = (strength: number): string => {
    if (strength < 25) return 'bg-red-500';
    if (strength < 50) return 'bg-orange-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Loading state during token validation
  if (isValidatingToken) {
    return (
      <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-slate-300 text-center">Validating reset token...</p>
        </CardContent>
      </Card>
    );
  }

  // Invalid token state
  if (!tokenValidation?.valid) {
    return (
      <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-red-900/20 rounded-full">
              <X className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-white">
            Invalid Reset Link
          </CardTitle>
          <CardDescription className="text-slate-400">
            {tokenValidation?.error || 'This password reset link is invalid or has expired'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-slate-300 text-sm">
              Common reasons for invalid links:
            </p>
            <ul className="text-slate-400 text-sm mt-2 space-y-1 list-disc list-inside">
              <li>Link has expired (valid for 30 minutes)</li>
              <li>Link has already been used</li>
              <li>Too many failed attempts</li>
              <li>Link was copied incorrectly</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link href="/auth/forgot-password">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Mail className="mr-2 h-4 w-4" />
                Request New Reset Link
              </Button>
            </Link>
            
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
            Password Reset Complete
          </CardTitle>
          <CardDescription className="text-slate-400">
            Your password has been successfully updated
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-slate-300 text-sm">
              You can now sign in with your new password. For security, you'll need to sign in again on all your devices.
            </p>
          </div>

          <Link href="/login">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Form state
  return (
    <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold text-white">
          Reset Your Password
        </CardTitle>
        <CardDescription className="text-slate-400">
          Choose a strong new password for your account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Token info */}
        {tokenValidation?.userEmail && (
          <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-400">
              <Shield className="h-4 w-4" />
              <span className="text-sm">
                Resetting password for: {tokenValidation.userEmail}
              </span>
            </div>
            {tokenValidation.expiresIn && (
              <div className="flex items-center space-x-2 text-slate-400 mt-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs">
                  Expires in {Math.ceil(tokenValidation.expiresIn / 60)} minutes
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <Alert className="bg-red-900/20 border-red-800 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                className="pl-10 pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                           focus:border-blue-500 focus:ring-blue-500"
                autoComplete="new-password"
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
            
            {/* Password Strength Indicator */}
            {watchedPassword && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Password strength:</span>
                  <span className={`font-medium ${
                    passwordStrength < 50 ? 'text-red-400' : 
                    passwordStrength < 75 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {getStrengthLabel(passwordStrength)}
                  </span>
                </div>
                <Progress 
                  value={passwordStrength} 
                  className="h-1"
                />
              </div>
            )}
            
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                {...register('confirmPassword')}
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                className="pl-10 pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                           focus:border-blue-500 focus:ring-blue-500"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {errors.confirmPassword && (
              <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || passwordStrength < 50}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Reset Password
              </>
            )}
          </Button>
        </form>

        {/* Navigation Link */}
        <div className="text-center">
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