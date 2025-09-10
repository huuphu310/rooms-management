import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Phone, MapPin, Calendar, CreditCard, Star, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CustomerViewProps {
  open: boolean;
  onClose: () => void;
  customer: any;
}

export function CustomerView({ open, onClose, customer }: CustomerViewProps) {
  const { t } = useLanguage();
  if (!customer) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return t('common.notAvailable');
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'vip': return 'success';
      case 'inactive': return 'secondary';
      case 'blacklisted': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('customers.customerDetails')}</span>
            <Badge variant={getStatusColor(customer.status) as any}>
              {t(`customers.${customer.status}`)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">{t('common.profile')}</TabsTrigger>
            <TabsTrigger value="bookings">{t('customers.bookingHistory')}</TabsTrigger>
            <TabsTrigger value="loyalty">{t('customers.loyaltyPoints')} & {t('common.stats')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('common.personalInformation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.fullName')}</p>
                      <p className="font-medium">{customer.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.dateOfBirth')}</p>
                      <p className="font-medium">{formatDate(customer.date_of_birth)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.email')}</p>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.phone')}</p>
                      <p className="font-medium">{customer.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.idNumber')}</p>
                      <p className="font-medium">{customer.passport_number || t('common.notAvailable')}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.nationality')}</p>
                      <p className="font-medium">{customer.nationality || t('common.notAvailable')}</p>
                    </div>
                  </div>
                </div>

                {customer.address && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">{t('customers.address')}</p>
                    <p className="font-medium">{customer.address}</p>
                  </div>
                )}

                {(customer.emergency_contact || customer.emergency_phone) && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <p className="text-sm font-medium">{t('common.emergencyContact')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {customer.emergency_contact && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t('common.name')}</p>
                          <p className="font-medium">{customer.emergency_contact}</p>
                        </div>
                      )}
                      {customer.emergency_phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t('customers.phone')}</p>
                          <p className="font-medium">{customer.emergency_phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {customer.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">{t('common.notes')}</p>
                    <p className="text-sm">{customer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('customers.bookingHistory')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('common.noDataAvailable')}</p>
                {/* TODO: Add booking history table here */}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('customers.loyaltyPoints')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-2xl font-bold">{customer.loyalty_points || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('customers.totalBookings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customer.total_bookings || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('customers.totalSpent')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(customer.total_spent || 0)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('common.statistics')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('customers.memberSince')}</span>
                  <span className="font-medium">{formatDate(customer.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('common.averageBookingValue')}</span>
                  <span className="font-medium">
                    {customer.total_bookings > 0 
                      ? formatCurrency(customer.total_spent / customer.total_bookings)
                      : formatCurrency(0)
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('common.loyaltyTier')}</span>
                  <span className="font-medium">
                    {customer.loyalty_points >= 1000 ? t('common.gold') :
                     customer.loyalty_points >= 500 ? t('common.silver') :
                     customer.loyalty_points >= 100 ? t('common.bronze') : t('common.member')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}