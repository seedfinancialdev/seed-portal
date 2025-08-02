import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { GoogleAuthProvider } from "./hooks/use-google-auth";
import { RoleBasedRedirect } from "./components/RoleBasedRedirect";
import { ProtectedRoute } from "./lib/protected-route";
import { Switch, Route } from "wouter";
import AdminDashboard from "./pages/admin-dashboard";
import SalesDashboard from "./pages/sales-dashboard";
import ServiceDashboard from "./pages/service-dashboard";
import CDNMonitoring from "./pages/cdn-monitoring";
import UserManagement from "./pages/user-management";
import CommissionTracker from "./pages/commission-tracker";
import StripeDashboard from "./pages/stripe-dashboard";
import "./index.css";

// Temporary placeholder components
function Dashboard() {
  return <div className="p-4"><h1>Dashboard Loading...</h1></div>;
}

function AuthPage() {
  return <div className="p-4"><h1>Auth Page Loading...</h1></div>;
}

function Calculator() {
  return <div className="p-4"><h1>Quote Calculator Loading...</h1></div>;
}

function ClientIntel() {
  return <div className="p-4"><h1>Client Intelligence Loading...</h1></div>;
}

function KnowledgeBase() {
  return <div className="p-4"><h1>Knowledge Base Loading...</h1></div>;
}

function Profile() {
  return <div className="p-4"><h1>Profile Loading...</h1></div>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleAuthProvider>
          <RoleBasedRedirect />
          <Switch>
            <ProtectedRoute path="/" component={AdminDashboard} />
            <ProtectedRoute path="/admin" component={AdminDashboard} />
            <ProtectedRoute path="/sales-dashboard" component={SalesDashboard} />
            <ProtectedRoute path="/service-dashboard" component={ServiceDashboard} />
            <ProtectedRoute path="/cdn-monitoring" component={CDNMonitoring} />
            <ProtectedRoute path="/user-management" component={UserManagement} />
            <ProtectedRoute path="/commission-tracker" component={CommissionTracker} />
            <ProtectedRoute path="/stripe-dashboard" component={StripeDashboard} />
            <ProtectedRoute path="/calculator" component={Calculator} />
            <ProtectedRoute path="/client-intel" component={ClientIntel} />
            <ProtectedRoute path="/knowledge-base" component={KnowledgeBase} />
            <ProtectedRoute path="/profile" component={Profile} />
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