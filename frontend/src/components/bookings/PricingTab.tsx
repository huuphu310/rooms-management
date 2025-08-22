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

interface PricingTabProps {
  form: any // Simplified type to avoid import issues
  totals: any
  priceDetails: any
  calculatingPrice: boolean
  t: (key: string) => string
}

export function PricingTab({ form, totals, priceDetails, calculatingPrice, t }: PricingTabProps) {
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
                    {t('common.currency')} {Number(totals.selectedRoomType.base_price || 0).toLocaleString()}
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
                    {t('common.currency')} {Number(totals.selectedRoomType.weekend_price).toLocaleString()}
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
                    <span>{totals.weekdayNights} x {Number(totals.selectedRoomType?.base_price || 0).toLocaleString()}</span>
                  </div>
                )}
                {totals.weekendNights > 0 && (
                  <div className="flex justify-between">
                    <span>{t('bookings.weekendNights')} (Fri-Sat):</span>
                    <span>{totals.weekendNights} x {Number(totals.selectedRoomType?.weekend_price || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>{t('bookings.totalRoomCharge')}:</span>
                  <span>{t('common.currency')} {totals.roomCharge.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Extra Charges Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('bookings.extraCharges')}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Extra Person */}
            <FormField
              control={form.control}
              name="extra_persons"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bookings.extraPersons')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  {totals.selectedRoomType?.extra_adult_charge && (
                    <FormDescription>
                      {t('common.currency')} {Number(totals.selectedRoomType.extra_adult_charge).toLocaleString()} {t('bookings.perPersonPerNight')}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Extra Bed */}
            <FormField
              control={form.control}
              name="extra_beds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bookings.extraBeds')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  {totals.selectedRoomType?.extra_child_charge && (
                    <FormDescription>
                      {t('common.currency')} {Number(totals.selectedRoomType.extra_child_charge).toLocaleString()} {t('bookings.perBedPerNight')}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Charges */}
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
                    {t('bookings.defaultDepositPercentage')}: {t('common.currency')} {totals.depositRequired.toLocaleString()} (20%)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('bookings.depositRequired')}</label>
              <div className="p-2 bg-gray-50 rounded-md">
                <span className="text-sm font-medium">
                  {t('common.currency')} {totals.depositRequired.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('bookings.forStaffReference')}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Total Cost Breakdown */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
          <h3 className="text-lg font-semibold mb-3">{t('bookings.costBreakdown')}</h3>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{t('bookings.roomCharge')}:</span>
              <span>{t('common.currency')} {totals.roomCharge.toLocaleString()}</span>
            </div>
            
            {totals.extraPersonTotal > 0 && (
              <div className="flex justify-between">
                <span>{t('bookings.extraPersonCharge')} ({form.watch('extra_persons')} x {Number(totals.selectedRoomType?.extra_adult_charge || 0).toLocaleString()} x {totals.nights} {t('bookings.nights')}):</span>
                <span>{t('common.currency')} {totals.extraPersonTotal.toLocaleString()}</span>
              </div>
            )}
            
            {totals.extraBedTotal > 0 && (
              <div className="flex justify-between">
                <span>{t('bookings.extraBedCharge')} ({form.watch('extra_beds')} x {Number(totals.selectedRoomType?.extra_child_charge || 0).toLocaleString()} x {totals.nights} {t('bookings.nights')}):</span>
                <span>{t('common.currency')} {totals.extraBedTotal.toLocaleString()}</span>
              </div>
            )}
            
            {form.watch('service_charges') > 0 && (
              <div className="flex justify-between">
                <span>{t('bookings.serviceCharges')}:</span>
                <span>{t('common.currency')} {form.watch('service_charges').toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">{t('common.subtotal')}:</span>
              <span className="font-medium">{t('common.currency')} {totals.subtotal.toLocaleString()}</span>
            </div>
            
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  {t('bookings.discount')} 
                  {form.watch('discount_type') === 'percentage' && ` (${form.watch('discount_value')}%)`}
                  :
                </span>
                <span>-{t('common.currency')} {totals.discountAmount.toLocaleString()}</span>
              </div>
            )}
            
            {totals.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>{t('bookings.tax')} ({form.watch('tax_percentage')}%):</span>
                <span>{t('common.currency')} {totals.taxAmount.toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{t('bookings.totalAmount')}:</span>
              <span>{t('common.currency')} {totals.total.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-sm pt-2">
              <span>{t('bookings.balanceDue')}:</span>
              <span className="font-medium">
                {t('common.currency')} {(totals.total - (form.watch('deposit_paid') || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}