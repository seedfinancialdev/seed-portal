import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

interface GoogleAuthContextType {
  googleUser: GoogleUser | null;
  isGoogleAuthenticated: boolean;
  syncWithBackend: (accessToken: string) => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);

  const syncWithBackend = async (accessToken: string) => {
    try {
      const response = await apiRequest("/api/auth/google/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      
      if (response.user) {
        setGoogleUser(response.user);
      }
    } catch (error) {
      console.error("Failed to sync with backend:", error);
    }
  };

  const value: GoogleAuthContextType = {
    googleUser,
    isGoogleAuthenticated: !!googleUser,
    syncWithBackend,
  };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (context === undefined) {
    throw new Error("useGoogleAuth must be used within a GoogleAuthProvider");
  }
  return context;
}