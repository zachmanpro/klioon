'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Upload, Camera, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth, useUserProfile } from '@/lib/auth/AuthProvider';
import type { AuthUser } from '@/types/user';

// Profile setup validation schema
const profileSetupSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  bio: z
    .string()
    .max(500, 'Bio must not exceed 500 characters')
    .optional(),
  profilePicture: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
});

type ProfileSetupData = z.infer<typeof profileSetupSchema>;

interface ProfileSetupProps {
  onComplete?: (user: AuthUser) => void;
  onSkip?: () => void;
  className?: string;
  isFirstTime?: boolean;
}

export function ProfileSetup({ 
  onComplete, 
  onSkip, 
  className, 
  isFirstTime = false 
}: ProfileSetupProps) {
  const { user } = useAuth();
  const { updateProfile } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profilePicture || '');
  const [completionStep, setCompletionStep] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileSetupData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      bio: '',
      profilePicture: user?.profilePicture || '',
    },
  });

  const watchedBio = watch('bio', '');
  const bioCharCount = watchedBio?.length || 0;

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    let completed = 0;
    const fields = ['firstName', 'lastName', 'bio', 'profilePicture'];
    const values = watch();
    
    if (values.firstName?.trim()) completed += 25;
    if (values.lastName?.trim()) completed += 25;
    if (values.bio?.trim()) completed += 25;
    if (profileImageUrl) completed += 25;
    
    return completed;
  };

  // Handle profile image upload (placeholder implementation)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // TODO: Implement actual image upload to your storage service
      // For now, create a placeholder URL
      const imageUrl = URL.createObjectURL(file);
      setProfileImageUrl(imageUrl);
      setValue('profilePicture', imageUrl);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProfileSetupData) => {
    setIsLoading(true);

    try {
      // Update profile data
      const updateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        profilePicture: profileImageUrl || undefined,
      };

      const success = await updateProfile(updateData);

      if (success) {
        setCompletionStep(1);
        
        // Wait a moment then call completion callback
        setTimeout(() => {
          onComplete?.(user!);
        }, 2000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile setup error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skip
  const handleSkip = () => {
    onSkip?.();
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    const firstName = watch('firstName') || user?.firstName || '';
    const lastName = watch('lastName') || user?.lastName || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  // Show completion state
  if (completionStep === 1) {
    return (
      <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <CheckCircle className="h-16 w-16 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Profile Complete!</h3>
          <p className="text-slate-400 text-center">
            Your profile has been set up successfully. 
            {isFirstTime && " Welcome to BIGZ!"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-md mx-auto bg-slate-900 border-slate-700 ${className}`}>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold text-white">
          {isFirstTime ? 'Complete Your Profile' : 'Update Your Profile'}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {isFirstTime 
            ? 'Tell us a bit about yourself to get started'
            : 'Update your profile information'
          }
        </CardDescription>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Profile completion</span>
            <span className="text-blue-400">{getCompletionPercentage()}%</span>
          </div>
          <Progress 
            value={getCompletionPercentage()} 
            className="h-2 bg-slate-700"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileImageUrl} alt="Profile picture" />
                <AvatarFallback className="bg-slate-700 text-white text-lg">
                  {getUserInitials() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload Button Overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full 
                               opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                {uploadingImage ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </label>
            </div>
            
            <div className="text-center">
              <Label className="text-sm text-slate-400">
                Profile Picture {profileImageUrl && <Badge variant="outline" className="ml-2">✓</Badge>}
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Click on the avatar to upload an image
              </p>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-white">
                First Name *
              </Label>
              <Input
                {...register('firstName')}
                id="firstName"
                placeholder="John"
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                           focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.firstName && (
                <p className="text-sm text-red-400">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-white">
                Last Name *
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

          {/* Bio Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="bio" className="text-white">
                Bio (Optional)
              </Label>
              <span className="text-sm text-slate-400">
                {bioCharCount}/500
              </span>
            </div>
            <Textarea
              {...register('bio')}
              id="bio"
              placeholder="Tell us about yourself and your interests in storytelling..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400
                         focus:border-blue-500 focus:ring-blue-500 min-h-[100px]"
              maxLength={500}
            />
            {errors.bio && (
              <p className="text-sm text-red-400">{errors.bio.message}</p>
            )}
          </div>

          {/* Role Display */}
          {user?.role && (
            <div className="space-y-2">
              <Label className="text-white">Role</Label>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className="bg-blue-900/20 border-blue-700 text-blue-400"
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
                <span className="text-sm text-slate-400">
                  {user.role === 'reader' && 'Explore and enjoy stories'}
                  {user.role === 'writer' && 'Contribute to collaborative stories'}
                  {user.role === 'moderator' && 'Manage community and content'}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
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
                  {isFirstTime ? 'Setting Up Profile...' : 'Updating Profile...'}
                </>
              ) : (
                isFirstTime ? 'Complete Setup' : 'Update Profile'
              )}
            </Button>

            {/* Skip Button (only for first time setup) */}
            {isFirstTime && onSkip && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Skip for now
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}