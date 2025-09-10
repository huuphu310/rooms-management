import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { PermissionDenied } from './PermissionDenied';

interface PermissionGuardProps {
  permission?: string;
  module?: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  hideIfNoAccess?: boolean;
  showNotification?: boolean;
  notificationVariant?: 'page' | 'inline' | 'modal';
  customMessage?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  module,
  action = 'access',
  fallback,
  children,
  hideIfNoAccess = false,
  showNotification = true,
  notificationVariant = 'inline',
  customMessage,
}) => {
  const { hasPermission, canAccess } = useAuthStore();

  let hasAccess = false;

  if (permission) {
    // Check specific permission
    hasAccess = hasPermission(permission);
  } else if (module) {
    // Check module access
    hasAccess = canAccess(module, action);
  } else {
    // No permission specified, allow access
    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle no access cases
  if (hideIfNoAccess) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showNotification) {
    return (
      <PermissionDenied
        message={customMessage}
        action={action}
        module={module || 'this feature'}
        variant={notificationVariant}
      />
    );
  }

  return null;
};