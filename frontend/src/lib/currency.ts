/**
 * Currency Management System
 * Base currency: VND (Vietnamese Dong)
 * Supports multiple currencies with exchange rate conversion
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimal: number;
  rate: number; // Exchange rate to VND (base currency)
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  VND: {
    code: 'VND',
    symbol: '₫',
    name: 'Vietnamese Dong',
    decimal: 0,
    rate: 1, // Base currency
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimal: 2,
    rate: 0.00004, // 1 VND = 0.00004 USD (example rate)
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimal: 2,
    rate: 0.000037, // 1 VND = 0.000037 EUR (example rate)
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimal: 2,
    rate: 0.000032, // 1 VND = 0.000032 GBP (example rate)
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimal: 0,
    rate: 0.006, // 1 VND = 0.006 JPY (example rate)
  }
};

export class CurrencyManager {
  private static exchangeRates: Record<string, number> = {
    VND: 1,
    USD: 25000,  // 1 USD = 25,000 VND
    EUR: 27000,  // 1 EUR = 27,000 VND
    GBP: 31000,  // 1 GBP = 31,000 VND
    JPY: 167,    // 1 JPY = 167 VND
  };

  private static lastUpdated: Date = new Date();

  /**
   * Get current exchange rate from base currency (VND) to target currency
   */
  static getExchangeRate(toCurrency: string): number {
    if (toCurrency === 'VND') return 1;
    return 1 / (this.exchangeRates[toCurrency] || 1);
  }

  /**
   * Convert amount from VND to target currency
   */
  static convertFromVND(amount: number, toCurrency: string): number {
    if (toCurrency === 'VND') return amount;
    const rate = this.getExchangeRate(toCurrency);
    return amount * rate;
  }

  /**
   * Convert amount from source currency to VND
   */
  static convertToVND(amount: number, fromCurrency: string): number {
    if (fromCurrency === 'VND') return amount;
    const rate = this.exchangeRates[fromCurrency] || 1;
    return amount * rate;
  }

  /**
   * Convert amount between two currencies
   */
  static convert(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;
    
    // Convert to VND first, then to target currency
    const vndAmount = this.convertToVND(amount, fromCurrency);
    return this.convertFromVND(vndAmount, toCurrency);
  }

  /**
   * Format currency amount with proper symbol and decimal places
   */
  static format(amount: number, currency: string = 'VND', locale: string = 'vi-VN'): string {
    const currencyInfo = CURRENCIES[currency];
    if (!currencyInfo) {
      // Fallback for unknown currencies
      return `${amount.toLocaleString(locale)} ${currency}`;
    }

    // Use appropriate locale based on currency
    const formatLocale = currency === 'VND' ? 'vi-VN' : 
                        currency === 'USD' ? 'en-US' :
                        currency === 'EUR' ? 'de-DE' :
                        currency === 'GBP' ? 'en-GB' :
                        currency === 'JPY' ? 'ja-JP' : locale;

    try {
      return new Intl.NumberFormat(formatLocale, {
        style: 'currency',
        currency: currencyInfo.code,
        minimumFractionDigits: currencyInfo.decimal,
        maximumFractionDigits: currencyInfo.decimal,
      }).format(amount);
    } catch (error) {
      // Fallback formatting if Intl.NumberFormat fails
      return `${currencyInfo.symbol} ${amount.toLocaleString(locale, {
        minimumFractionDigits: currencyInfo.decimal,
        maximumFractionDigits: currencyInfo.decimal,
      })}`;
    }
  }

  /**
   * Format amount in multiple currencies for comparison
   */
  static formatMultiple(vndAmount: number, currencies: string[] = ['VND', 'USD']): Record<string, string> {
    const result: Record<string, string> = {};
    currencies.forEach(currency => {
      const amount = this.convertFromVND(vndAmount, currency);
      result[currency] = this.format(amount, currency);
    });
    return result;
  }

  /**
   * Update exchange rates (normally would fetch from API)
   */
  static updateExchangeRates(rates: Record<string, number>): void {
    this.exchangeRates = { ...this.exchangeRates, ...rates };
    this.lastUpdated = new Date();
  }

  /**
   * Get all available currencies
   */
  static getAvailableCurrencies(): CurrencyInfo[] {
    return Object.values(CURRENCIES);
  }

  /**
   * Get currency info
   */
  static getCurrencyInfo(code: string): CurrencyInfo | null {
    return CURRENCIES[code] || null;
  }

  /**
   * Get current exchange rates
   */
  static getExchangeRates(): Record<string, number> {
    return { ...this.exchangeRates };
  }

  /**
   * Get last updated timestamp
   */
  static getLastUpdated(): Date {
    return this.lastUpdated;
  }
}

/**
 * Hook for easy currency formatting in React components
 */
export const useCurrency = (locale: string = 'vi-VN') => {
  const formatCurrency = (amount: number, currency: string = 'VND') => {
    return CurrencyManager.format(amount, currency, locale);
  };

  const convertAndFormat = (vndAmount: number, toCurrency: string = 'VND') => {
    const convertedAmount = CurrencyManager.convertFromVND(vndAmount, toCurrency);
    return CurrencyManager.format(convertedAmount, toCurrency, locale);
  };

  return {
    format: formatCurrency,
    convertAndFormat,
    convert: CurrencyManager.convert,
    getAvailableCurrencies: CurrencyManager.getAvailableCurrencies,
    formatMultiple: CurrencyManager.formatMultiple,
  };
};

export default CurrencyManager;