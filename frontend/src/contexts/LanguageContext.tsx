import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Language } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'vi';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    // Only return value if it's a string, otherwise return the key
    let result = typeof value === 'string' ? value : key;
    
    // Handle parameter interpolation
    if (params && typeof result === 'string') {
      Object.keys(params).forEach(param => {
        const placeholder = `{${param}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(params[param]));
      });
    }
    
    return result;
  };

  const formatCurrency = (amount: number, currency: string = 'VND'): string => {
    const locale = language === 'vi' ? 'vi-VN' : 'en-US';
    
    const currencyMap: Record<string, string> = {
      VND: 'VND',
      USD: 'USD',
      EUR: 'EUR',
      GBP: 'GBP'
    };

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyMap[currency] || 'VND',
      minimumFractionDigits: currency === 'VND' ? 0 : 2,
      maximumFractionDigits: currency === 'VND' ? 0 : 2
    }).format(amount);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};