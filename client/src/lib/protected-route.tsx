import { useAuth } from "@/hooks/use-auth";
import { ComponentType } from "react";

interface ProtectedRouteProps {
  path?: string;
  component: ComponentType<any>;
}

export function ProtectedRoute({ component: Component, ...props }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  return <Component {...props} />;
}