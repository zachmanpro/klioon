'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, User, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  registrationInputSchema, 
  type RegistrationInput,
  getPasswordStrength,
  validateEmailFormat,
} from '@/lib/auth/validation';
import type { UserRole } from '@/types/user';

interface RegistrationFormProps {
  onSuccess?: (user: { message?: string; needsEmailVerification?: boolean }) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function RegistrationForm({ onSuccess, onError, className }: RegistrationFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] as string[] });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationInputSchema),
    defaultValues: {
      role: 'reader',
    },
  });

  const watchedPassword = watch('password', '');
  const watchedEmail = watch('email', '');

  // Update password strength when password changes
  useState(() => {
    if (watchedPassword) {
      const strength = getPasswordStrength(watchedPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [watchedPassword]);

  // Check email availability
  const checkEmailAvailability = async (email: string) => {
    if (!validateEmailFormat(email)) {
      setEmailAvailable(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch(`/api/auth/register?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setEmailAvailable(data.available);
    } catch (error) {
      console.error('Error checking email availability:', error);
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Handle email blur for availability check
  const handleEmailBlur = () => {
    if (watchedEmail && !errors.email) {
      checkEmailAvailability(watchedEmail);
    }
  };

  // Handle form submission
  const onSubmit = async (data: RegistrationInput) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      onError?.('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get password strength color
  const getPasswordStrengthColor = (score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get password strength text
  const getPasswordStrengthText = (score: number) => {
    if (score < 40) return 'Weak';
    if (score < 70) return 'Medium';
    return 'Strong';
  };

  return (
    <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold text-white">
          Join BIGZ
        </CardTitle>
        <CardDescription className="text-slate-400">
          Create your account for collaborative storytelling adventures
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
                onBlur={handleEmailBlur}
              />
              {checkingEmail && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 text-slate-400 animate-spin" />
              )}
            </div>
            
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
            
            {emailAvailable === false && (
              <p className="text-sm text-red-400">This email is already registered</p>
            )}
            
            {emailAvailable === true && (
              <p className="text-sm text-green-400">Email is available</p>
            )}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-white">
                First Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  {...register('firstName')}
                  id="firstName"
                  placeholder="John"
                  className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                             focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {errors.firstName && (
                <p className="text-sm text-red-400">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-white">
                Last Name
              </Label>
              <Input
                {...register('lastName')}
                id="lastName"
                placeholder="Doe"
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                           focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.lastName && (
                <p className="text-sm text-red-400">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <div className="relative">
              <Input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                className="pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                           focus:border-blue-500 focus:ring-blue-500"
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

            {/* Password Strength Indicator */}
            {watchedPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Password strength:</span>
                  <Badge 
                    variant="outline" 
                    className={`${getPasswordStrengthColor(passwordStrength.score)} text-white border-none`}
                  >
                    {getPasswordStrengthText(passwordStrength.score)}
                  </Badge>
                </div>
                <Progress 
                  value={passwordStrength.score} 
                  className="h-2 bg-slate-700"
                />
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-slate-400 space-y-1">
                    {passwordStrength.feedback.map((feedback, index) => (
                      <li key={index}>• {feedback}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-white">
              Role
            </Label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
              <Select
                onValueChange={(value) => setValue('role', value as UserRole)}
                defaultValue="reader"
              >
                <SelectTrigger className="pl-10 bg-slate-800 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="reader" className="text-white hover:bg-slate-700">
                    <div className="flex flex-col">
                      <span>Reader</span>
                      <span className="text-xs text-slate-400">Explore and enjoy stories</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="writer" className="text-white hover:bg-slate-700">
                    <div className="flex flex-col">
                      <span>Writer</span>
                      <span className="text-xs text-slate-400">Contribute to collaborative stories</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator" className="text-white hover:bg-slate-700">
                    <div className="flex flex-col">
                      <span>Moderator</span>
                      <span className="text-xs text-slate-400">Manage community and content</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {errors.role && (
              <p className="text-sm text-red-400">{errors.role.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || emailAvailable === false}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <a 
              href="/login" 
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}