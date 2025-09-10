import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  RefreshCw, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import exchangeRateService from '@/services/exchangeRateService';
import type { ExchangeRateSettings, ProcessedRate } from '@/services/exchangeRateService';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function ExchangeRateManagement() {
  const [settings, setSettings] = useState<ExchangeRateSettings | null>(null);
  const [processedRates, setProcessedRates] = useState<ProcessedRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [manualRates, setManualRates] = useState<Record<string, number>>({});
  
  const { toast } = useToast();
  const { exchangeRates, lastUpdated, getDisplayCurrencies } = useCurrency();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadSyncStatus();
    testConnection();
    // Initialize manual rates with current exchange rates
    setManualRates({ ...exchangeRates });
  }, []);

  const loadSettings = () => {
    const loadedSettings = exchangeRateService.getSettings();
    setSettings(loadedSettings);
  };

  const loadSyncStatus = () => {
    const status = exchangeRateService.getSyncStatus();
    setSyncStatus(status);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const isConnected = await exchangeRateService.testConnection();
      setConnectionStatus(isConnected);
    } catch (error) {
      setConnectionStatus(false);
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = (newSettings: ExchangeRateSettings) => {
    exchangeRateService.saveSettings(newSettings);
    setSettings(newSettings);
    
    // Setup or clear auto sync based on settings
    if (newSettings.autoSync && newSettings.syncEnabled) {
      exchangeRateService.setupAutoSync();
    } else {
      exchangeRateService.clearAutoSync();
    }
    
    loadSyncStatus();
    toast({
      title: "Settings Saved",
      description: "Exchange rate settings have been updated successfully.",
    });
  };

  const handleSyncNow = async () => {
    if (!settings) return;
    
    setLoading(true);
    try {
      const rates = await exchangeRateService.syncRates();
      setProcessedRates(rates);
      loadSyncStatus();
      
      toast({
        title: "Sync Successful",
        description: `Updated exchange rates for ${rates.length} currencies.`,
      });
    } catch (error) {
      toast({
        title: "Sync Failed", 
        description: "Failed to sync exchange rates. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentChange = (currency: string, value: string) => {
    if (!settings) return;
    
    const numValue = parseFloat(value) || 0;
    const newSettings = {
      ...settings,
      adjustments: {
        ...settings.adjustments,
        [currency]: numValue
      }
    };
    
    setSettings(newSettings);
    
    // Auto-save when sync is on and update currency manager
    if (settings.autoSync) {
      saveSettings(newSettings);
      
      // Also update the currency manager immediately with new calculated rates
      const updateCurrencyManager = async () => {
        const { default: CurrencyManager } = await import('@/lib/currency');
        const updatedRates: Record<string, number> = { VND: 1 };
        
        // Calculate final rates for all currencies using the new adjustment
        Object.keys(settings.adjustments).forEach(curr => {
          const originalRate = exchangeRates[curr];
          const adj = curr === currency ? numValue : (settings.adjustments[curr] || 0);
          updatedRates[curr] = originalRate * (100 + adj) / 100;
        });
        
        CurrencyManager.updateExchangeRates(updatedRates);
      };
      
      updateCurrencyManager().catch(console.error);
    }
  };

  const handleManualRateChange = (currency: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setManualRates(prev => ({
      ...prev,
      [currency]: numValue
    }));
  };

  const saveManualRates = async () => {
    if (!settings) return;
    
    try {
      // Import and update CurrencyManager with manual rates
      const { default: CurrencyManager } = await import('@/lib/currency');
      const ratesToSave = { VND: 1, ...manualRates };
      CurrencyManager.updateExchangeRates(ratesToSave);
      
      toast({
        title: "Rates Saved",
        description: "Manual exchange rates have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save manual rates. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency === 'VND' ? 'VND' : currency,
      minimumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(amount);
  };

  if (!settings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exchange Rate Management</h1>
          <p className="text-muted-foreground">
            Manage automatic synchronization with Vietcombank and adjust exchange rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus ? "success" : "destructive"} className="flex items-center gap-1">
            {testing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : connectionStatus ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {connectionStatus ? 'API Connected' : 'API Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Exchange Rate Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Exchange Rate</CardTitle>
            <CardDescription>
              Latest exchange rates fetched from the API with applied adjustments
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-sync"
                checked={settings.autoSync}
                onCheckedChange={(checked) => 
                  saveSettings({ ...settings, autoSync: checked, syncEnabled: checked })
                }
              />
              <Label htmlFor="auto-sync" className="text-sm font-medium cursor-pointer">
                Auto Sync
              </Label>
            </div>
            {settings.autoSync && (
              <Button
                onClick={handleSyncNow}
                disabled={loading || !connectionStatus}
                size="sm"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Now
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 w-24">Currency</th>
                  <th className="text-right p-3 w-28">Original Rate</th>
                  <th className="text-right p-3 w-28">Adjustment</th>
                  <th className="text-right p-3 w-28">Final Rate</th>
                  <th className="text-right p-3 w-24">Updated</th>
                </tr>
              </thead>
              <tbody>
                {/* VND Base Currency Row */}
                <tr className="border-b bg-blue-50 dark:bg-blue-900/20">
                  <td className="p-3">
                    <div className="flex items-center">
                      <span className="font-mono font-medium">VND</span>
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">Base Currency</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono">1</td>
                  <td className="p-3 text-right">
                    <span className="text-muted-foreground text-sm">-</span>
                  </td>
                  <td className="p-3 text-right font-mono font-semibold">1</td>
                  <td className="p-3 text-right text-sm text-muted-foreground">
                    {lastUpdated.toLocaleTimeString()}
                  </td>
                </tr>
                
                {Object.entries(exchangeRates).map(([currency]) => {
                  if (currency === 'VND') return null;
                  
                  const rate = processedRates.find(r => r.currency === currency);
                  const originalRate = rate?.originalRate || exchangeRates[currency];
                  const adjustment = settings.adjustments[currency] || 0;
                  const finalRate = settings.autoSync 
                    ? originalRate * (100 + adjustment) / 100
                    : (manualRates[currency] || exchangeRates[currency]);
                  
                  return (
                    <tr key={currency} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <span className="font-mono font-medium">{currency}</span>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(originalRate, 'VND')}
                      </td>
                      <td className="p-3 text-right">
                        {settings.autoSync ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              value={adjustment}
                              onChange={(e) => handleAdjustmentChange(currency, e.target.value)}
                              className="w-14 text-center text-xs"
                              placeholder="0.0"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {settings.autoSync ? (
                          <span className="font-mono font-semibold">
                            {formatCurrency(finalRate, 'VND')}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="100"
                              value={manualRates[currency] || exchangeRates[currency]}
                              onChange={(e) => handleManualRateChange(currency, e.target.value)}
                              className="w-20 text-right font-mono text-xs"
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">₫</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right text-sm text-muted-foreground">
                        {rate ? new Date(rate.lastUpdated).toLocaleTimeString() : lastUpdated.toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {!settings.autoSync && (
            <div className="flex justify-end mt-4">
              <Button onClick={saveManualRates}>
                Save
              </Button>
            </div>
          )}
          
          <div className="mt-4 text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
            {settings.autoSync && (
              <span className="ml-4">
                • Auto-sync enabled - rates update daily at {settings.syncTime}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}