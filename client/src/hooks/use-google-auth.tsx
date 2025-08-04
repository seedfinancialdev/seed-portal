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
  needsApproval: boolean;
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

  // Sync Google user with database - creates session
  const { data: dbUser, isLoading: dbLoading, error } = useQuery<DBUser | null>({
    queryKey: ["/api/auth/google/sync", googleUser?.sub],
    queryFn: async () => {
      if (!googleUser || !accessToken) return null;
      
      try {
        // Sync user with backend and create session
        const responseData = await apiRequest("/api/auth/google/sync", {
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
        
        // Authentication successful
        
        // Clear OAuth tokens after successful session creation
        if (responseData.sessionCreated) {
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_user');
          setAccessToken(null);
          setGoogleUser(null);
          
          // Trigger immediate session refetch with a slight delay to ensure backend session is ready
          setTimeout(() => {
            refetchSession();
          }, 100);
        }
        
        return responseData;
      } catch (error: any) {
        
        // Handle specific error cases
        if (error.status === 401) {
          // Invalid token - clear and retry
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_user');
          setAccessToken(null);
          setGoogleUser(null);
          throw new Error('INVALID_TOKEN');
        }
        if (error.message?.includes('ACCESS_NOT_GRANTED') || error.status === 403) {
          throw new Error('ACCESS_NOT_GRANTED');
        }
        throw error;
      }
    },
    enabled: !!googleUser && !!accessToken,
    retry: (failureCount, error: any) => {
      // Retry once on network errors, but not on auth errors
      if (failureCount >= 2) return false;
      if (error.message?.includes('INVALID_TOKEN') || error.message?.includes('ACCESS_NOT_GRANTED')) return false;
      if (error.status === 401 || error.status === 403) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000)
  });

  // Separate query for current user session - prioritize after OAuth completion
  const { data: sessionUser, isLoading: sessionLoading, refetch: refetchSession } = useQuery<DBUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const result = await apiRequest("/api/user");
        return result;
      } catch (error: any) {
        if (error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 0, // Always check fresh during auth flow
    // Enable session check always, but give priority to OAuth flow when it's active
    enabled: true,
  });

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Process OAuth token
        
        // Get user info using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        
        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text();
          throw new Error(`Failed to get user info: ${userInfoResponse.status} ${errorText}`);
        }
        
        const userInfo = await userInfoResponse.json();
        
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
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          error: error
        });
        toast({
          title: "Sign in failed",
          description: error instanceof Error ? error.message : "Failed to get user information",
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
    flow: 'implicit', // Force popup mode to prevent redirects
  });

  // Sign out mutation - session-based logout
  const signOutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Logout from session (no Authorization header needed)
        await apiRequest("/api/logout", {
          method: "POST"
        }).catch((error) => {
          // Log but don't throw - we still want to clear local state
          console.error('Backend logout error:', error);
        });
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

  // Use session user if available, otherwise use dbUser from OAuth flow
  const currentUser = sessionUser || dbUser;
  
  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  
  // Check if user needs access approval
  const needsApproval = error?.message === 'ACCESS_NOT_GRANTED';

  return (
    <AuthContext.Provider
      value={{
        googleUser,
        dbUser: currentUser ?? null,
        isLoading: dbLoading || (sessionLoading && !googleUser && !accessToken),
        error,
        needsApproval,
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