import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Dashboard from "./dashboard";

export default function RepDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Rep dashboard is the same as main dashboard for individual reps
  // Admin dashboard will be separate with team-wide views
  if (!user) {
    setLocation("/login");
    return null;
  }

  return <Dashboard />;
}