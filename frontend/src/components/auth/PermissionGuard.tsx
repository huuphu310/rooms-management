import { ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/stores/authStore';

interface PermissionGuardProps {
  children: ReactNode;
  /** Required role(s) to access this component */
  roles?: UserRole[];
  /** Required module permission */
  module?: string;
  /** Required action permission (optional, defaults to any access) */
  action?: string;
  /** Fallback component when permission denied */
  fallback?: ReactNode;
  /** Hide completely if no permission (default: false - shows fallback) */
  hideIfNoAccess?: boolean;
}

/**
 * PermissionGuard - Conditionally renders children based on user permissions
 * 
 * Examples:
 * <PermissionGuard roles={['admin']}>Admin only content</PermissionGuard>
 * <PermissionGuard module="bookings" action="create">Create booking button</PermissionGuard>
 * <PermissionGuard module="billing" fallback={<div>Access denied</div>}>Billing section</PermissionGuard>
 */
export function PermissionGuard({
  children,
  roles,
  module,
  action,
  fallback = null,
  hideIfNoAccess = false
}: PermissionGuardProps) {
  const { user, isAdmin, canAccess } = useAuthStore();

  // Not authenticated
  if (!user) {
    return hideIfNoAccess ? null : fallback;
  }

  // Admin always has access (unless specifically restricted)
  if (isAdmin() && !roles?.includes('admin')) {
    return <>{children}</>;
  }

  // Check role-based access
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.includes(user.role);
    if (!hasRequiredRole) {
      return hideIfNoAccess ? null : fallback;
    }
  }

  // Check module/action-based access
  if (module) {
    const hasModuleAccess = canAccess(module, action);
    if (!hasModuleAccess) {
      return hideIfNoAccess ? null : fallback;
    }
  }

  // Permission granted
  return <>{children}</>;
}

/**
 * AdminOnly - Quick component for admin-only content
 */
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard roles={['admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * StaffOnly - Quick component for staff-only content
 */
export function StaffOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard roles={['admin', 'manager', 'receptionist', 'accountant']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * RoleDisplay - Shows user's current role for debugging/display
 */
export function RoleDisplay() {
  const { user, isAdmin } = useAuthStore();
  
  if (!user) return null;
  
  return (
    <div className="text-xs text-muted-foreground">
      Role: {user.role} {isAdmin() && '(Admin)'}
    </div>
  );
}