import { useAuth } from "@/hooks/use-auth";
import { GoogleLogin } from "@react-oauth/google";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";



export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  console.log('[AuthPage] Inline OAuth setup');
  console.log('[AuthPage] Environment check:', {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Present' : 'Missing',
    clientIdLength: import.meta.env.VITE_GOOGLE_CLIENT_ID?.length,
    clientIdPrefix: import.meta.env.VITE_GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
    origin: window.location.origin,
    fullURL: window.location.href,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    port: window.location.port
  });

  const handleGoogleSuccess = async (credentialResponse: any) => {
    console.log('[Google OAuth] Credential response received:', !!credentialResponse.credential);
    
    if (!credentialResponse?.credential) {
      console.error('[Google OAuth] No credential received');
      alert('Google authentication failed - no credential received');
      return;
    }
    
    try {
      console.log('[Auth] Sending credential to backend...');
      const result = await loginMutation.mutateAsync({ 
        googleCredential: credentialResponse.credential 
      });
      console.log('[Auth] Login successful:', result);
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      alert('Login failed: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleGoogleError = (error?: any) => {
    console.error('[Google OAuth] Authentication failed:', error);
    
    // Handle specific error types
    if (error?.error === 'popup_closed_by_user') {
      console.log('[Google OAuth] User closed popup');
      return; // Don't show error for user cancellation
    }
    
    if (error?.error === 'access_denied') {
      alert('Google sign-in was cancelled. Please try again.');
      return;
    }
    
    // Generic error handling
    alert('Google authentication failed. Please try again or check your browser settings.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src={logoPath} 
            alt="Seed Financial Logo" 
            className="h-16 mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-white">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-200">
            Sign in to access the portal
          </p>
        </div>

        <Card className="bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Use your Seed Financial Google account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="filled_blue"
                size="large"
                text="signin_with"
                shape="rectangular"
                auto_select={false}
                ux_mode="redirect"
                data-testid="google-login-button"
              />
            </div>
            
            {loginMutation.isPending && (
              <div className="flex items-center justify-center text-blue-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </div>
            )}
            
            <div className="text-sm text-gray-600 mt-4 space-y-1">
              <p className="text-center">Requirements:</p>
              <ul className="text-left space-y-1 ml-4">
                <li>• Use your @seedfinancial.io Google account</li>
                <li>• Authentication redirects to Google and back</li>
                <li>• Configured for os.seedfinancial.io and dev environment</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}