import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherEnhanced } from '@/components/LanguageSwitcherEnhanced';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const LanguageDemo: React.FC = () => {
  const { language, t, formatCurrency } = useLanguage();

  const demoKeys = [
    { category: 'Navigation', keys: [
      'navigation.dashboard',
      'navigation.rooms',
      'navigation.bookings',
      'navigation.customers',
      'navigation.billing',
      'navigation.pos',
      'navigation.reports',
    ]},
    { category: 'Authentication', keys: [
      'auth.login',
      'auth.logout',
      'auth.email',
      'auth.password',
      'auth.loginSuccess',
      'auth.hotelManagementSystem',
    ]},
    { category: 'Dashboard', keys: [
      'dashboard.title',
      'dashboard.totalRooms',
      'dashboard.occupancyRate',
      'dashboard.todayRevenue',
      'dashboard.todayCheckIns',
      'dashboard.todayCheckOuts',
    ]},
    { category: 'Common', keys: [
      'common.save',
      'common.cancel',
      'common.edit',
      'common.delete',
      'common.search',
      'common.loading',
    ]},
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Language Translation Demo</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Current Language: <strong>{language === 'en' ? 'English' : 'Tiếng Việt'}</strong></span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Enhanced:</span>
            <LanguageSwitcherEnhanced />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Simple:</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demoKeys.map((section) => (
          <Card key={section.category}>
            <CardHeader>
              <CardTitle>{section.category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {section.keys.map((key) => (
                  <div key={key} className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm font-mono text-gray-500">{key}</span>
                    <span className="text-sm font-medium">{t(key)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currency Formatting Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">VND (Vietnamese Dong)</h3>
              <div className="space-y-1">
                <p>{formatCurrency(1000000, 'VND')}</p>
                <p>{formatCurrency(50000, 'VND')}</p>
                <p>{formatCurrency(2500000, 'VND')}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">USD (US Dollar)</h3>
              <div className="space-y-1">
                <p>{formatCurrency(100, 'USD')}</p>
                <p>{formatCurrency(1250.50, 'USD')}</p>
                <p>{formatCurrency(999.99, 'USD')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Translation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-green-700">
            <p className="mb-2">✅ English translations: Complete</p>
            <p className="mb-2">✅ Vietnamese translations: Complete</p>
            <p className="mb-2">✅ Language switcher: Flag-based display 🇬🇧 🇻🇳</p>
            <p className="mb-2">✅ Currency formatting: Localized</p>
            <p className="mb-2">✅ Navigation, Authentication, Dashboard, and all major modules translated</p>
            <p>✅ Current language flag shown in button instead of globe icon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};