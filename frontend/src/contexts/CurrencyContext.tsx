import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import CurrencyManager from '@/lib/currency';
import type { CurrencyInfo } from '@/lib/currency';

interface CurrencyContextType {
  currentCurrency: string;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number, currency?: string) => string;
  convertFromVND: (vndAmount: number, toCurrency?: string) => number;
  convertToVND: (amount: number, fromCurrency: string) => number;
  getDisplayCurrencies: () => string[];
  setDisplayCurrencies: (currencies: string[]) => void;
  availableCurrencies: CurrencyInfo[];
  exchangeRates: Record<string, number>;
  lastUpdated: Date;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
  defaultCurrency?: string;
}

export function CurrencyProvider({ children, defaultCurrency = 'VND' }: CurrencyProviderProps) {
  const [currentCurrency, setCurrentCurrency] = useState<string>(defaultCurrency);
  const [displayCurrencies, setDisplayCurrenciesState] = useState<string[]>(['VND', 'USD']);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load currency preference from localStorage
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency && CurrencyManager.getCurrencyInfo(savedCurrency)) {
      setCurrentCurrency(savedCurrency);
    }

    const savedDisplayCurrencies = localStorage.getItem('displayCurrencies');
    if (savedDisplayCurrencies) {
      try {
        const parsed = JSON.parse(savedDisplayCurrencies);
        if (Array.isArray(parsed)) {
          setDisplayCurrenciesState(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse saved display currencies:', error);
      }
    }

    // Load exchange rates
    setExchangeRates(CurrencyManager.getExchangeRates());
    setLastUpdated(CurrencyManager.getLastUpdated());
  }, []);

  const setCurrency = (currency: string) => {
    if (CurrencyManager.getCurrencyInfo(currency)) {
      setCurrentCurrency(currency);
      localStorage.setItem('preferredCurrency', currency);
    }
  };

  const setDisplayCurrencies = (currencies: string[]) => {
    const validCurrencies = currencies.filter(c => CurrencyManager.getCurrencyInfo(c));
    setDisplayCurrenciesState(validCurrencies);
    localStorage.setItem('displayCurrencies', JSON.stringify(validCurrencies));
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const targetCurrency = currency || currentCurrency;
    return CurrencyManager.format(amount, targetCurrency);
  };

  const convertFromVND = (vndAmount: number, toCurrency?: string) => {
    const targetCurrency = toCurrency || currentCurrency;
    return CurrencyManager.convertFromVND(vndAmount, targetCurrency);
  };

  const convertToVND = (amount: number, fromCurrency: string) => {
    return CurrencyManager.convertToVND(amount, fromCurrency);
  };

  const getDisplayCurrencies = () => {
    return displayCurrencies;
  };

  const value: CurrencyContextType = {
    currentCurrency,
    setCurrency,
    formatCurrency,
    convertFromVND,
    convertToVND,
    getDisplayCurrencies,
    setDisplayCurrencies,
    availableCurrencies: CurrencyManager.getAvailableCurrencies(),
    exchangeRates,
    lastUpdated,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export default CurrencyContext;