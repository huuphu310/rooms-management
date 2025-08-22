import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  Home,
  Hotel,
  Calendar,
  Users,
  Package,
  CreditCard,
  ShoppingCart,
  BarChart3,
  LogOut,
  Menu,
  X,
  Layers,
  Grid3X3,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Rooms', href: '/rooms', icon: Hotel },
  { name: 'Room Types', href: '/room-types', icon: Layers },
  { name: 'Room Allocation', href: '/room-allocation', icon: Grid3X3 },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'POS', href: '/pos', icon: ShoppingCart },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          'bg-white shadow-lg transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            {sidebarOpen && (
              <h2 className="text-xl font-bold text-gray-800">Hotel MS</h2>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg',
                  'hover:bg-gray-100 hover:text-gray-900',
                  'text-gray-600'
                )}
              >
                <item.icon className={cn('h-5 w-5', sidebarOpen && 'mr-3')} />
                {sidebarOpen && item.name}
              </Link>
            ))}
          </nav>

          {/* User info & Logout */}
          <div className="border-t px-4 py-4">
            {sidebarOpen && user && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-900">
                  {user.full_name}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className={cn('w-full', !sidebarOpen && 'px-2')}
            >
              <LogOut className={cn('h-4 w-4', sidebarOpen && 'mr-2')} />
              {sidebarOpen && 'Logout'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">
              Hotel Management System
            </h1>
            <LanguageSwitcher />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}