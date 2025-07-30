import { useGoogleAuth } from "./use-google-auth";
import { hasPermission, hasAnyPermission, hasAllPermissions, getDefaultDashboard, getAvailableDashboards, type UserRole, type Permission } from "@shared/permissions";

export function usePermissions() {
  const { currentUser } = useGoogleAuth();
  const userRole = (currentUser?.role as UserRole) || 'service';

  return {
    userRole,
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
    getDefaultDashboard: () => getDefaultDashboard(userRole),
    getAvailableDashboards: () => getAvailableDashboards(userRole),
    isAdmin: userRole === 'admin',
    isSales: userRole === 'sales',
    isService: userRole === 'service'
  };
}