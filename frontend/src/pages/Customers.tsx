import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, User, Star, Phone, Mail, Eye, Edit } from 'lucide-react';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { CustomerView } from '@/components/customers/CustomerView';
import { customerService, type Customer } from '@/services/customerService';

export default function Customers() {
  const { t, formatCurrency: formatCurrencyLocale } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customerService.getCustomers({
        limit: 100  // Get more customers in one request
      });
      
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]); // Ensure customers is always an array
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = Array.isArray(customers) 
    ? customers.filter(customer =>
        customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
      )
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'vip': return 'success';
      case 'inactive': return 'secondary';
      case 'blacklisted': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return <div className="p-6">{t('common.loading')}...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('customers.title')}</h2>
          <p className="text-muted-foreground">{t('customers.subtitle')}</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t('customers.newCustomer')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('customers.totalCustomers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(customers) ? customers.length : 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('customers.vip')} {t('customers.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(customers) ? customers.filter(c => c.status === 'vip').length : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('customers.active')} {t('customers.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(customers) ? customers.filter(c => c.status === 'active').length : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.totalRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Array.isArray(customers) ? customers.reduce((sum, c) => sum + c.total_spent, 0) : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('customers.searchCustomers')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers.customerList')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.customer')}</TableHead>
                <TableHead>{t('common.contact')}</TableHead>
                <TableHead>{t('customers.totalBookings')}</TableHead>
                <TableHead>{t('customers.totalSpent')}</TableHead>
                <TableHead>{t('customers.loyaltyPoints')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <div>
                        <div className="font-medium">{customer.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.nationality || t('common.notAvailable')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="mr-1 h-3 w-3" />
                        {customer.email}
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="mr-1 h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{customer.total_bookings}</TableCell>
                  <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Star className="mr-1 h-4 w-4 text-yellow-500" />
                      {customer.loyalty_points}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(customer.status) as any}>
                      {t(`customers.${customer.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('common.view')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {t('common.edit')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <CustomerForm
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={fetchCustomers}
        mode="add"
      />

      {/* Edit Customer Dialog */}
      {selectedCustomer && (
        <CustomerForm
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          onSuccess={fetchCustomers}
          mode="edit"
        />
      )}

      {/* View Customer Dialog */}
      {selectedCustomer && (
        <CustomerView
          open={showViewDialog}
          onClose={() => {
            setShowViewDialog(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}