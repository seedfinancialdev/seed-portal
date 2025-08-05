import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";



export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('[OAuth] Error from Google:', error);
      alert('Authentication failed: ' + error);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (code && !loginMutation.isPending) {
      console.log('[OAuth] Authorization code received, exchanging for token...');
      
      // Call the OAuth endpoint directly instead of the login mutation
      fetch('/api/oauth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authorizationCode: code }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.email) {
          console.log('[OAuth] Authentication successful, reloading page...');
          window.location.href = '/';
        } else {
          console.error('[OAuth] Authentication failed:', data);
          alert('Authentication failed: ' + (data.message || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('[OAuth] Error:', error);
        alert('Authentication failed: ' + error.message);
      });
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loginMutation, loginMutation.isPending]);

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
    try {
      console.log('[Google OAuth] Credential response received:', !!credentialResponse.credential);
      console.log('[Google OAuth] Full response:', credentialResponse);
      
      if (!credentialResponse?.credential) {
        console.error('[Google OAuth] No credential received');
        alert('Google authentication failed - no credential received');
        return;
      }
      
      console.log('[Auth] Sending credential to backend...');
      const result = await loginMutation.mutateAsync({ 
        googleCredential: credentialResponse.credential 
      });
      console.log('[Auth] Login successful:', result);
    } catch (error: any) {
      console.error('[Auth] Login failed:', error);
      
      // Handle specific error types
      if (error?.message?.includes('Network Error') || error?.message?.includes('Failed to fetch')) {
        alert('Network error during login. Please check your connection and try again.');
      } else if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        alert('Authentication failed. Please ensure you are using a @seedfinancial.io account.');
      } else {
        alert('Login failed: ' + (error?.message || 'Unknown error'));
      }
    }
  };

  const handleGoogleError = (error?: any) => {
    console.error('[Google OAuth] Authentication failed:', error);
    
    // Handle specific error types
    if (error?.error === 'access_denied') {
      console.log('[Google OAuth] User cancelled authentication');
      return; // Don't show alert for user cancellation
    }
    
    if (error?.error === 'redirect_uri_mismatch') {
      alert('OAuth configuration error: Your domain needs to be added to the Google OAuth console. Please contact your administrator.');
      return;
    }
    
    if (error?.error === 'invalid_client') {
      alert('OAuth client configuration error. Please contact your administrator.');
      return;
    }
    
    // Generic error handling - only show for unexpected errors
    console.log('[Google OAuth] Showing generic error for:', error);
    alert('Google authentication failed. Please try again or contact support if the issue persists.');
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
              <button
                onClick={() => {
                  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                  const redirectUri = encodeURIComponent(window.location.origin + '/auth');
                  const scope = encodeURIComponent('openid email profile');
                  const hostedDomain = encodeURIComponent('seedfinancial.io');
                  
                  const googleAuthUrl = `https://accounts.google.com/oauth/authorize?` +
                    `client_id=${clientId}&` +
                    `redirect_uri=${redirectUri}&` +
                    `response_type=code&` +
                    `scope=${scope}&` +
                    `hd=${hostedDomain}&` +
                    `access_type=offline&` +
                    `prompt=select_account`;
                  
                  console.log('[OAuth] Redirecting to:', googleAuthUrl);
                  window.location.href = googleAuthUrl;
                }}
                className="w-full bg-[#4285f4] hover:bg-[#357ae8] text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors"
                data-testid="google-login-button"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
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
                <li>• You'll be redirected to Google for authentication</li>
                <li>• After signing in, you'll be brought back to the portal</li>
              </ul>
            </div>

            <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded">
              <p><strong>Domain Configuration Required:</strong></p>
              <p>Your deployed domain needs to be added to the Google OAuth console:</p>
              <p>• Add: <code>{window.location.origin}</code></p>
              <p>• To the "Authorized JavaScript origins" list</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}