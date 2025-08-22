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
import { bookingsApi, type Booking, type CheckInRequest } from '@/lib/api/bookings'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'

const checkInSchema = z.object({
  room_id: z.string().min(1, 'Room is required'),
  actual_check_in: z.string().optional(),
  early_check_in: z.boolean().default(false),
  notes: z.string().optional(),
})

interface CheckInDialogProps {
  booking: Booking
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CheckInDialog({ booking, open, onClose, onSuccess }: CheckInDialogProps) {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)

  // Fetch available rooms for the room type
  const { data: rooms } = useQuery({
    queryKey: ['availableRooms', booking.room_type_id],
    queryFn: async () => {
      const response = await api.get('/rooms/', {
        params: {
          room_type_id: booking.room_type_id,
          status: 'vacant',
          is_active: true
        }
      })
      return response.data.data
    },
    enabled: open
  })

  const form = useForm<z.infer<typeof checkInSchema>>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      room_id: booking.room_id || '',
      actual_check_in: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      early_check_in: false,
      notes: '',
    }
  })

  const handleSubmit = async (values: z.infer<typeof checkInSchema>) => {
    setIsLoading(true)
    try {
      const checkInData: CheckInRequest = {
        room_id: values.room_id,
        actual_check_in: values.actual_check_in,
        early_check_in: values.early_check_in,
        notes: values.notes,
      }
      
      await bookingsApi.checkIn(booking.id, checkInData)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Check-in failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('checkIn')}</DialogTitle>
          <DialogDescription>
            {t('processCheckIn')} - {t('bookingCode')}: {booking.booking_code}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid gap-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('guest')}:</span>
              <span className="font-medium">{booking.guest_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('checkInDate')}:</span>
              <span className="font-medium">
                {format(new Date(booking.check_in_date), 'PPP')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('nights')}:</span>
              <span className="font-medium">{booking.nights}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('guests')}:</span>
              <span className="font-medium">
                {booking.adults} {t('adults')}
                {booking.children > 0 && `, ${booking.children} ${t('children')}`}
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="room_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('selectRoom')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectRoom')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms?.map((room: any) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.room_number} - {room.floor} {t('floor')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_check_in"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('actualCheckInTime')}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="early_check_in"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        {t('earlyCheckIn')}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('confirmCheckIn')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}