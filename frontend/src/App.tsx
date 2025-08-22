import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/authStore';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Layout from '@/components/Layout';
import { RoomsPage } from '@/pages/RoomsPage';
import { RoomTypesPage } from '@/pages/RoomTypesPage';
import Bookings from '@/pages/Bookings';
import Customers from '@/pages/Customers';
import Inventory from '@/pages/Inventory';
import Billing from '@/pages/Billing';
import POS from '@/pages/POS';
import Reports from '@/pages/Reports';
import RoomAllocation from '@/pages/RoomAllocation';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="room-types" element={<RoomTypesPage />} />
              <Route path="room-allocation" element={<RoomAllocation />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="customers" element={<Customers />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="billing" element={<Billing />} />
              <Route path="pos" element={<POS />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Routes>
        </Router>
        <Toaster />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
