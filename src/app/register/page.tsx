'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSuccess = (result: { message?: string; needsEmailVerification?: boolean }) => {
    setErrorMessage(null);
    setSuccessMessage(
      result.needsEmailVerification 
        ? 'Account created successfully! Please check your email to verify your account.'
        : 'Account created successfully! You can now sign in.'
    );

    // Redirect to login after a delay
    setTimeout(() => {
      router.push('/login?message=registration-success');
    }, 3000);
  };

  const handleError = (error: string) => {
    setSuccessMessage(null);
    setErrorMessage(error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Success Alert */}
        {successMessage && (
          <Alert className="bg-green-900/20 border-green-800 text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <Alert className="bg-red-900/20 border-red-800 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Registration Form */}
        <RegistrationForm 
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
    </div>
  );
}