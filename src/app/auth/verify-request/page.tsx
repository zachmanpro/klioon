'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle } from 'lucide-react';

export default function VerifyRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [successMessage] = useState<string | null>(null);

  // Get email from URL params if coming from magic link flow
  const emailParam = searchParams.get('email');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                    flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-slate-900 border-slate-700">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-white" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-white">
            Check your email
          </CardTitle>
          
          <CardDescription className="text-slate-400">
            {emailParam 
              ? `We've sent a verification link to ${emailParam}`
              : 'We&apos;ve sent you a verification link'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {successMessage && (
            <Alert className="bg-green-900/20 border-green-800 text-green-400">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 text-center">
            <div className="space-y-2">
              <p className="text-slate-300">
                Click the link in the email to verify your account.
              </p>
              <p className="text-sm text-slate-400">
                The link will expire in 24 hours.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Didn&apos;t receive the email?
              </p>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/auth/verify')}
                  className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  Resend verification email
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => router.push('/login')}
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Back to sign in
                </Button>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="border-t border-slate-700 pt-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">Need help?</h4>
              
              <div className="space-y-2 text-sm text-slate-400">
                <p>• Check your spam/junk folder</p>
                <p>• Make sure the email address is correct</p>
                <p>• Try adding noreply@bigz.com to your contacts</p>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => window.open('mailto:support@bigz.com', '_blank')}
                className="w-full text-blue-400 hover:text-blue-300 hover:bg-slate-800"
              >
                Contact support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}