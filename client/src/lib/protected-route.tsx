import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user: dbUser, isLoading } = useAuth();
  const needsApproval = false; // Backend handles approval
  const googleUser = dbUser; // Simplified since backend manages auth

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // If user needs approval and has authenticated with Google, redirect to request access
  if (needsApproval && googleUser) {
    return (
      <Route path={path}>
        <Redirect to="/request-access" />
      </Route>
    );
  }

  // If no Google authentication at all, redirect to auth
  if (!dbUser && !googleUser) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If Google auth but no DB user and not needing approval, redirect to auth
  if (!dbUser) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path}><Component /></Route>;
}