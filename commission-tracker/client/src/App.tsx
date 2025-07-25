import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Router, Route, Switch } from "wouter";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import RepDashboard from "@/pages/rep-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import DealsManagement from "@/pages/deals-management";
import CommissionReports from "@/pages/commission-reports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Set up the default fetcher for React Query
queryClient.setQueryDefaults(["api"], {
  queryFn: async ({ queryKey }) => {
    const url = Array.isArray(queryKey) ? queryKey.join("/") : queryKey;
    const res = await fetch(url as string);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="commission-tracker-theme">
        <AuthProvider>
          <Router>
            <Switch>
              <Route path="/login" component={Login} />
              <ProtectedRoute path="/" component={Dashboard} />
              <ProtectedRoute path="/rep-dashboard" component={RepDashboard} />
              <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} />
              <ProtectedRoute path="/deals" component={DealsManagement} />
              <ProtectedRoute path="/reports" component={CommissionReports} />
            </Switch>
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;