'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth, useUserProfile } from '@/lib/auth/AuthProvider';
import { Edit, Mail, User, Calendar, Shield, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user } = useAuth();
  const { fullName, initials } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile');
    }
  }, [status, router]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                      flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (status === 'unauthenticated' || !user) {
    return null;
  }

  const handleEditComplete = () => {
    setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'reader': return 'Explore and enjoy collaborative stories';
      case 'writer': return 'Contribute to collaborative storytelling';
      case 'moderator': return 'Manage community and content';
      default: return 'BIGZ Community Member';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'reader': return 'bg-blue-900/20 border-blue-700 text-blue-400';
      case 'writer': return 'bg-green-900/20 border-green-700 text-green-400';
      case 'moderator': return 'bg-purple-900/20 border-purple-700 text-purple-400';
      default: return 'bg-slate-900/20 border-slate-700 text-slate-400';
    }
  };

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                      flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Button
            variant="ghost"
            onClick={() => setIsEditing(false)}
            className="text-slate-400 hover:text-white"
          >
            ← Back to Profile
          </Button>
          <ProfileSetup 
            onComplete={handleEditComplete}
            isFirstTime={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.profilePicture} alt={fullName} />
                <AvatarFallback className="bg-slate-700 text-white text-xl">
                  {initials || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div>
                  <CardTitle className="text-2xl text-white">{fullName}</CardTitle>
                  <CardDescription className="text-slate-400 flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </CardDescription>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Badge className={getRoleColor(user.role)}>
                    <Shield className="mr-1 h-3 w-3" />
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                  
                  {user.emailVerified ? (
                    <Badge className="bg-green-900/20 border-green-700 text-green-400">
                      Email Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-900/20 border-yellow-700 text-yellow-400">
                      Email Pending
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Role Description */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Role</h3>
              <p className="text-slate-400">{getRoleDescription(user.role)}</p>
            </div>

            <Separator className="bg-slate-700" />

            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Account Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <div>
                    <span className="text-sm">Member since</span>
                    <p className="text-white">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 text-slate-400">
                  <User className="h-4 w-4" />
                  <div>
                    <span className="text-sm">Last login</span>
                    <p className="text-white">{formatDate(user.lastLoginAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <Separator className="bg-slate-700" />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                >
                  Go to Dashboard
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/settings')}
                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                >
                  Account Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}