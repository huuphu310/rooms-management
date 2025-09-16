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
import { roomAllocationApi } from '@/lib/api/room-allocation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Home, Star } from 'lucide-react'

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

  // Fetch available rooms using room-allocation API or fallback to basic rooms API
  const { data: roomsResponse, isError: roomsError, isLoading: roomsLoading } = useQuery({
    queryKey: ['check-in-available-rooms', booking.check_in_date, booking.check_out_date, booking.room_type_id, booking.id],
    queryFn: async () => {
      try {
        // Try room-allocation API first if room_type_id is valid
        if (booking.room_type_id && booking.room_type_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return await roomAllocationApi.getAvailableRooms({
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            room_type_id: booking.room_type_id,
            guest_count: booking.adults + (booking.children || 0),
            booking_id: booking.id  // Pass booking ID to include its assigned room
          })
        } else {
          // Fallback: get all available rooms from basic rooms API
          console.warn('Invalid room_type_id, falling back to basic rooms API:', booking.room_type_id)
          const response = await api.get('/rooms/', {
            params: {
              status: 'available',
              is_active: true
            }
          })
          
          // Transform to match room-allocation API format
          const rooms = response.data.data || []
          return {
            available_rooms: rooms.map((room: any) => ({
              room_id: room.id,
              room_number: room.room_number,
              room_type_id: room.room_type_id,
              room_type: room.room_type?.name || 'Standard',
              floor: room.floor || 0,
              features: [],
              base_rate: parseFloat(room.room_type?.base_price || 0),
              current_status: room.status,
              availability_score: null,
              is_accessible: room.is_accessible || false,
              last_cleaned: null,
              maintenance_notes: null
            })),
            total_available: rooms.length,
            filters_applied: {},
            suggestions: []
          }
        }
      } catch (error) {
        console.error('Error fetching rooms for check-in:', error)
        return { available_rooms: [], total_available: 0, filters_applied: {}, suggestions: [] }
      }
    },
    enabled: open
  })

  // Extract available rooms and prioritize previously assigned room
  const availableRooms = roomsResponse?.available_rooms || []
  const previouslyAssignedRoom = availableRooms.find(room => room.room_id === booking.room_id)
  
  // Sort rooms: previously assigned room first, then others
  const sortedRooms = [...availableRooms].sort((a, b) => {
    if (a.room_id === booking.room_id) return -1
    if (b.room_id === booking.room_id) return 1
    return a.room_number.localeCompare(b.room_number)
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

          {/* Previously Assigned Room Info */}
          {booking.room_id && previouslyAssignedRoom && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Star className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {t('currentlyAssigned') || 'Currently Assigned Room'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Home className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{previouslyAssignedRoom.room_number}</span>
                <Badge variant="secondary">{previouslyAssignedRoom.room_type}</Badge>
                {previouslyAssignedRoom.floor && (
                  <span className="text-sm text-blue-600">
                    {t('floor')} {previouslyAssignedRoom.floor}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {t('roomCurrentlyHeld') || 'This room is currently held for this booking'}
              </p>
            </div>
          )}

          {/* Room Change Warning */}
          {booking.room_id && form.watch('room_id') && form.watch('room_id') !== booking.room_id && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ {t('roomChangeWarning') || 'Changing rooms will release the previously assigned room and make it available for other bookings.'}
              </p>
            </div>
          )}

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
                        {roomsLoading ? (
                          <div className="p-4 text-center text-gray-500">
                            {t('loadingRooms') || 'Loading rooms...'}
                          </div>
                        ) : roomsError ? (
                          <div className="p-4 text-center text-red-600">
                            {t('errorLoadingRooms') || 'Error loading rooms'}
                          </div>
                        ) : sortedRooms && sortedRooms.length > 0 ? (
                          sortedRooms.map((room) => (
                            <SelectItem key={room.room_id} value={room.room_id}>
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                <span className="font-medium">{room.room_number}</span>
                                {room.room_type && (
                                  <Badge variant="secondary">{room.room_type}</Badge>
                                )}
                                {room.floor && (
                                  <span className="text-xs text-gray-500">
                                    {t('floor')} {room.floor}
                                  </span>
                                )}
                                {room.room_id === booking.room_id && (
                                  <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-300">
                                    {t('assigned') || 'Assigned'}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            {t('noRoomsAvailable') || 'No rooms available'}
                          </div>
                        )}
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