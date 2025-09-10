'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import { Loader2 } from 'lucide-react';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile/setup');
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
  if (status === 'unauthenticated') {
    return null;
  }

  const handleComplete = () => {
    // Redirect to dashboard after profile setup
    router.push('/dashboard');
  };

  const handleSkip = () => {
    // Redirect to dashboard if user skips profile setup
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                    flex items-center justify-center p-4">
      <ProfileSetup 
        onComplete={handleComplete}
        onSkip={handleSkip}
        isFirstTime={true}
      />
    </div>
  );
}