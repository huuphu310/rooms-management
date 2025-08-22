import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/contexts/LanguageContext'
import { bookingsApi, type Booking, type CheckOutRequest } from '@/lib/api/bookings'
import { format } from 'date-fns'

const checkOutSchema = z.object({
  actual_check_out: z.string().optional(),
  late_check_out: z.boolean().default(false),
  extra_charges: z.number().min(0).default(0),
  payment_method: z.string().min(1, 'Payment method is required'),
  payment_amount: z.number().min(0, 'Payment amount is required'),
  notes: z.string().optional(),
})

interface CheckOutDialogProps {
  booking: Booking
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CheckOutDialog({ booking, open, onClose, onSuccess }: CheckOutDialogProps) {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof checkOutSchema>>({
    resolver: zodResolver(checkOutSchema),
    defaultValues: {
      actual_check_out: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      late_check_out: false,
      extra_charges: 0,
      payment_method: 'cash',
      payment_amount: booking.balance_due || 0,
      notes: '',
    }
  })

  const handleSubmit = async (values: z.infer<typeof checkOutSchema>) => {
    setIsLoading(true)
    try {
      const checkOutData: CheckOutRequest = {
        actual_check_out: values.actual_check_out,
        late_check_out: values.late_check_out,
        extra_charges: values.extra_charges,
        payment_method: values.payment_method,
        payment_amount: values.payment_amount,
        notes: values.notes,
      }
      
      await bookingsApi.checkOut(booking.id, checkOutData)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Check-out failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const totalAmount = booking.balance_due + (form.watch('extra_charges') || 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('checkOut')}</DialogTitle>
          <DialogDescription>
            {t('processCheckOut')} - {t('bookingCode')}: {booking.booking_code}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Booking Summary */}
          <div className="grid gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('guest')}:</span>
              <span className="font-medium">{booking.guest_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('room')}:</span>
              <span className="font-medium">{booking.room_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('checkInDate')}:</span>
              <span className="font-medium">
                {format(new Date(booking.check_in_date), 'PPP')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('checkOutDate')}:</span>
              <span className="font-medium">
                {format(new Date(booking.check_out_date), 'PPP')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('nights')}:</span>
              <span className="font-medium">{booking.nights}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('totalAmount')}:</span>
                <span className="font-medium">{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('totalPaid')}:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(booking.total_paid)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>{t('balanceDue')}:</span>
                <span className="text-red-600">{formatCurrency(booking.balance_due)}</span>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="actual_check_out"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('actualCheckOutTime')}</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="late_check_out"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {t('lateCheckOut')}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="extra_charges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('extraCharges')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('additionalChargesDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('paymentMethod')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">{t('cash')}</SelectItem>
                          <SelectItem value="credit_card">{t('creditCard')}</SelectItem>
                          <SelectItem value="debit_card">{t('debitCard')}</SelectItem>
                          <SelectItem value="bank_transfer">{t('bankTransfer')}</SelectItem>
                          <SelectItem value="mobile_payment">{t('mobilePayment')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('paymentAmount')} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('totalDue')}: {formatCurrency(totalAmount)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Final Summary */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('balanceDue')}:</span>
                    <span>{formatCurrency(booking.balance_due)}</span>
                  </div>
                  {form.watch('extra_charges') > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{t('extraCharges')}:</span>
                      <span>{formatCurrency(form.watch('extra_charges'))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>{t('totalToCollect')}:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  {form.watch('payment_amount') < totalAmount && (
                    <div className="text-sm text-red-600">
                      {t('remainingBalance')}: {formatCurrency(totalAmount - form.watch('payment_amount'))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('confirmCheckOut')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}