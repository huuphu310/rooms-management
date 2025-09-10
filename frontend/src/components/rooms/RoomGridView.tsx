import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  Home, 
  Users, 
  Calendar as CalendarIcon,
  MoreVertical,
  LogIn,
  LogOut,
  Edit,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Clock,
  Bed
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { roomsApi, type Room } from '@/lib/api/rooms'
import { bookingsApi } from '@/lib/api/bookings'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'

interface RoomGridViewProps {
  onAssignBooking?: (room: Room) => void
  onCheckIn?: (room: Room) => void
  onCheckOut?: (room: Room) => void
  onEditRoom?: (room: Room) => void
}

interface RoomWithBooking extends Room {
  current_booking?: {
    id: string
    booking_code: string
    guest_name: string
    check_in_date: string
    check_out_date: string
    status: string
  }
}

export function RoomGridView({ 
  onAssignBooking,
  onCheckIn,
  onCheckOut,
  onEditRoom 
}: RoomGridViewProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [selectedFloor, setSelectedFloor] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch rooms with current occupancy
  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['rooms-grid', selectedDate, selectedBuilding, selectedFloor],
    queryFn: async () => {
      // Get all rooms
      const roomsResponse = await roomsApi.list({
        building_id: selectedBuilding === 'all' ? undefined : selectedBuilding,
        floor: selectedFloor === 'all' ? undefined : parseInt(selectedFloor)
      })
      
      // Get bookings for selected date
      const bookingsResponse = await bookingsApi.list({
        check_in_date: format(selectedDate, 'yyyy-MM-dd'),
        check_out_date: format(selectedDate, 'yyyy-MM-dd')
      })
      
      // Map bookings to rooms
      const roomsWithBookings: RoomWithBooking[] = roomsResponse.data.map(room => {
        const booking = bookingsResponse.data.find(
          b => b.room_id === room.id && 
          ['confirmed', 'checked_in'].includes(b.status)
        )
        
        return {
          ...room,
          current_booking: booking ? {
            id: booking.id,
            booking_code: booking.booking_code,
            guest_name: booking.guest_name,
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            status: booking.status
          } : undefined
        }
      })
      
      return roomsWithBookings
    }
  })

  // Get unique buildings and floors for filters
  const buildings = Array.from(new Set(rooms?.map(r => r.building_name).filter(Boolean)))
  const floors = Array.from(new Set(rooms?.map(r => r.floor).filter(Boolean)))

  // Filter rooms based on search
  const filteredRooms = rooms?.filter(room => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return room.room_number.toLowerCase().includes(search) ||
           room.current_booking?.guest_name?.toLowerCase().includes(search) ||
           room.current_booking?.booking_code?.toLowerCase().includes(search)
  })

  const getRoomStatusColor = (room: RoomWithBooking) => {
    if (room.status === 'maintenance') return 'bg-gray-100 border-gray-300'
    if (room.status === 'cleaning') return 'bg-yellow-100 border-yellow-300'
    if (room.current_booking) {
      if (room.current_booking.status === 'checked_in') return 'bg-blue-100 border-blue-300'
      if (room.current_booking.status === 'confirmed') return 'bg-green-100 border-green-300'
    }
    return 'bg-white border-gray-200'
  }

  const getRoomStatusIcon = (room: RoomWithBooking) => {
    if (room.status === 'maintenance') return <AlertCircle className="h-4 w-4 text-gray-600" />
    if (room.status === 'cleaning') return <Clock className="h-4 w-4 text-yellow-600" />
    if (room.current_booking) {
      if (room.current_booking.status === 'checked_in') return <Users className="h-4 w-4 text-blue-600" />
      if (room.current_booking.status === 'confirmed') return <CheckCircle className="h-4 w-4 text-green-600" />
    }
    return <Bed className="h-4 w-4 text-gray-400" />
  }

  const getRoomStatusText = (room: RoomWithBooking) => {
    if (room.status === 'maintenance') return t('maintenance')
    if (room.status === 'cleaning') return t('cleaning')
    if (room.current_booking) {
      if (room.current_booking.status === 'checked_in') return t('occupied')
      if (room.current_booking.status === 'confirmed') return t('reserved')
    }
    return t('available')
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Date Picker */}
            <div>
              <Label>{t('date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Building Filter */}
            <div>
              <Label>{t('building')}</Label>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allBuildings')}</SelectItem>
                  {buildings.map(building => (
                    <SelectItem key={building} value={building}>
                      {building}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Floor Filter */}
            <div>
              <Label>{t('floor')}</Label>
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allFloors')}</SelectItem>
                  {floors.sort((a, b) => (a || 0) - (b || 0)).map(floor => (
                    <SelectItem key={floor} value={floor?.toString() || ''}>
                      {t('floor')} {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1">
              <Label>{t('search')}</Label>
              <Input
                placeholder={t('searchRoomOrGuest')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Room Statistics */}
          <div className="flex gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border border-gray-200 rounded" />
              <span>{t('available')}: {filteredRooms?.filter(r => !r.current_booking && r.status === 'available').length || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded" />
              <span>{t('occupied')}: {filteredRooms?.filter(r => r.current_booking?.status === 'checked_in').length || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
              <span>{t('reserved')}: {filteredRooms?.filter(r => r.current_booking?.status === 'confirmed').length || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded" />
              <span>{t('cleaning')}: {filteredRooms?.filter(r => r.status === 'cleaning').length || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded" />
              <span>{t('maintenance')}: {filteredRooms?.filter(r => r.status === 'maintenance').length || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Grid */}
      {isLoading ? (
        <div className="text-center py-8">{t('loading')}...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredRooms?.map(room => (
            <Card 
              key={room.id} 
              className={cn(
                "cursor-pointer hover:shadow-lg transition-shadow border-2",
                getRoomStatusColor(room)
              )}
            >
              <CardHeader className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span className="font-bold">{room.room_number}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {!room.current_booking && room.status === 'available' && onAssignBooking && (
                        <DropdownMenuItem onClick={() => onAssignBooking(room)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          {t('assignBooking')}
                        </DropdownMenuItem>
                      )}
                      
                      {room.current_booking?.status === 'confirmed' && onCheckIn && (
                        <DropdownMenuItem onClick={() => onCheckIn(room)}>
                          <LogIn className="mr-2 h-4 w-4" />
                          {t('checkIn')}
                        </DropdownMenuItem>
                      )}
                      
                      {room.current_booking?.status === 'checked_in' && onCheckOut && (
                        <DropdownMenuItem onClick={() => onCheckOut(room)}>
                          <LogOut className="mr-2 h-4 w-4" />
                          {t('checkOut')}
                        </DropdownMenuItem>
                      )}
                      
                      {onEditRoom && (
                        <DropdownMenuItem onClick={() => onEditRoom(room)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('editRoom')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex items-center gap-2">
                  {getRoomStatusIcon(room)}
                  <span className="text-xs font-medium">{getRoomStatusText(room)}</span>
                </div>
                
                {room.room_type_name && (
                  <Badge variant="outline" className="text-xs">
                    {room.room_type_name}
                  </Badge>
                )}
                
                {room.current_booking && (
                  <div className="text-xs space-y-1 pt-2 border-t">
                    <div className="font-medium truncate">
                      {room.current_booking.guest_name}
                    </div>
                    <div className="text-gray-500">
                      {room.current_booking.booking_code}
                    </div>
                    <div className="text-gray-500">
                      {format(new Date(room.current_booking.check_out_date), 'MMM dd')}
                    </div>
                  </div>
                )}
                
                {room.floor && (
                  <div className="text-xs text-gray-500">
                    {t('floor')} {room.floor}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}