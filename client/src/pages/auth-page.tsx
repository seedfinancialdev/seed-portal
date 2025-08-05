import { useAuth } from "@/hooks/use-auth";
import { useGoogleLogin } from "@react-oauth/google";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";



export default function AuthPage() {
  const { user, loginMutation } = useAuth();


  // Redirect if already logged in (after all hooks are called)
  if (user) {
    return <Redirect to="/" />;
  }

  console.log('[AuthPage] Creating googleLogin hook...');
  console.log('[AuthPage] Environment check:', {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Present' : 'Missing',
    clientIdLength: import.meta.env.VITE_GOOGLE_CLIENT_ID?.length,
    origin: window.location.origin,
  });

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      console.log('[Google OAuth] Success response:', response);
      console.log('[Google OAuth] Access token received:', response.access_token ? 'Yes' : 'No');
      console.log('[Google OAuth] Token type:', response.token_type);
      console.log('[Google OAuth] Expires in:', response.expires_in);
      
      try {
        console.log('[Auth] Sending login request to backend...');
        const result = await loginMutation.mutateAsync({ googleAccessToken: response.access_token });
        console.log('[Auth] Backend response:', result);
        
        // Check if authentication actually worked
        console.log('[Auth] Checking authentication status...');
        const authCheck = await fetch('/api/user');
        console.log('[Auth] Auth check status:', authCheck.status);
        
        if (authCheck.ok) {
          const userData = await authCheck.json();
          console.log('[Auth] User authenticated:', userData);
        } else {
          console.error('[Auth] Authentication failed - user not authenticated after login');
          alert('Login failed. Please try again.');
        }
      } catch (error) {
        console.error('[Auth] Login process failed:', error);
        alert('Login failed: ' + (error.message || 'Unknown error'));
      }
    },
    onError: (error) => {
      console.error('[Google OAuth] OAuth error:', error);
      console.error('[Google OAuth] Full error details:', JSON.stringify(error, null, 2));
      
      // Don't show popup errors to user - they're usually not actionable
      if (error && typeof error === 'object' && 'type' in error) {
        console.log('[Google OAuth] Error type detected:', error.type);
        if (error.type === 'popup_closed') {
          console.log('[Google OAuth] User closed popup - this is normal, not showing error');
          return; // Don't show error for user-closed popup
        }
      }
      
      alert('Google authentication failed. Please try again.');
    },
    onNonOAuthError: (error) => {
      console.error('[Google OAuth] Non-OAuth error details:', error);
      console.error('[Google OAuth] Error type:', typeof error);
      console.error('[Google OAuth] Error constructor:', error?.constructor?.name);
      console.error('[Google OAuth] Error message:', error?.message);
      console.error('[Google OAuth] Error stack:', error?.stack);
      console.error('[Google OAuth] Full error object:', JSON.stringify(error, null, 2));
      
      // Show the actual error message to help debug
      const errorMessage = error?.message || error?.toString() || 'Unknown authentication error';
      alert(`Authentication error: ${errorMessage}\n\nPlease check the browser console for details.`);
    },
    flow: 'implicit',
    hosted_domain: 'seedfinancial.io',
  });

  console.log('[AuthPage] Google Client ID available:', !!import.meta.env.VITE_GOOGLE_CLIENT_ID);
  console.log('[AuthPage] Hosted domain:', 'seedfinancial.io');
  console.log('[AuthPage] OAuth Library version:', '@react-oauth/google@0.12.2');
  console.log('[AuthPage] Current origin:', window.location.origin);

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
          <CardContent>
            <Button
              onClick={() => {
                console.log('[AuthPage] Google login button clicked');
                console.log('[AuthPage] Google Client ID length:', import.meta.env.VITE_GOOGLE_CLIENT_ID?.length);
                console.log('[AuthPage] Current URL:', window.location.href);
                console.log('[AuthPage] User agent:', navigator.userAgent);
                console.log('[AuthPage] Window location origin:', window.location.origin);
                
                // Validate Client ID before attempting login
                if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                  console.error('[AuthPage] No Google Client ID available');
                  alert('Google Client ID not configured. Please check environment variables.');
                  return;
                }
                
                try {
                  console.log('[AuthPage] Calling googleLogin()...');
                  
                  // Add a small delay to ensure console logs are visible
                  setTimeout(() => {
                    googleLogin();
                    console.log('[AuthPage] googleLogin() called successfully');
                  }, 100);
                  
                } catch (error) {
                  console.error('[AuthPage] Error calling googleLogin:', error);
                  alert('Failed to initialize Google login: ' + error.message);
                }
              }}
              className="w-full bg-[#e24c00] hover:bg-[#c23e00] text-white"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg
                    className="mr-2 h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>
            
            <div className="text-sm text-gray-600 mt-4 space-y-1">
              <p className="text-center">Troubleshooting:</p>
              <ul className="text-left space-y-1 ml-4">
                <li>• Make sure you're using a @seedfinancial.io Google account</li>
                <li>• Allow popups for this site if prompted</li>
                <li>• Check browser console for detailed error messages</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}