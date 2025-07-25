import { Router, Route, Switch } from 'wouter'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import ProtectedRoute from "@/lib/protected-route";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import NotFoundPage from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Switch>
              <Route path="/auth" component={AuthPage} />
              <ProtectedRoute path="/" component={HomePage} />
              <Route component={NotFoundPage} />
            </Switch>
          </div>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App