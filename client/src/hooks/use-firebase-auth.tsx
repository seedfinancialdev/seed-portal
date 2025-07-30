import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, signInWithGoogle, handleRedirectResult, logoutUser } from "@/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User as DBUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: DBUser | null;
  isLoading: boolean;
  error: Error | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for redirect result on mount
  useEffect(() => {
    handleRedirectResult()
      .then((result) => {
        if (result) {
          toast({
            title: "Welcome!",
            description: "You have successfully signed in.",
            duration: 2000,
          });
        }
      })
      .catch((error) => {
        toast({
          title: "Sign in failed",
          description: error.message || "An error occurred during sign in",
          variant: "destructive",
        });
      });
  }, [toast]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.email?.endsWith('@seedfinancial.io')) {
        // Sign out if not from correct domain
        logoutUser();
        setFirebaseUser(null);
        toast({
          title: "Access Denied",
          description: "Only @seedfinancial.io email addresses are allowed",
          variant: "destructive",
        });
      } else {
        setFirebaseUser(user);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Sync Firebase user with database
  const { data: dbUser, isLoading: dbLoading, error } = useQuery<DBUser | null>({
    queryKey: ["/api/user/sync", firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      
      // Sync user with backend
      const response = await apiRequest("/api/user/sync", {
        method: "POST",
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }),
      });
      
      return response;
    },
    enabled: !!firebaseUser,
  });

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async () => {
      await signInWithGoogle();
    },
    onError: (error: Error) => {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await logoutUser();
      queryClient.clear();
    },
    onSuccess: () => {
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
        duration: 2000,
      });
    },
  });

  // Check if user is admin
  const isAdmin = dbUser?.role === 'admin' || dbUser?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        isLoading: authLoading || dbLoading,
        error,
        signIn: () => signInMutation.mutateAsync(),
        signOut: () => signOutMutation.mutateAsync(),
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useFirebaseAuth must be used within a FirebaseAuthProvider");
  }
  return context;
}