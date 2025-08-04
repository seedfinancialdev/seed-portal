import * as React from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { User as DBUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const { createContext, useContext, useEffect, useState } = React;

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  hd?: string;
  sub: string;
}

interface UnifiedAuthContextType {
  user: DBUser | null;
  isLoading: boolean;
  error: Error | null;
  isOAuthInProgress: boolean;
  needsApproval: boolean;
  signInWithGoogle: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<UnifiedAuthContextType | null>(null);

function UnifiedAuthProviderContent({ children }: { children: React.ReactNode }) {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isOAuthInProgress, setIsOAuthInProgress] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for stored OAuth tokens on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('google_access_token');
    const storedUser = localStorage.getItem('google_user');
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser) as GoogleUser;
        if (user.hd === 'seedfinancial.io') {
          setGoogleUser(user);
          setAccessToken(storedToken);
          setIsOAuthInProgress(true); // Mark OAuth as in progress
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

  // Main session query - checks if user is authenticated
  const { data: sessionUser, isLoading: sessionLoading, refetch: refetchSession, error: sessionError } = useQuery<DBUser | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Don't query while OAuth is in progress to prevent race conditions
    enabled: !isOAuthInProgress,
    staleTime: 0, // Always check fresh
    retry: false,
  });

  // Google OAuth sync mutation - creates session on backend
  const syncGoogleUserMutation = useMutation({
    mutationFn: async ({ googleUser, token }: { googleUser: GoogleUser; token: string }) => {
      console.log('🔄 Starting Google OAuth sync...');
      
      const response = await apiRequest("/api/auth/google/sync", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          googleId: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          hd: googleUser.hd
        }),
      });
      
      console.log('✅ OAuth sync response:', response);
      return response;
    },
    onSuccess: async (data) => {
      console.log('✅ OAuth sync successful, session created:', data.sessionCreated);
      
      // Clear OAuth tokens only after confirming session is created
      if (data.sessionCreated) {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_user');
        setAccessToken(null);
        setGoogleUser(null);
        
        // Mark OAuth as complete
        setIsOAuthInProgress(false);
        
        // Force refetch session to get authenticated user
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        await refetchSession();
        
        toast({
          title: "Welcome!",
          description: `Signed in as ${data.email}`,
          duration: 2000,
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ OAuth sync failed:', error);
      setIsOAuthInProgress(false);
      
      // Clear tokens on error
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_user');
      setAccessToken(null);
      setGoogleUser(null);
      
      if (error.message?.includes('ACCESS_NOT_GRANTED') || error.status === 403) {
        toast({
          title: "Access Not Granted",
          description: "Please contact your administrator for access.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign in failed",
          description: error.message || "Authentication failed",
          variant: "destructive",
        });
      }
    }
  });

  // Process OAuth tokens when they're available
  useEffect(() => {
    if (googleUser && accessToken && isOAuthInProgress) {
      console.log('🔐 Processing OAuth tokens for:', googleUser.email);
      syncGoogleUserMutation.mutate({ googleUser, token: accessToken });
    }
  }, [googleUser, accessToken, isOAuthInProgress]);

  // Google login handler
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log('🔐 Google login successful, fetching user info...');
        setIsOAuthInProgress(true);
        
        // Get user info using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        
        if (!userInfoResponse.ok) {
          throw new Error(`Failed to get user info: ${userInfoResponse.status}`);
        }
        
        const userInfo = await userInfoResponse.json();
        console.log('👤 User info received:', userInfo.email);
        
        // Check domain restriction
        if (userInfo.hd !== 'seedfinancial.io') {
          toast({
            title: "Access Denied",
            description: "Only @seedfinancial.io email addresses are allowed",
            variant: "destructive",
          });
          setIsOAuthInProgress(false);
          return;
        }
        
        // Store OAuth data to trigger sync
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
        
      } catch (error) {
        console.error('❌ Error processing Google login:', error);
        setIsOAuthInProgress(false);
        toast({
          title: "Sign in failed",
          description: error instanceof Error ? error.message : "Failed to process login",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('❌ Google login error:', error);
      setIsOAuthInProgress(false);
      toast({
        title: "Sign in failed",
        description: "Failed to sign in with Google",
        variant: "destructive",
      });
    },
  });

  // Email/password login mutation
  const emailLoginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
    },
    onSuccess: async (user: DBUser) => {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
        duration: 2000,
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message;
      let title = "Login failed";
      let description = errorMessage;
      
      if (errorMessage.includes("Invalid email or password")) {
        title = "Incorrect Password";
        description = "The password you entered is incorrect. Please contact your administrator if you need to reset it.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", { method: "POST" });
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      
      // Clear any OAuth tokens if they exist
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_user');
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
        duration: 2000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Determine current user and loading state
  const currentUser = sessionUser;
  const isLoading = sessionLoading || isOAuthInProgress || syncGoogleUserMutation.isPending;
  const error = sessionError || syncGoogleUserMutation.error || emailLoginMutation.error;
  const needsApproval = error?.message?.includes('ACCESS_NOT_GRANTED') || false;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isLoading,
        error,
        isOAuthInProgress,
        needsApproval,
        signInWithGoogle: googleLogin,
        signInWithEmail: (email, password) => emailLoginMutation.mutateAsync({ email, password }),
        signOut: () => signOutMutation.mutateAsync(),
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.error('Google Client ID not configured');
    return <div>Google authentication not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.</div>;
  }
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <UnifiedAuthProviderContent>{children}</UnifiedAuthProviderContent>
    </GoogleOAuthProvider>
  );
}

export function useUnifiedAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUnifiedAuth must be used within a UnifiedAuthProvider");
  }
  return context;
}