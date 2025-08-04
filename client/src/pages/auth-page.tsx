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

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      console.log('[Google OAuth] Success:', response);
      try {
        console.log('[Auth] Starting login mutation...');
        const result = await loginMutation.mutateAsync({ googleAccessToken: response.access_token });
        console.log('[Auth] Login mutation successful:', result);
        
        // Give extra time for auth state to sync
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[Auth] Ready for redirect');
      } catch (error) {
        console.error('[Auth] Login mutation failed:', error);
      }
    },
    onError: (error) => {
      console.error('[Google OAuth] Login error:', error);
    },
    onNonOAuthError: (error) => {
      console.error('[Google OAuth] Non-OAuth error:', error);
    },
    flow: 'implicit',
    hosted_domain: 'seedfinancial.io',
  });

  console.log('[AuthPage] Google Client ID available:', !!import.meta.env.VITE_GOOGLE_CLIENT_ID);
  console.log('[AuthPage] Hosted domain:', 'seedfinancial.io');

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
                googleLogin();
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}