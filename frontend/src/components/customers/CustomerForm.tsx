import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { customerService } from '@/services/customerService';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  customer?: any;
  onSuccess?: () => void;
  mode?: 'add' | 'edit';
}

export function CustomerForm({ open, onClose, customer, onSuccess, mode = 'add' }: CustomerFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: customer?.full_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    nationality: customer?.nationality || '',
    passport_number: customer?.passport_number || '',
    address: customer?.address || '',
    date_of_birth: customer?.date_of_birth || '',
    status: customer?.status || 'active',
    notes: customer?.notes || '',
    emergency_contact: customer?.emergency_contact || '',
    emergency_phone: customer?.emergency_phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'add') {
        await customerService.createCustomer({
          ...formData,
          loyalty_points: 0,
          total_bookings: 0,
          total_spent: 0,
        });
        
        toast({
          title: t('common.success'),
          description: t('common.saveSuccess'),
        });
      } else {
        await customerService.updateCustomer(customer.id, formData);
        
        toast({
          title: t('common.success'),
          description: t('common.saveSuccess'),
        });
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('common.operationFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? t('customers.newCustomer') : t('customers.editCustomer')}</DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Add a new customer to the system with their contact and personal information.'
              : 'Update customer information including contact details and preferences.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t('customers.fullName')} *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('customers.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('customers.phone')} *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality">{t('customers.nationality')}</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passport_number">{t('customers.idNumber')}</Label>
              <Input
                id="passport_number"
                value={formData.passport_number}
                onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">{t('customers.dateOfBirth')}</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('common.status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('customers.active')}</SelectItem>
                  <SelectItem value="vip">{t('customers.vip')}</SelectItem>
                  <SelectItem value="inactive">{t('customers.inactive')}</SelectItem>
                  <SelectItem value="blacklisted">{t('customers.blacklisted')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact">{t('common.emergencyContact')}</Label>
              <Input
                id="emergency_contact"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_phone">{t('common.emergencyPhone')}</Label>
              <Input
                id="emergency_phone"
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('customers.address')}</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.saving') : mode === 'add' ? t('customers.newCustomer') : t('common.update')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}