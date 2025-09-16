import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Clock, Sun, Moon, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import type { UseFormReturn } from 'react-hook-form';

interface ShiftPricingConfigProps {
  form: UseFormReturn<any>;
  pricingMode: 'traditional' | 'shift';
  dayShiftPrice: number;
  nightShiftPrice: number;
  fullDayPrice: number;
  weekendDayShiftPrice?: number;
  weekendNightShiftPrice?: number;
  weekendFullDayPrice?: number;
  holidayDayShiftPrice?: number;
  holidayNightShiftPrice?: number;
  holidayFullDayPrice?: number;
  dayShiftStartTime?: string;
  dayShiftEndTime?: string;
  nightShiftStartTime?: string;
  nightShiftEndTime?: string;
  onPricingModeChange: (mode: 'traditional' | 'shift') => void;
  onPriceChange: (field: string, value: number) => void;
  onTimeChange?: (field: string, value: string) => void;
}

export function ShiftPricingConfig({
  form,
  pricingMode,
  dayShiftPrice,
  nightShiftPrice,
  fullDayPrice,
  weekendDayShiftPrice,
  weekendNightShiftPrice,
  weekendFullDayPrice,
  holidayDayShiftPrice,
  holidayNightShiftPrice,
  holidayFullDayPrice,
  dayShiftStartTime = '09:00',
  dayShiftEndTime = '16:30',
  nightShiftStartTime = '17:30',
  nightShiftEndTime = '08:30',
  onPricingModeChange,
  onPriceChange,
  onTimeChange,
}: ShiftPricingConfigProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('rooms.shiftPricingConfiguration')}
        </CardTitle>
        <CardDescription>
          {t('rooms.shiftPricingDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pricing Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="pricing-mode">{t('rooms.pricingMode')}</Label>
            <p className="text-sm text-muted-foreground">
              {pricingMode === 'shift' 
                ? t('rooms.shiftPricingEnabled')
                : t('rooms.traditionalPricingEnabled')}
            </p>
          </div>
          <Switch
            id="pricing-mode"
            checked={pricingMode === 'shift'}
            onCheckedChange={(checked) => onPricingModeChange(checked ? 'shift' : 'traditional')}
          />
        </div>

        {pricingMode === 'shift' && (
          <>
            {/* Shift Times Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">{t('rooms.shiftTimes')}</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-yellow-500" />
                    <Label>{t('bookings.dayShift')}</Label>
                  </div>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="day_shift_start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              className="w-32"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="self-center">-</span>
                    <FormField
                      control={form.control}
                      name="day_shift_end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              className="w-32"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-blue-500" />
                    <Label>{t('bookings.nightShift')}</Label>
                  </div>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="night_shift_start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              className="w-32"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="self-center">-</span>
                    <FormField
                      control={form.control}
                      name="night_shift_end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              className="w-32"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t('rooms.nextDayEndTime')}</p>
                </div>
              </div>
            </div>

            {/* Shift Pricing Tabs */}
            <Tabs defaultValue="regular" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="regular">{t('rooms.regularPricing')}</TabsTrigger>
                <TabsTrigger value="weekend">{t('rooms.weekendPricing')}</TabsTrigger>
                <TabsTrigger value="holiday">{t('rooms.holidayPricing')}</TabsTrigger>
              </TabsList>

              <TabsContent value="regular" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="day-shift-price">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        {t('bookings.dayShift')}
                      </div>
                    </Label>
                    <Input
                      id="day-shift-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={dayShiftPrice}
                      onChange={(e) => onPriceChange('dayShiftPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">{t('rooms.dayShiftDuration')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="night-shift-price">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-blue-500" />
                        {t('bookings.nightShift')}
                      </div>
                    </Label>
                    <Input
                      id="night-shift-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={nightShiftPrice}
                      onChange={(e) => onPriceChange('nightShiftPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">{t('rooms.nightShiftDuration')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full-day-price">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        {t('bookings.fullDay')}
                      </div>
                    </Label>
                    <Input
                      id="full-day-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={fullDayPrice}
                      onChange={(e) => onPriceChange('fullDayPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">{t('rooms.fullDayDuration')}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="weekend" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('rooms.weekendPricingDescription')}
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="weekend-day-shift-price">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        {t('bookings.dayShift')}
                      </div>
                    </Label>
                    <Input
                      id="weekend-day-shift-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={weekendDayShiftPrice || ''}
                      onChange={(e) => onPriceChange('weekendDayShiftPrice', parseFloat(e.target.value) || 0)}
                      placeholder={t('rooms.useRegularPrice')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekend-night-shift-price">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-blue-500" />
                        {t('bookings.nightShift')}
                      </div>
                    </Label>
                    <Input
                      id="weekend-night-shift-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={weekendNightShiftPrice || ''}
                      onChange={(e) => onPriceChange('weekendNightShiftPrice', parseFloat(e.target.value) || 0)}
                      placeholder={t('rooms.useRegularPrice')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekend-full-day-price">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        {t('bookings.fullDay')}
                      </div>
                    </Label>
                    <Input
                      id="weekend-full-day-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={weekendFullDayPrice || ''}
                      onChange={(e) => onPriceChange('weekendFullDayPrice', parseFloat(e.target.value) || 0)}
                      placeholder={t('rooms.useRegularPrice')}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="holiday" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('rooms.holidayPricingDescription')}
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="holiday-day-shift-price">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        {t('bookings.dayShift')}
                      </div>
                    </Label>
                    <Input
                      id="holiday-day-shift-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={holidayDayShiftPrice || ''}
                      onChange={(e) => onPriceChange('holidayDayShiftPrice', parseFloat(e.target.value) || 0)}
                      placeholder={t('rooms.useRegularPrice')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday-night-shift-price">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-blue-500" />
                        {t('bookings.nightShift')}
                      </div>
                    </Label>
                    <Input
                      id="holiday-night-shift-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={holidayNightShiftPrice || ''}
                      onChange={(e) => onPriceChange('holidayNightShiftPrice', parseFloat(e.target.value) || 0)}
                      placeholder={t('rooms.useRegularPrice')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday-full-day-price">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        {t('bookings.fullDay')}
                      </div>
                    </Label>
                    <Input
                      id="holiday-full-day-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={holidayFullDayPrice || ''}
                      onChange={(e) => onPriceChange('holidayFullDayPrice', parseFloat(e.target.value) || 0)}
                      placeholder={t('rooms.useRegularPrice')}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Pricing Summary */}
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 text-sm font-medium">{t('rooms.pricingSummary')}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t('bookings.dayShift')} ({t('rooms.dayShiftHours')}):</span>
                  <span className="font-medium">{formatCurrency(dayShiftPrice, 'VND')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('bookings.nightShift')} ({t('rooms.nightShiftHours')}):</span>
                  <span className="font-medium">{formatCurrency(nightShiftPrice, 'VND')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('bookings.fullDay')} ({t('rooms.fullDayHours')}):</span>
                  <span className="font-medium">{formatCurrency(fullDayPrice, 'VND')}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}