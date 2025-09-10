import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PermissionDeniedProps {
  message?: string;
  action?: string;
  module?: string;
  showBackButton?: boolean;
  variant?: 'page' | 'inline' | 'modal';
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  message,
  action = 'access',
  module = 'this feature',
  showBackButton = true,
  variant = 'inline'
}) => {
  const navigate = useNavigate();

  const defaultMessage = `You don't have permission to ${action} ${module}. Please contact your administrator if you need access.`;

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (variant === 'page') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="text-center">
            <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              {message || defaultMessage}
            </p>
            <div className="space-x-4">
              {showBackButton && (
                <Button onClick={handleGoBack} variant="outline">
                  Go Back
                </Button>
              )}
              <Button onClick={handleGoToDashboard}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Permission Required
            </h3>
            <p className="text-gray-600 mb-6">
              {message || defaultMessage}
            </p>
            <div className="space-x-4">
              {showBackButton && (
                <Button onClick={handleGoBack} variant="outline">
                  Go Back
                </Button>
              )}
              <Button onClick={handleGoToDashboard}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <Alert className="my-4">
      <Lock className="h-4 w-4" />
      <AlertDescription>
        {message || defaultMessage}
        {showBackButton && (
          <div className="mt-3">
            <Button onClick={handleGoBack} variant="outline" size="sm" className="mr-2">
              Go Back
            </Button>
            <Button onClick={handleGoToDashboard} size="sm">
              Dashboard
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};