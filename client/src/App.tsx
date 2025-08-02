import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { GoogleAuthProvider } from "./hooks/use-google-auth";
import { RoleBasedRedirect } from "./components/RoleBasedRedirect";
import { ProtectedRoute } from "./lib/protected-route";
import { Switch, Route } from "wouter";
import AdminDashboard from "./pages/admin-dashboard";
import "./index.css";

// Temporary placeholder components
function Dashboard() {
  return <div className="p-4"><h1>Dashboard Loading...</h1></div>;
}

function AuthPage() {
  return <div className="p-4"><h1>Auth Page Loading...</h1></div>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleAuthProvider>
          <RoleBasedRedirect />
          <Switch>
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/admin" component={AdminDashboard} />
            <ProtectedRoute path="/sales-dashboard" component={Dashboard} />
            <ProtectedRoute path="/service-dashboard" component={Dashboard} />
            <Route path="/auth" component={AuthPage} />
            <Route>
              <div className="p-4">Page not found</div>
            </Route>
          </Switch>
        </GoogleAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;