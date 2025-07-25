import { Router, Route, Switch } from 'wouter'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/protected-route'
import Dashboard from '@/pages/dashboard'
import Login from '@/pages/login'
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

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/" component={() => <ProtectedRoute path="/" component={Dashboard} />} />
          <Route>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">404 - Page Not Found</h1>
                <p className="text-gray-600 mt-2">The page you're looking for doesn't exist.</p>
              </div>
            </div>
          </Route>
        </Switch>
      </div>
    </Router>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App