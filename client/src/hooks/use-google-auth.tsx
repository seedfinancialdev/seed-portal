import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User as DBUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  hd?: string; // hosted domain
  sub: string; // Google user ID
}

interface AuthContextType {
  googleUser: GoogleUser | null;
  dbUser: DBUser | null;
  isLoading: boolean;
  error: Error | null;
  signIn: () => void;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProviderContent({ children }: { children: ReactNode }) {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for stored token and user info on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('google_access_token');
    const storedUser = localStorage.getItem('google_user');
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser) as GoogleUser;
        // Check if token is for seedfinancial.io domain
        if (user.hd === 'seedfinancial.io') {
          setGoogleUser(user);
          setAccessToken(storedToken);
        } else {
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_user');
        }
      } catch (error) {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_user');
      }
    }
  }, []);

  // Sync Google user with database
  const { data: dbUser, isLoading: dbLoading, error } = useQuery<DBUser | null>({
    queryKey: ["/api/auth/google/sync", googleUser?.sub],
    queryFn: async () => {
      if (!googleUser || !accessToken) return null;
      
      // Sync user with backend
      const response = await apiRequest("/api/auth/google/sync", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          googleId: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          hd: googleUser.hd
        }),
      });
      
      return response;
    },
    enabled: !!googleUser && !!accessToken,
  });

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log('Google OAuth success, processing token...');
        // Get user info using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        
        const userInfo = await userInfoResponse.json();
        console.log('Got user info:', userInfo.email, 'domain:', userInfo.hd);
        
        // Check if user is from seedfinancial.io domain
        if (userInfo.hd !== 'seedfinancial.io') {
          toast({
            title: "Access Denied",
            description: "Only @seedfinancial.io email addresses are allowed",
            variant: "destructive",
          });
          return;
        }
        
        // Store token and user info
        const googleUser = {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          hd: userInfo.hd,
          sub: userInfo.sub,
        };
        localStorage.setItem('google_access_token', tokenResponse.access_token);
        localStorage.setItem('google_user', JSON.stringify(googleUser));
        setAccessToken(tokenResponse.access_token);
        setGoogleUser(googleUser);
        
        console.log('Authentication successful for:', userInfo.email);
        toast({
          title: "Welcome!",
          description: "You have successfully signed in.",
          duration: 2000,
        });
      } catch (error) {
        console.error('Error getting user info:', error);
        toast({
          title: "Sign in failed",
          description: "Failed to get user information",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      toast({
        title: "Sign in failed",
        description: "An error occurred during sign in",
        variant: "destructive",
      });
    },
    scope: 'openid email profile',
    hosted_domain: 'seedfinancial.io',
    flow: 'implicit', // Force popup mode
    ux_mode: 'popup', // Explicitly use popup UX mode to prevent redirects
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      try {
        if (accessToken) {
          // Try to notify backend of logout, but don't fail if it errors
          await apiRequest("/api/logout", {
            method: "POST",
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }).catch((error) => {
            // Log but don't throw - we still want to clear local state
            console.error('Backend logout error:', error);
          });
        }
      } catch (error) {
        // Log but continue with local cleanup
        console.error('Logout API error:', error);
      }
      
      // Always clear local state regardless of API call success
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_user');
      setGoogleUser(null);
      setAccessToken(null);
      queryClient.clear();
    },
    onSuccess: () => {
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
        duration: 2000,
      });
    },
    onError: (error) => {
      // Even on error, we've cleared local state so user is effectively logged out
      console.error('Sign out error:', error);
      toast({
        title: "Signed out",
        description: "You have been signed out.",
        duration: 2000,
      });
    },
  });

  // Check if user is admin
  const isAdmin = dbUser?.role === 'admin' || dbUser?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        googleUser,
        dbUser: dbUser ?? null,
        isLoading: dbLoading,
        error,
        signIn: googleLogin,
        signOut: () => signOutMutation.mutateAsync(),
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.error('Google Client ID not configured');
    return <div>Google authentication not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.</div>;
  }
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProviderContent>{children}</AuthProviderContent>
    </GoogleOAuthProvider>
  );
}

export function useGoogleAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useGoogleAuth must be used within a GoogleAuthProvider");
  }
  return context;
}