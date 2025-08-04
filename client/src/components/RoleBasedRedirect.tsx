import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePermissions } from '@/hooks/use-permissions';
import { useUnifiedAuth } from '@/hooks/use-unified-auth';

export function RoleBasedRedirect() {
  const [location, setLocation] = useLocation();
  const { getDefaultDashboard, userRole } = usePermissions();
  const { user: currentUser } = useUnifiedAuth();

  useEffect(() => {
    // Only redirect if we're on the root path and user is authenticated
    if (location === '/' && currentUser) {
      const defaultDashboard = getDefaultDashboard();
      if (defaultDashboard !== '/') {
        setLocation(defaultDashboard);
      }
    }
  }, [location, currentUser, userRole, setLocation, getDefaultDashboard]);

  return null;
}