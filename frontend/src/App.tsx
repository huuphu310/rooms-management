import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/authStore';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import exchangeRateService from '@/services/exchangeRateService';

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
import UserManagement from '@/pages/UserManagement';
import Folio from '@/pages/Folio';
import { BuildingSettings } from '@/pages/BuildingSettings';
import { LanguageDemo } from '@/components/LanguageDemo';
import BankAccountSettings from '@/pages/BankAccountSettings';
import ExchangeRateManagement from '@/pages/ExchangeRateManagement';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();

  useEffect(() => {
    // Only check auth if not already authenticated
    if (!isAuthenticated && !user) {
      checkAuth();
    }
  }, [checkAuth, isAuthenticated, user]);

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
  // Initialize exchange rate auto-sync on app start
  useEffect(() => {
    exchangeRateService.setupAutoSync();
    
    // Cleanup on unmount
    return () => {
      exchangeRateService.clearAutoSync();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <CurrencyProvider>
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
              <Route path="buildings" element={<BuildingSettings />} />
              <Route path="room-allocation" element={<RoomAllocation />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="customers" element={<Customers />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="billing" element={<Billing />} />
              <Route path="folio" element={<Folio />} />
              <Route path="pos" element={<POS />} />
              <Route path="reports" element={<Reports />} />
              <Route path="user-management" element={<UserManagement />} />
              <Route path="bank-accounts" element={<BankAccountSettings />} />
              <Route path="exchange-rates" element={<ExchangeRateManagement />} />
              <Route path="language-demo" element={<LanguageDemo />} />
            </Route>
          </Routes>
          </Router>
          <Toaster />
        </CurrencyProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
