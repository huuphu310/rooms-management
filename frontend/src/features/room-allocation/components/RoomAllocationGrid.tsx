import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import type { 
  MonthlyGridResponse, 
  RoomGridData, 
  RoomDailyStatus,
  RoomStatus,
  ShiftType 
} from '@/types/room-allocation'
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  MoreHorizontal,
  User,
  Home,
  AlertTriangle,
  Settings
} from 'lucide-react'

interface RoomAllocationGridProps {
  currentMonth: string
  onMonthChange: (month: string) => void
  onAllocationChange?: () => void
}

interface GridFilters {
  room_type_ids?: string[]
  floors?: number[]
  search_term?: string
}

export default function RoomAllocationGrid({
  currentMonth,
  onMonthChange,
  onAllocationChange
}: RoomAllocationGridProps) {
  const [gridData, setGridData] = useState<MonthlyGridResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<GridFilters>({})
  const [selectedCell, setSelectedCell] = useState<{
    room: RoomGridData
    date: string
    status: RoomDailyStatus
  } | null>(null)
  const [showCellDialog, setShowCellDialog] = useState(false)

  // Grid view settings
  const statusColors: Record<RoomStatus, string> = {
    available: 'bg-green-100 text-green-800 border-green-200',
    occupied: 'bg-blue-100 text-blue-800 border-blue-200',
    arriving: 'bg-orange-100 text-orange-800 border-orange-200',
    departing: 'bg-purple-100 text-purple-800 border-purple-200',
    blocked: 'bg-red-100 text-red-800 border-red-200',
    maintenance: 'bg-gray-100 text-gray-800 border-gray-200',
    pre_assigned: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  useEffect(() => {
    loadGridData()
  }, [currentMonth, filters])

  const loadGridData = async () => {
    try {
      setLoading(true)
      const params = {
        month: currentMonth,
        ...filters
      }
      const data = await roomAllocationApi.getMonthlyGrid(params)
      setGridData(data)
    } catch (error) {
      console.error('Failed to load grid data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMonthNavigation = useCallback((direction: 'prev' | 'next') => {
    const [year, month] = currentMonth.split('-').map(Number)
    const currentDate = new Date(year, month - 1)
    
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1)
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
    
    const newMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    onMonthChange(newMonth)
  }, [currentMonth, onMonthChange])

  const handleCellClick = useCallback((room: RoomGridData, date: string) => {
    const dayStatus = room.daily_status.find(status => status.date === date)
    if (dayStatus) {
      setSelectedCell({ room, date, status: dayStatus })
      setShowCellDialog(true)
    }
  }, [])

  const formatMonthYear = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const getDatesInMonth = () => {
    if (!gridData) return []
    
    const [year, month] = currentMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month - 1, i + 1)
      return date.toISOString().split('T')[0]
    })
  }

  const getStatusIcon = (status: RoomStatus) => {
    switch (status) {
      case 'occupied':
        return <User className="h-3 w-3" />
      case 'arriving':
        return <User className="h-3 w-3" />
      case 'departing':
        return <User className="h-3 w-3" />
      case 'blocked':
        return <AlertTriangle className="h-3 w-3" />
      case 'maintenance':
        return <Settings className="h-3 w-3" />
      default:
        return <Home className="h-3 w-3" />
    }
  }

  const renderGridCell = (room: RoomGridData, date: string) => {
    const dayStatus = room.daily_status.find(status => status.date === date)
    if (!dayStatus) return null

    const isToday = date === new Date().toISOString().split('T')[0]
    const hasShifts = dayStatus.day_shift_booking || dayStatus.night_shift_booking
    const isFullDay = dayStatus.shift_type === 'full_day'
    const isTraditional = !dayStatus.shift_type || dayStatus.shift_type === 'traditional'

    // Determine cell background based on shift status
    let cellBackground = 'bg-green-100 border-green-200' // Available by default
    
    if (dayStatus.status === 'blocked') {
      cellBackground = 'bg-red-100 border-red-200'
    } else if (dayStatus.status === 'maintenance') {
      cellBackground = 'bg-gray-100 border-gray-200'
    } else if (isFullDay || (dayStatus.day_shift_booking && dayStatus.night_shift_booking)) {
      cellBackground = 'bg-blue-100 border-blue-200' // Fully occupied
    } else if (hasShifts) {
      cellBackground = 'bg-yellow-100 border-yellow-200' // Partially occupied
    } else if (dayStatus.status === 'occupied' && isTraditional) {
      cellBackground = 'bg-blue-100 border-blue-200' // Traditional booking
    }

    return (
      <div
        key={`${room.room_id}-${date}`}
        className={`
          min-h-[60px] border cursor-pointer transition-all hover:shadow-sm relative
          ${cellBackground}
          ${isToday ? 'ring-2 ring-blue-400' : ''}
          ${dayStatus.is_vip ? 'ring-1 ring-yellow-400' : ''}
        `}
        onClick={() => handleCellClick(room, date)}
      >
        <div className="p-1 text-xs h-full flex flex-col justify-between">
          {/* Show shift-based bookings */}
          {hasShifts ? (
            <div className="space-y-1">
              {/* Day Shift */}
              {dayStatus.day_shift_booking && (
                <div className="flex items-center gap-1 bg-orange-50 rounded px-1">
                  <span className="text-orange-600 font-semibold">D:</span>
                  <span className="truncate text-xs">
                    {dayStatus.day_shift_booking.guest_name.split(' ')[0]}
                  </span>
                </div>
              )}
              
              {/* Night Shift */}
              {dayStatus.night_shift_booking && (
                <div className="flex items-center gap-1 bg-indigo-50 rounded px-1">
                  <span className="text-indigo-600 font-semibold">N:</span>
                  <span className="truncate text-xs">
                    {dayStatus.night_shift_booking.guest_name.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Traditional booking or available */
            <div>
              {dayStatus.guest_name && (
                <div className="flex items-center gap-1">
                  {getStatusIcon(dayStatus.status)}
                  <span className="truncate font-medium">
                    {dayStatus.guest_name.split(' ')[0]}
                  </span>
                  {isFullDay && (
                    <span className="text-xs bg-blue-600 text-white px-1 rounded">24h</span>
                  )}
                </div>
              )}
              
              {dayStatus.block_reason && (
                <div className="text-xs truncate">{dayStatus.block_reason}</div>
              )}
            </div>
          )}
          
          {/* Arrival/Departure indicators */}
          <div className="flex gap-1">
            {dayStatus.is_arrival && (
              <span className="text-xs text-green-600 font-bold">IN</span>
            )}
            {dayStatus.is_departure && (
              <span className="text-xs text-red-600 font-bold">OUT</span>
            )}
          </div>
          
          {/* VIP indicator */}
          {dayStatus.is_vip && (
            <div className="absolute top-0 right-0 text-yellow-500">⭐</div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading room allocation grid...</p>
        </div>
      </div>
    )
  }

  const dates = getDatesInMonth()

  return (
    <div className="space-y-6">
      {/* Grid Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthNavigation('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">{formatMonthYear(currentMonth)}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthNavigation('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Badge variant="outline">
            {gridData?.summary.total_rooms} rooms
          </Badge>
          <Badge variant="outline">
            {gridData?.summary.average_occupancy_rate}% avg occupancy
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={filters.search_term || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search_term: e.target.value }))}
              className="pl-8 w-48"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Status Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm font-medium">Booking Status:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border bg-green-100 border-green-200" />
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border bg-blue-100 border-blue-200" />
                <span className="text-sm">Fully Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border bg-yellow-100 border-yellow-200" />
                <span className="text-sm">Partially Occupied (Shift)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border bg-red-100 border-red-200" />
                <span className="text-sm">Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border bg-gray-100 border-gray-200" />
                <span className="text-sm">Maintenance</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm font-medium">Shift Indicators:</span>
              <div className="flex items-center gap-2">
                <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded text-xs">D:</span>
                <span className="text-sm">Day Shift (9AM-4:30PM)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded text-xs">N:</span>
                <span className="text-sm">Night Shift (5:30PM-8:30AM)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">24h</span>
                <span className="text-sm">Full Day</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Room Allocation Grid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <div className="min-w-[800px]">
              {/* Header Row with Dates */}
              <div className="grid grid-cols-[150px_repeat(31,minmax(40px,1fr))] gap-px bg-gray-200 mb-px">
                <div className="bg-gray-50 p-2 font-semibold text-sm border-r">
                  Room
                </div>
                {dates.map(date => {
                  const day = new Date(date).getDate()
                  const isToday = date === new Date().toISOString().split('T')[0]
                  const dayOfWeek = new Date(date).getDay()
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                  
                  return (
                    <div
                      key={date}
                      className={`
                        bg-gray-50 p-1 text-center text-xs font-medium border-r
                        ${isToday ? 'bg-blue-100 text-blue-800' : ''}
                        ${isWeekend ? 'bg-gray-100' : ''}
                      `}
                    >
                      <div>{day}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Room Rows */}
              {gridData?.rooms.map(room => (
                <div
                  key={room.room_id}
                  className="grid grid-cols-[150px_repeat(31,minmax(40px,1fr))] gap-px bg-gray-200 mb-px"
                >
                  {/* Room Info Column */}
                  <div className="bg-white p-2 border-r">
                    <div className="text-sm font-medium">{room.room_number}</div>
                    <div className="text-xs text-muted-foreground">{room.room_type}</div>
                    <div className="text-xs text-muted-foreground">Floor {room.floor}</div>
                    {room.features.length > 0 && (
                      <div className="text-xs text-blue-600 truncate">
                        {room.features.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Daily Status Cells */}
                  {dates.map(date => renderGridCell(room, date))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Occupancy Statistics */}
      {gridData && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Occupancy Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {gridData.occupancy_stats.slice(0, 7).map((stat, index) => (
                <div key={stat.date} className="flex justify-between items-center py-1">
                  <span className="text-sm">
                    {new Date(stat.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-green-600">{stat.occupied} occupied</span>
                    <span className="text-sm text-gray-600">{stat.available} available</span>
                    <span className="text-sm text-red-600">{stat.blocked} blocked</span>
                    <Badge variant="outline">{stat.occupancy_rate}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cell Details Dialog */}
      <Dialog open={showCellDialog} onOpenChange={setShowCellDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Room {selectedCell?.room.room_number} - {
                selectedCell?.date ? new Date(selectedCell.date).toLocaleDateString() : ''
              }
            </DialogTitle>
            <DialogDescription>
              View allocation details and manage room assignments for this date.
            </DialogDescription>
          </DialogHeader>
          {selectedCell && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedCell.status.status)}
                    <Badge className={statusColors[selectedCell.status.status]}>
                      {selectedCell.status.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Room Type</label>
                  <p className="text-sm mt-1">{selectedCell.room.room_type}</p>
                </div>
              </div>

              {/* Show shift bookings if available */}
              {(selectedCell.status.day_shift_booking || selectedCell.status.night_shift_booking) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shift Bookings</label>
                  
                  {selectedCell.status.day_shift_booking && (
                    <div className="p-2 bg-orange-50 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-orange-700">Day Shift (9:00 AM - 4:30 PM)</span>
                        <Badge className="bg-orange-100 text-orange-800">Day</Badge>
                      </div>
                      <p className="text-sm mt-1">{selectedCell.status.day_shift_booking.guest_name}</p>
                    </div>
                  )}
                  
                  {selectedCell.status.night_shift_booking && (
                    <div className="p-2 bg-indigo-50 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-indigo-700">Night Shift (5:30 PM - 8:30 AM)</span>
                        <Badge className="bg-indigo-100 text-indigo-800">Night</Badge>
                      </div>
                      <p className="text-sm mt-1">{selectedCell.status.night_shift_booking.guest_name}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Traditional booking guest */}
              {selectedCell.status.guest_name && !selectedCell.status.day_shift_booking && !selectedCell.status.night_shift_booking && (
                <div>
                  <label className="text-sm font-medium">Guest</label>
                  <p className="text-sm mt-1">{selectedCell.status.guest_name}</p>
                  {selectedCell.status.shift_type === 'full_day' && (
                    <Badge className="mt-1 bg-blue-100 text-blue-800">Full Day (24 hours)</Badge>
                  )}
                </div>
              )}

              {selectedCell.status.block_reason && (
                <div>
                  <label className="text-sm font-medium">Block Reason</label>
                  <p className="text-sm mt-1">{selectedCell.status.block_reason}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                {selectedCell.status.is_arrival && (
                  <Badge className="bg-green-100 text-green-800">Arrival</Badge>
                )}
                {selectedCell.status.is_departure && (
                  <Badge className="bg-red-100 text-red-800">Departure</Badge>
                )}
                {selectedCell.status.is_vip && (
                  <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCellDialog(false)}>
                  Close
                </Button>
                {selectedCell.status.booking_id && (
                  <Button>
                    View Booking
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}