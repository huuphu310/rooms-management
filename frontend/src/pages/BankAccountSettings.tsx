import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Copy, Settings, CreditCard, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/stores/authStore';

interface BankAccount {
  id: string;
  account_id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_seapay_integrated: boolean;
  is_default: boolean;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

interface SupportedBank {
  code: string;
  bin: string;
  short_name: string;
  supported: boolean;
}

const BankAccountSettings: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token } = useAuthStore();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [supportedBanks, setSupportedBanks] = useState<SupportedBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [activeTab, setActiveTab] = useState('accounts');
  
  // SeaPay integration settings
  const [seapaySettings, setSeapaySettings] = useState({
    webhook_url: '',
    api_key: '',
    merchant_id: '',
    environment: 'sandbox' as 'sandbox' | 'production'
  });
  
  const [formData, setFormData] = useState({
    bank_code: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    is_seapay_integrated: false,
    is_default: false
  });

  useEffect(() => {
    loadBankAccounts();
    loadSupportedBanks();
    loadSeapaySettings();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const response = await fetch('/api/v1/payment-integration/bank-accounts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load bank accounts',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error loading bank accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSupportedBanks = async () => {
    try {
      const response = await fetch('/api/v1/payment-integration/banks');
      if (response.ok) {
        const data = await response.json();
        setSupportedBanks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load supported banks:', error);
    }
  };

  const loadSeapaySettings = async () => {
    try {
      // Generate webhook URL based on current hostname
      const webhookUrl = `${window.location.protocol}//${window.location.host}/api/v1/webhooks/seapay`;
      
      setSeapaySettings(prev => ({
        ...prev,
        webhook_url: webhookUrl,
        api_key: 'seapay_api_key_' + Date.now(), // Generate unique API key
        merchant_id: 'MERCHANT_' + Date.now().toString().slice(-6),
      }));
    } catch (error) {
      console.error('Failed to generate SeaPay settings:', error);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Success',
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        bank_code: account.bank_code,
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_name: account.account_name,
        is_seapay_integrated: account.is_seapay_integrated,
        is_default: account.is_default
      });
    } else {
      setEditingAccount(null);
      setFormData({
        bank_code: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        is_seapay_integrated: false,
        is_default: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleBankSelection = (bankCode: string) => {
    const selectedBank = supportedBanks.find(bank => bank.code === bankCode);
    if (selectedBank) {
      setFormData(prev => ({
        ...prev,
        bank_code: bankCode,
        bank_name: selectedBank.short_name // Use short_name for consistent display
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingAccount 
        ? `/api/v1/payment-integration/bank-accounts/${editingAccount.account_id}`
        : '/api/v1/payment-integration/bank-accounts';
      
      const method = editingAccount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Bank account ${editingAccount ? 'updated' : 'created'} successfully`,
        });
        setIsDialogOpen(false);
        loadBankAccounts();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.detail || 'Failed to save bank account',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error saving bank account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/payment-integration/bank-accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Bank account deleted successfully',
        });
        loadBankAccounts();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.detail || 'Failed to delete bank account',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error deleting bank account',
        variant: 'destructive',
      });
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading bank accounts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Payment Integration Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure bank accounts and SeaPay integration for receiving payments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounts" className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Bank Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="seapay" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>SeaPay Integration</span>
          </TabsTrigger>
        </TabsList>

        {/* Bank Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Bank Accounts</h2>
              <p className="text-gray-600 text-sm">
                Manage your bank accounts for receiving payments
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Bank Account
            </Button>
          </div>

          {/* Bank Accounts Table */}
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>SeaPay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{account.bank_name}</div>
                    <div className="text-sm text-gray-500">{account.bank_code}</div>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{account.account_number}</TableCell>
                <TableCell>{account.account_name}</TableCell>
                <TableCell>
                  {account.is_seapay_integrated ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Integrated
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Integrated
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={account.status === 'active' ? 'default' : 'secondary'}
                    className={
                      account.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : account.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {account.is_default && (
                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                      Default
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(account)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(account.account_id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {accounts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No bank accounts configured. Add your first bank account to start receiving payments.
          </div>
        )}
      </div>
        </TabsContent>

        {/* SeaPay Integration Tab */}
        <TabsContent value="seapay" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">SeaPay Integration</h2>
            <p className="text-gray-600 text-sm">
              Configure your SeaPay webhook URL and API settings
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Webhook Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>Webhook Configuration</span>
                </CardTitle>
                <CardDescription>
                  Copy these details to your SeaPay dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <div className="flex mt-1 space-x-2">
                    <Input
                      id="webhook-url"
                      value={seapaySettings.webhook_url}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(seapaySettings.webhook_url, 'Webhook URL')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Configure this URL in your SeaPay merchant dashboard
                  </p>
                </div>

                <div>
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex mt-1 space-x-2">
                    <Input
                      id="api-key"
                      value={seapaySettings.api_key}
                      readOnly
                      className="font-mono text-sm"
                      type="password"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(seapaySettings.api_key, 'API Key')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use this key for authenticating webhook requests
                  </p>
                </div>

                <div>
                  <Label htmlFor="merchant-id">Merchant ID</Label>
                  <div className="flex mt-1 space-x-2">
                    <Input
                      id="merchant-id"
                      value={seapaySettings.merchant_id}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(seapaySettings.merchant_id, 'Merchant ID')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Integration Status</span>
                </CardTitle>
                <CardDescription>
                  Current SeaPay integration status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Environment</p>
                    <p className="text-sm text-gray-600">
                      {seapaySettings.environment === 'sandbox' ? 'Sandbox (Testing)' : 'Production'}
                    </p>
                  </div>
                  <Badge variant={seapaySettings.environment === 'sandbox' ? 'secondary' : 'default'}>
                    {seapaySettings.environment.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Webhook Status</p>
                    <p className="text-sm text-gray-600">
                      Ready to receive webhook notifications
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Integrated Banks</p>
                    <p className="text-sm text-gray-600">
                      {accounts.filter(a => a.is_seapay_integrated).length} of {accounts.length} banks
                    </p>
                  </div>
                  <Badge variant="outline">
                    {accounts.filter(a => a.is_seapay_integrated).length}/{accounts.length}
                  </Badge>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Setup Instructions</h4>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li>1. Copy the webhook URL above</li>
                    <li>2. Login to your SeaPay merchant dashboard</li>
                    <li>3. Navigate to Settings → Webhooks</li>
                    <li>4. Add the webhook URL and API key</li>
                    <li>5. Test the integration with a small transaction</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Bank Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
            </DialogTitle>
            <DialogDescription>
              Configure your bank account for receiving payments through SeaPay integration.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank_code">Bank</Label>
                <Select
                  value={formData.bank_code}
                  onValueChange={handleBankSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedBanks.filter(bank => bank.supported).map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.short_name} ({bank.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="Enter account number"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="account_name">Account Holder Name</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                placeholder="Enter account holder name"
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_seapay_integrated">SeaPay Integration</Label>
                <Switch
                  id="is_seapay_integrated"
                  checked={formData.is_seapay_integrated}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_seapay_integrated: checked }))}
                />
              </div>
              <p className="text-sm text-gray-500">
                Enable this to receive automatic payment notifications via SeaPay webhooks.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_default">Set as Default Account</Label>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
              />
            </div>


            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {editingAccount ? 'Update Account' : 'Add Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankAccountSettings;