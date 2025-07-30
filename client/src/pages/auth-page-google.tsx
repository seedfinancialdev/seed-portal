import { useGoogleAuth } from "@/hooks/use-google-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

export default function AuthPage() {
  const { dbUser, googleUser, isLoading, signIn, error } = useGoogleAuth();

  // Redirect if already logged in
  if (dbUser) {
    return <Redirect to="/" />;
  }

  const handleGoogleSignIn = () => {
    signIn();
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
            Welcome to Seed Financial
          </h2>
          <p className="mt-2 text-sm text-gray-200">
            Sign in with your Seed Financial Google account
          </p>
        </div>

        <Card className="bg-white shadow-xl">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {isLoading && firebaseUser && (
                <div className="text-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Setting up your account...</p>
                </div>
              )}

              {!isLoading && (
                <>
                  <Button 
                    onClick={handleGoogleSignIn}
                    className="w-full bg-[#4285f4] hover:bg-[#357ae8] text-white h-12 text-base font-medium"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                    </svg>
                    Sign in with Google
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    <p>Only @seedfinancial.io accounts are allowed</p>
                  </div>
                </>
              )}

              {error && (
                <div className="text-red-500 text-sm text-center mt-4">
                  {error.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}