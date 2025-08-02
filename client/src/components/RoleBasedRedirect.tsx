import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function RoleBasedRedirect() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading || !user) return;

    // Only redirect from root path
    if (location !== "/") return;

    // Role-based dashboard redirect
    switch (user.role) {
      case "admin":
        setLocation("/admin");
        break;
      case "sales":
        setLocation("/sales-dashboard");
        break;
      case "service":
        setLocation("/service-dashboard");
        break;
      default:
        setLocation("/sales-dashboard");
    }
  }, [user, isLoading, location, setLocation]);

  return null;
}