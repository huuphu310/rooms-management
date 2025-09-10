import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Users, 
  Hotel, 
  Calendar, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { customerService } from '@/services/customerService';

interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  totalCustomers: number;
  todayRevenue: number;
  monthRevenue: number;
  occupancyRate: number;
  pendingPayments: number;
}

export default function Dashboard() {
  const { t, formatCurrency } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    todayCheckIns: 0,
    todayCheckOuts: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    occupancyRate: 0,
    pendingPayments: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0];

      // Fetch room statistics
      const { data: rooms } = await supabase
        .from('rooms')
        .select('status');

      const { data: checkIns } = await supabase
        .from('bookings')
        .select('id')
        .eq('check_in_date', today)
        .eq('status', 'confirmed');

      const { data: checkOuts } = await supabase
        .from('bookings')
        .select('id')
        .eq('check_out_date', today);

      const customersResponse = await customerService.getCustomers({ limit: 1 });

      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', today);

      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', firstDayOfMonth);

      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount')
        .in('status', ['pending', 'partial']);

      if (rooms) {
        const occupied = rooms.filter(r => r.status === 'occupied').length;
        const available = rooms.filter(r => r.status === 'available').length;
        
        setStats({
          totalRooms: rooms.length,
          occupiedRooms: occupied,
          availableRooms: available,
          todayCheckIns: checkIns?.length || 0,
          todayCheckOuts: checkOuts?.length || 0,
          totalCustomers: customersResponse?.pagination?.total || 0,
          todayRevenue: todayPayments?.reduce((sum, p) => sum + p.amount, 0) || 0,
          monthRevenue: monthPayments?.reduce((sum, p) => sum + p.amount, 0) || 0,
          occupancyRate: rooms.length > 0 ? (occupied / rooms.length) * 100 : 0,
          pendingPayments: pendingInvoices?.reduce((sum, i) => sum + (i.total_amount - (i.paid_amount || 0)), 0) || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: t('dashboard.totalRooms'),
      value: stats.totalRooms,
      description: `${stats.occupiedRooms} occupied, ${stats.availableRooms} available`,
      icon: Hotel,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('dashboard.occupancyRate'),
      value: `${stats.occupancyRate.toFixed(1)}%`,
      description: 'Current occupancy',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('dashboard.todayRevenue'),
      value: `$${stats.todayRevenue.toLocaleString()}`,
      description: 'Total revenue today',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: t('dashboard.monthRevenue'),
      value: `$${stats.monthRevenue.toLocaleString()}`,
      description: 'Revenue this month',
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: t('dashboard.todayCheckIns'),
      value: stats.todayCheckIns,
      description: 'Arrivals scheduled',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: t('dashboard.todayCheckOuts'),
      value: stats.todayCheckOuts,
      description: 'Departures scheduled',
      icon: Calendar,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: t('dashboard.totalCustomers'),
      value: stats.totalCustomers,
      description: 'Registered customers',
      icon: Users,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      title: t('dashboard.pendingPayments'),
      value: `$${stats.pendingPayments.toLocaleString()}`,
      description: 'Outstanding balance',
      icon: CreditCard,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h2>
        <p className="text-muted-foreground">
          {t('dashboard.welcomeMessage')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest bookings and check-ins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium">New booking received</p>
                  <p className="text-sm text-muted-foreground">
                    Room 101 - John Doe - 3 nights
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium">Check-in completed</p>
                  <p className="text-sm text-muted-foreground">
                    Room 205 - Jane Smith
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium">Payment received</p>
                  <p className="text-sm text-muted-foreground">
                    $450 - Invoice #INV-2024-001
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and operations</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <button className="text-left p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="font-medium">New Booking</div>
              <div className="text-sm text-muted-foreground">Create a reservation</div>
            </button>
            <button className="text-left p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="font-medium">Check-in Guest</div>
              <div className="text-sm text-muted-foreground">Process arrival</div>
            </button>
            <button className="text-left p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="font-medium">Generate Invoice</div>
              <div className="text-sm text-muted-foreground">Create billing</div>
            </button>
            <button className="text-left p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="font-medium">View Reports</div>
              <div className="text-sm text-muted-foreground">Analytics & insights</div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}