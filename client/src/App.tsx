import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Calculator from "@/pages/home.tsx"; // Quote Calculator component  
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard-new"; // Main dashboard home page
import CommissionTracker from "@/pages/commission-tracker";
import ClientIntel from "@/pages/client-intel";
import Profile from "@/pages/profile";

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/calculator" component={Calculator} />
        <ProtectedRoute path="/commission-tracker" component={CommissionTracker} />
        <ProtectedRoute path="/client-intel" component={ClientIntel} />
        <ProtectedRoute path="/profile" component={Profile} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
