import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { setCurrency } = useCurrency();

  // Get current flag based on selected language
  const getCurrentFlag = () => {
    return language === 'en' ? '🇬🇧' : '🇻🇳';
  };

  const handleLanguageChange = (lang: 'en' | 'vi') => {
    setLanguage(lang);
    // Auto-switch currency based on language
    const newCurrency = lang === 'vi' ? 'VND' : 'USD';
    setCurrency(newCurrency);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-lg px-2">
          {getCurrentFlag()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en')}
          className={language === 'en' ? 'bg-accent font-semibold' : ''}
        >
          <span className="mr-2 text-lg">🇬🇧</span>
          <span>English (USD)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('vi')}
          className={language === 'vi' ? 'bg-accent font-semibold' : ''}
        >
          <span className="mr-2 text-lg">🇻🇳</span>
          <span>Tiếng Việt (VND)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};