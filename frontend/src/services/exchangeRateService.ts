/**
 * Exchange Rate Management Service
 * Handles automatic synchronization with Vietcombank API
 * Manages exchange rate adjustments and preferences
 */

export interface ExchangeRateData {
  currencyName: string;
  currencyCode: string;
  cash: string;
  transfer: string;
  sell: string;
  icon: string;
}

export interface VietcombankResponse {
  Count: number;
  Date: string;
  UpdatedDate: string;
  Data: ExchangeRateData[];
}

export interface ExchangeRateSettings {
  autoSync: boolean;
  syncTime: string; // Format: "HH:MM"
  adjustments: Record<string, number>; // Currency code -> percentage adjustment
  lastSync: string; // ISO date string
  syncEnabled: boolean;
}

export interface ProcessedRate {
  currency: string;
  originalRate: number;
  adjustmentPercent: number;
  finalRate: number;
  lastUpdated: string;
}

class ExchangeRateService {
  private readonly STORAGE_KEY = 'exchangeRateSettings';
  private readonly VIETCOMBANK_API = 'https://www.vietcombank.com.vn/api/exchangerates';
  
  // Supported currencies that we want to sync
  private readonly SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];

  /**
   * Get current exchange rate settings
   */
  getSettings(): ExchangeRateSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Default settings
    return {
      autoSync: false,
      syncTime: '09:00', // 9 AM daily sync
      adjustments: {
        USD: 0,    // No adjustment by default
        EUR: 0,
        GBP: 0,
        JPY: 0
      },
      lastSync: '',
      syncEnabled: false
    };
  }

  /**
   * Save exchange rate settings
   */
  saveSettings(settings: ExchangeRateSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  /**
   * Fetch current exchange rates from Vietcombank API
   */
  async fetchRatesFromAPI(date?: string): Promise<VietcombankResponse> {
    const dateParam = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `${this.VIETCOMBANK_API}?date=${dateParam}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data: VietcombankResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      throw error;
    }
  }

  /**
   * Process raw API data and apply adjustments
   */
  processRates(apiData: VietcombankResponse, settings: ExchangeRateSettings): ProcessedRate[] {
    const processedRates: ProcessedRate[] = [];
    
    for (const currency of this.SUPPORTED_CURRENCIES) {
      const currencyData = apiData.Data.find(item => item.currencyCode === currency);
      
      if (currencyData) {
        const originalRate = parseFloat(currencyData.transfer);
        const adjustmentPercent = settings.adjustments[currency] || 0;
        const finalRate = originalRate * (100 + adjustmentPercent) / 100;
        
        processedRates.push({
          currency,
          originalRate,
          adjustmentPercent,
          finalRate,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    return processedRates;
  }

  /**
   * Sync rates and update currency manager
   */
  async syncRates(): Promise<ProcessedRate[]> {
    try {
      const settings = this.getSettings();
      const apiData = await this.fetchRatesFromAPI();
      const processedRates = this.processRates(apiData, settings);
      
      // Convert to format expected by CurrencyManager
      const ratesForManager: Record<string, number> = {
        VND: 1 // Base currency
      };
      
      processedRates.forEach(rate => {
        ratesForManager[rate.currency] = rate.finalRate;
      });
      
      // Import and update CurrencyManager
      const { default: CurrencyManager } = await import('@/lib/currency');
      CurrencyManager.updateExchangeRates(ratesForManager);
      
      // Save rates to database via API
      await this.saveRatesToDatabase(processedRates);
      
      // Update last sync time
      settings.lastSync = new Date().toISOString();
      this.saveSettings(settings);
      
      return processedRates;
    } catch (error) {
      console.error('Failed to sync exchange rates:', error);
      throw error;
    }
  }

  /**
   * Save exchange rates to database via API
   */
  async saveRatesToDatabase(rates: ProcessedRate[]): Promise<void> {
    try {
      const { api } = await import('@/lib/api');
      const settings = this.getSettings();
      
      // Build rates object for bulk update
      const ratesData: Record<string, any> = {};
      rates.forEach(rate => {
        ratesData[rate.currency] = {
          code: rate.currency,
          rate: rate.finalRate,
          name: this.getCurrencyName(rate.currency),
          symbol: this.getCurrencySymbol(rate.currency)
        };
      });
      
      // Update all rates at once, including auto_update status
      await api.put('/currency/config', {
        rates: ratesData,
        auto_update: settings.autoSync && settings.syncEnabled,
        update_frequency: settings.autoSync ? 'daily' : 'manual'
      });
      
      console.log('Exchange rates saved to database successfully');
    } catch (error) {
      console.error('Failed to save exchange rates to database:', error);
      // Don't throw - we still want to update local rates even if DB save fails
    }
  }

  /**
   * Get currency name
   */
  private getCurrencyName(code: string): string {
    const names: Record<string, string> = {
      'USD': 'US Dollar',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'JPY': 'Japanese Yen'
    };
    return names[code] || code;
  }

  /**
   * Get currency symbol
   */
  private getCurrencySymbol(code: string): string {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥'
    };
    return symbols[code] || code;
  }

  /**
   * Set up automatic daily sync
   */
  setupAutoSync(): void {
    const settings = this.getSettings();
    
    if (!settings.autoSync || !settings.syncEnabled) {
      this.clearAutoSync();
      return;
    }

    // Clear existing interval
    this.clearAutoSync();
    
    const [hours, minutes] = settings.syncTime.split(':').map(Number);
    const now = new Date();
    const syncTime = new Date();
    syncTime.setHours(hours, minutes, 0, 0);
    
    // If sync time has passed today, schedule for tomorrow
    if (syncTime <= now) {
      syncTime.setDate(syncTime.getDate() + 1);
    }
    
    const msUntilSync = syncTime.getTime() - now.getTime();
    
    // Set timeout for first sync
    setTimeout(() => {
      this.syncRates().catch(console.error);
      
      // Set daily interval
      const intervalId = setInterval(() => {
        this.syncRates().catch(console.error);
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      // Store interval ID for cleanup
      (window as any).__exchangeRateSyncInterval = intervalId;
    }, msUntilSync);
  }

  /**
   * Clear automatic sync
   */
  clearAutoSync(): void {
    if ((window as any).__exchangeRateSyncInterval) {
      clearInterval((window as any).__exchangeRateSyncInterval);
      delete (window as any).__exchangeRateSyncInterval;
    }
  }

  /**
   * Get human-readable status of sync
   */
  getSyncStatus(): {
    isEnabled: boolean;
    lastSync: string;
    nextSync: string;
    status: 'active' | 'disabled' | 'error';
  } {
    const settings = this.getSettings();
    
    if (!settings.autoSync || !settings.syncEnabled) {
      return {
        isEnabled: false,
        lastSync: settings.lastSync || 'Never',
        nextSync: 'Disabled',
        status: 'disabled'
      };
    }
    
    const [hours, minutes] = settings.syncTime.split(':').map(Number);
    const nextSync = new Date();
    nextSync.setHours(hours, minutes, 0, 0);
    
    // If sync time has passed today, schedule for tomorrow
    if (nextSync <= new Date()) {
      nextSync.setDate(nextSync.getDate() + 1);
    }
    
    return {
      isEnabled: true,
      lastSync: settings.lastSync ? new Date(settings.lastSync).toLocaleString() : 'Never',
      nextSync: nextSync.toLocaleString(),
      status: 'active'
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.fetchRatesFromAPI();
      return true;
    } catch {
      return false;
    }
  }
}

export const exchangeRateService = new ExchangeRateService();
export default exchangeRateService;