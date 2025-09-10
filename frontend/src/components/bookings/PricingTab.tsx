import React from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card'
import { 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '../ui/form'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Separator } from '../ui/separator'
import { Loader2 } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'

interface PricingTabProps {
  form: any // Simplified type to avoid import issues
  totals: any
  priceDetails: any
  calculatingPrice: boolean
  t: (key: string) => string
  selectedCurrency?: string
}

export function PricingTab({ form, totals, priceDetails, calculatingPrice, t, selectedCurrency }: PricingTabProps) {
  const { formatCurrency, convertFromVND } = useCurrency()
  
  // Helper function to format prices in selected currency
  const formatPrice = (vndAmount: number) => {
    const currency = selectedCurrency || 'VND'
    if (currency === 'VND') {
      return formatCurrency(vndAmount, 'VND')
    } else {
      const convertedAmount = convertFromVND(vndAmount, currency)
      return formatCurrency(convertedAmount, currency)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('common.pricingDetails')}</CardTitle>
        <CardDescription>
          {calculatingPrice ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('bookings.calculatingPrice')}
            </span>
          ) : (
            t('bookings.configurePricing')
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Pricing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('bookings.roomCharges')}</h3>
          
          {/* Base Room Rate - Read Only */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('bookings.baseRate')}</label>
              <div className="p-2 bg-gray-50 rounded-md">
                {totals.selectedRoomType ? (
                  <span className="text-sm">
                    {formatPrice(Number(totals.selectedRoomType.base_price || 0))}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">{t('bookings.selectRoomType')}</span>
                )}
              </div>
            </div>
            
            {totals.selectedRoomType?.weekend_price && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('bookings.weekendRate')}</label>
                <div className="p-2 bg-gray-50 rounded-md">
                  <span className="text-sm">
                    {formatPrice(Number(totals.selectedRoomType.weekend_price))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Night Breakdown */}
          {totals.nights > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t('bookings.totalNights')}:</span>
                  <span className="font-medium">{totals.nights}</span>
                </div>
                {totals.weekdayNights > 0 && (
                  <div className="flex justify-between">
                    <span>{t('bookings.weekdayNights')}:</span>
                    <span>{totals.weekdayNights} x {formatPrice(Number(totals.selectedRoomType?.base_price || 0))}</span>
                  </div>
                )}
                {totals.weekendNights > 0 && (
                  <div className="flex justify-between">
                    <span>{t('bookings.weekendNights')} (Fri-Sat):</span>
                    <span>{totals.weekendNights} x {formatPrice(Number(totals.selectedRoomType?.weekend_price || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>{t('bookings.totalRoomCharge')}:</span>
                  <span>{formatPrice(totals.roomCharge)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Extra Charges Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('bookings.extraCharges')}</h3>
          
          {/* Occupancy Configuration Display */}
          {totals.selectedRoomType && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Room Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Standard Adults:</span>
                    <span className="font-medium">{(totals.selectedRoomType as any)?.standard_adults_occupancy || totals.selectedRoomType?.standard_occupancy || 2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard Children:</span>
                    <span className="font-medium">{(totals.selectedRoomType as any)?.standard_children_occupancy || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Adults:</span>
                    <span className="font-medium">{totals.selectedRoomType?.max_adults || totals.selectedRoomType?.max_occupancy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Children:</span>
                    <span className="font-medium">{totals.selectedRoomType?.max_children || 0}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Extra Adult Charge:</span>
                    <span className="font-medium">{formatPrice(Number(totals.selectedRoomType?.extra_adult_charge || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra Child Charge:</span>
                    <span className="font-medium">{formatPrice(Number(totals.selectedRoomType?.extra_child_charge || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Single Bed Charge:</span>
                    <span className="font-medium">{formatPrice(Number((totals.selectedRoomType as any)?.extra_single_bed_charge || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Double Bed Charge:</span>
                    <span className="font-medium">{formatPrice(Number((totals.selectedRoomType as any)?.extra_double_bed_charge || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Current Booking Breakdown */}
          {totals.selectedRoomType && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3">Current Booking Analysis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Guests:</span>
                  <span className="font-medium">{(form.watch('adults') || 0) + (form.watch('children') || 0)} ({form.watch('adults') || 0} adults, {form.watch('children') || 0} children)</span>
                </div>
                
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span>Extra Adults:</span>
                    <span className="font-medium text-orange-600">
                      {Math.max(0, (form.watch('adults') || 0) - ((totals.selectedRoomType as any)?.standard_adults_occupancy || totals.selectedRoomType?.standard_occupancy || 2))}
                      {Math.max(0, (form.watch('adults') || 0) - ((totals.selectedRoomType as any)?.standard_adults_occupancy || totals.selectedRoomType?.standard_occupancy || 2)) > 0 && 
                        ` x ${formatPrice(Number(totals.selectedRoomType?.extra_adult_charge || 0))}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra Children:</span>
                    <span className="font-medium text-orange-600">
                      {Math.max(0, (form.watch('children') || 0) - ((totals.selectedRoomType as any)?.standard_children_occupancy || 0))}
                      {Math.max(0, (form.watch('children') || 0) - ((totals.selectedRoomType as any)?.standard_children_occupancy || 0)) > 0 && 
                        ` x ${formatPrice(Number(totals.selectedRoomType?.extra_child_charge || 0))}`
                      }
                    </span>
                  </div>
                </div>
                
                {(totals.extraSingleBeds > 0 || totals.extraDoubleBeds > 0) && (
                  <div className="pt-2 border-t space-y-1">
                    {totals.extraSingleBeds > 0 && (
                      <div className="flex justify-between">
                        <span>Single Beds Needed:</span>
                        <span className="font-medium text-green-600">{totals.extraSingleBeds} x {formatPrice(Number((totals.selectedRoomType as any)?.extra_single_bed_charge || 0))}</span>
                      </div>
                    )}
                    
                    {totals.extraDoubleBeds > 0 && (
                      <div className="flex justify-between">
                        <span>Double Beds Needed:</span>
                        <span className="font-medium text-green-600">{totals.extraDoubleBeds} x {formatPrice(Number((totals.selectedRoomType as any)?.extra_double_bed_charge || 0))}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Total Extra Charges Summary */}
                {(totals.extraPersonTotal > 0 || totals.extraBedTotal > 0) && (
                  <div className="pt-2 border-t border-blue-200 space-y-1">
                    {totals.extraPersonTotal > 0 && (
                      <div className="flex justify-between font-medium">
                        <span>Extra Person Charges:</span>
                        <span className="text-blue-600">{formatPrice(totals.extraPersonTotal)}</span>
                      </div>
                    )}
                    {totals.extraBedTotal > 0 && (
                      <div className="flex justify-between font-medium">
                        <span>Extra Bed Charges:</span>
                        <span className="text-blue-600">{formatPrice(totals.extraBedTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-1 border-t border-blue-300">
                      <span>Total Extra Charges:</span>
                      <span className="text-blue-700">{formatPrice(totals.extraPersonTotal + totals.extraBedTotal)}</span>
                    </div>
                  </div>
                )}
                
                {!totals.extraPersonTotal && !totals.extraBedTotal && (
                  <div className="pt-2 border-t text-green-600 font-medium">
                    ✓ No extra charges - within standard occupancy
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Service Charges - Keep this as manual input */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="service_charges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bookings.serviceCharges')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Discount Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('bookings.discount')}</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="discount_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bookings.discountType')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">{t('bookings.percentage')}</SelectItem>
                      <SelectItem value="amount">{t('bookings.fixedAmount')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('discount_type') === 'percentage' ? t('bookings.discountPercentage') : t('bookings.discountAmount')}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      max={form.watch('discount_type') === 'percentage' ? 100 : undefined}
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bookings.discountReason')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Tax Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('bookings.tax')}</h3>
          
          <FormField
            control={form.control}
            name="tax_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('bookings.taxPercentage')}</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      min="0"
                      max="100"
                      step="0.1"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </FormControl>
                <FormDescription>
                  {t('bookings.taxDefaultZero')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Deposit Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('bookings.deposit')}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Suggested Deposit Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('bookings.suggestedDeposit')}</label>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {formatPrice(Math.round(totals.total * 0.3))}
                </span>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  30% {t('bookings.ofTotalAmount')}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('bookings.depositWillBeRequiredAtBooking')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="deposit_paid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bookings.depositPaid')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('bookings.amountAlreadyPaid')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Total Cost Breakdown */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
          <h3 className="text-lg font-semibold mb-3">{t('bookings.costBreakdown')}</h3>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{t('bookings.roomCharge')}:</span>
              <span>{formatPrice(totals.roomCharge)}</span>
            </div>
            
            {totals.extraPersonTotal > 0 && (
              <div className="flex justify-between">
                <span>{t('bookings.extraPersonCharge')} ({((form.watch('adults') || 0) + (form.watch('children') || 0) - (totals.selectedRoomType?.standard_occupancy || 0))} x {formatPrice(Number(totals.selectedRoomType?.extra_adult_charge || 0))} x {totals.nights} {t('bookings.nights')}):</span>
                <span>{formatPrice(totals.extraPersonTotal)}</span>
              </div>
            )}
            
            {totals.extraBedTotal > 0 && (
              <div className="flex justify-between">
                <span>
                  {t('bookings.extraBedCharge')} (
                  {totals.extraSingleBeds > 0 && `${totals.extraSingleBeds} ${t('bookings.singleBed')} x ${formatPrice(Number(totals.selectedRoomType?.extra_single_bed_charge || 0))}`}
                  {totals.extraSingleBeds > 0 && totals.extraDoubleBeds > 0 && ', '}
                  {totals.extraDoubleBeds > 0 && `${totals.extraDoubleBeds} ${t('bookings.doubleBed')} x ${formatPrice(Number(totals.selectedRoomType?.extra_double_bed_charge || 0))}`}
                  {' x '}{totals.nights} {t('bookings.nights')}):
                </span>
                <span>{formatPrice(totals.extraBedTotal)}</span>
              </div>
            )}
            
            {form.watch('service_charges') > 0 && (
              <div className="flex justify-between">
                <span>{t('bookings.serviceCharges')}:</span>
                <span>{formatPrice(form.watch('service_charges'))}</span>
              </div>
            )}
            
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">{t('common.subtotal')}:</span>
              <span className="font-medium">{formatPrice(totals.subtotal)}</span>
            </div>
            
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  {t('bookings.discount')} 
                  {form.watch('discount_type') === 'percentage' && ` (${form.watch('discount_value')}%)`}
                  :
                </span>
                <span>-{formatPrice(totals.discountAmount)}</span>
              </div>
            )}
            
            {totals.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>{t('bookings.tax')} ({form.watch('tax_percentage')}%):</span>
                <span>{formatPrice(totals.taxAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{t('bookings.totalAmount')}:</span>
              <span>{formatPrice(totals.total)}</span>
            </div>
            
            <div className="flex justify-between text-sm pt-2">
              <span>{t('bookings.suggestedDeposit')} (30%):</span>
              <span className="font-medium text-blue-600">
                {formatPrice(Math.round(totals.total * 0.3))}
              </span>
            </div>
            
            {form.watch('deposit_paid') > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span>{t('bookings.depositPaid')}:</span>
                  <span className="font-medium text-green-600">
                    {formatPrice(form.watch('deposit_paid') || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>{t('bookings.balanceDue')}:</span>
                  <span className="font-medium text-red-600">
                    {formatPrice(totals.total - (form.watch('deposit_paid') || 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}