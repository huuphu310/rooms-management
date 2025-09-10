import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { bookingsApi, type Booking } from '@/lib/api/bookings'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import { format } from 'date-fns'
import { Home, Users, Calendar, AlertCircle } from 'lucide-react'

interface AssignRoomDialogProps {
  booking: Booking
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AssignRoomDialog({ booking, open, onClose, onSuccess }: AssignRoomDialogProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch available rooms for the booking dates using room-allocation API
  const { data: availableRoomsResponse, isLoading } = useQuery({
    queryKey: ['room-allocation-available-rooms', booking.check_in_date, booking.check_out_date, booking.room_type_id],
    queryFn: async () => {
      try {
        // Use the room-allocation API which includes room types
        const response = await roomAllocationApi.getAvailableRooms({
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          room_type_id: booking.room_type_id,
          guest_count: booking.adults + (booking.children || 0)
        })
        
        return response
      } catch (error) {
        console.error('Error fetching rooms from room-allocation API:', error)
        return { available_rooms: [], total_available: 0, filters_applied: {}, suggestions: [] }
      }
    },
    enabled: open && !!booking.room_type_id
  })

  // Extract available rooms from the response
  const availableRooms = availableRoomsResponse?.available_rooms || []

  const handleAssignRoom = async () => {
    if (!selectedRoomId) {
      toast({
        title: t('error'),
        description: t('pleaseSelectARoom'),
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      await bookingsApi.assignRoom(booking.id, selectedRoomId)
      toast({
        title: t('success'),
        description: t('roomAssignedSuccessfully')
      })
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.response?.data?.detail || t('failedToAssignRoom'),
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setSelectedRoomId('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('assignRoom')}</DialogTitle>
          <DialogDescription>
            {t('assignRoomToBooking')} {booking.booking_code}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{booking.guest_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>
                {format(new Date(booking.check_in_date), 'MMM dd, yyyy')} - 
                {format(new Date(booking.check_out_date), 'MMM dd, yyyy')}
              </span>
              <Badge variant="secondary">{booking.nights} {t('nights')}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-500" />
              <span>
                {booking.adults} {t('adults')}
                {booking.children > 0 && `, ${booking.children} ${t('children')}`}
              </span>
            </div>
          </div>

          {/* Room Selection */}
          <div className="space-y-2">
            <Label htmlFor="room">{t('selectRoom')}</Label>
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                {t('loadingAvailableRooms')}...
              </div>
            ) : availableRooms && availableRooms.length > 0 ? (
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger id="room">
                  <SelectValue placeholder={t('selectAvailableRoom')} />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
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
                        {room.is_accessible && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {t('accessible') || 'Accessible'}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{t('noAvailableRoomsForSelectedDates')}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleAssignRoom} 
            disabled={!selectedRoomId || isSubmitting}
          >
            {isSubmitting ? t('assigning') : t('assignRoom')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}