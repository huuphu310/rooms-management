import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import type { 
  UnassignedBookingsResponse, 
  UnassignedBooking,
  AssignRoomRequest,
  AvailableRoomsResponse,
  AlertSeverity,
  AssignmentStrategy
} from '@/types/room-allocation'
import { 
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  Home,
  CheckCircle,
  RefreshCw,
  Search,
  Zap
} from 'lucide-react'

interface UnassignedBookingsPanelProps {
  unassignedBookings: UnassignedBookingsResponse | null
  onBookingAssigned: () => void
  onRefresh: () => void
}

export default function UnassignedBookingsPanel({
  unassignedBookings,
  onBookingAssigned,
  onRefresh
}: UnassignedBookingsPanelProps) {
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<UnassignedBooking | null>(null)
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomsResponse | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [assignmentReason, setAssignmentReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'warning':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <Clock className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  const formatHoursUntilCheckIn = (hours?: number) => {
    if (!hours) return 'Unknown'
    
    if (hours < 0) {
      return `${Math.abs(hours).toFixed(1)}h overdue`
    } else if (hours < 1) {
      return `${(hours * 60).toFixed(0)}m`
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}d ${remainingHours.toFixed(0)}h`
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleBookingSelect = (bookingId: string, checked: boolean) => {
    if (checked) {
      setSelectedBookings(prev => [...prev, bookingId])
    } else {
      setSelectedBookings(prev => prev.filter(id => id !== bookingId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allBookingIds = filteredBookings.map(booking => booking.booking_id)
      setSelectedBookings(allBookingIds)
    } else {
      setSelectedBookings([])
    }
  }

  const handleAssignRoom = async (booking: UnassignedBooking) => {
    try {
      setSelectedBooking(booking)
      setLoading(true)
      
      // Get available rooms for this booking
      const rooms = await roomAllocationApi.getAvailableRooms({
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        room_type_id: booking.room_type_id
      })
      
      setAvailableRooms(rooms)
      setShowAssignDialog(true)
    } catch (error) {
      console.error('Failed to get available rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAssignment = async () => {
    if (!selectedBooking || !selectedRoom) return

    try {
      setLoading(true)
      
      const request: AssignRoomRequest = {
        booking_id: selectedBooking.booking_id,
        room_id: selectedRoom,
        assignment_type: 'manual',
        assignment_reason: assignmentReason || 'Manual assignment from unassigned bookings panel'
      }
      
      await roomAllocationApi.assignRoom(request)
      
      setShowAssignDialog(false)
      setSelectedBooking(null)
      setSelectedRoom('')
      setAssignmentReason('')
      onBookingAssigned()
    } catch (error) {
      console.error('Failed to assign room:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAutoAssign = async () => {
    if (selectedBookings.length === 0) return

    try {
      setAutoAssigning(true)
      
      // Get date range for selected bookings
      const bookings = selectedBookings.map(id => 
        unassignedBookings?.alerts.find(b => b.booking_id === id)
      ).filter(Boolean) as UnassignedBooking[]
      
      const earliestCheckIn = Math.min(...bookings.map(b => new Date(b.check_in_date).getTime()))
      const latestCheckOut = Math.max(...bookings.map(b => new Date(b.check_out_date).getTime()))
      
      const request = {
        date_range: {
          from: new Date(earliestCheckIn).toISOString().split('T')[0],
          to: new Date(latestCheckOut).toISOString().split('T')[0]
        },
        assignment_strategy: 'vip_first' as AssignmentStrategy,
        respect_preferences: true
      }
      
      await roomAllocationApi.autoAssignRooms(request)
      setSelectedBookings([])
      onBookingAssigned()
    } catch (error) {
      console.error('Bulk auto-assignment failed:', error)
    } finally {
      setAutoAssigning(false)
    }
  }

  // Filter bookings
  const filteredBookings = unassignedBookings?.alerts.filter(booking => {
    const matchesSeverity = severityFilter === 'all' || booking.alert_level === severityFilter
    const matchesSearch = !searchTerm || 
      booking.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone?.includes(searchTerm) ||
      booking.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSeverity && matchesSearch
  }) || []

  const criticalCount = filteredBookings.filter(b => b.alert_level === 'critical').length
  const warningCount = filteredBookings.filter(b => b.alert_level === 'warning').length

  return (
    <div className="space-y-6">
      {/* Header and Summary */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Unassigned Bookings</h2>
          <p className="text-muted-foreground">
            Bookings that need room assignment before check-in
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {selectedBookings.length > 0 && (
            <Button 
              onClick={handleBulkAutoAssign}
              disabled={autoAssigning}
            >
              <Zap className="mr-2 h-4 w-4" />
              Auto Assign Selected ({selectedBookings.length})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unassigned</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedBookings?.summary.total_unassigned || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">&lt; 1 hour until check-in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{warningCount}</div>
            <p className="text-xs text-muted-foreground">&lt; 24 hours until check-in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{selectedBookings.length}</div>
            <p className="text-xs text-muted-foreground">For bulk assignment</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalCount > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>URGENT:</strong> {criticalCount} bookings need immediate room assignment (less than 1 hour until check-in)
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name, booking code, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical Only</SelectItem>
            <SelectItem value="warning">Warning Only</SelectItem>
            <SelectItem value="info">Info Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Unassigned Bookings ({filteredBookings.length})
            </CardTitle>
            {filteredBookings.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedBookings.length === filteredBookings.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm">Select All</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">All Bookings Assigned!</h3>
              <p className="text-muted-foreground">
                No unassigned bookings match your current filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div 
                  key={booking.booking_id}
                  className={`
                    border rounded-lg p-4 space-y-3
                    ${booking.alert_level === 'critical' ? 'border-red-300 bg-red-50' : ''}
                    ${booking.alert_level === 'warning' ? 'border-orange-300 bg-orange-50' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedBookings.includes(booking.booking_id)}
                        onCheckedChange={(checked) => 
                          handleBookingSelect(booking.booking_id, checked as boolean)
                        }
                      />
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{booking.guest_name}</h4>
                          {booking.is_vip && (
                            <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>
                          )}
                          <Badge className={getSeverityColor(booking.alert_level)}>
                            {getSeverityIcon(booking.alert_level)}
                            {booking.alert_level.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Booking: {booking.booking_code}</span>
                          {booking.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {booking.phone}
                            </span>
                          )}
                          {booking.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {booking.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleAssignRoom(booking)}
                      disabled={loading}
                      size="sm"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Assign Room
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Check-in:</span>
                      <div className="font-medium">
                        {new Date(booking.check_in_date).toLocaleDateString()}
                        {booking.check_in_time && ` at ${booking.check_in_time}`}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-out:</span>
                      <div className="font-medium">
                        {new Date(booking.check_out_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Room Type:</span>
                      <div className="font-medium">{booking.room_type}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time Until Check-in:</span>
                      <div className={`font-medium ${
                        booking.alert_level === 'critical' ? 'text-red-600' : 
                        booking.alert_level === 'warning' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {formatHoursUntilCheckIn(booking.hours_until_checkin)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Available rooms: </span>
                      <span className="font-medium">
                        {booking.available_rooms.length > 0 
                          ? booking.available_rooms.join(', ')
                          : 'No rooms available'
                        }
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Amount: </span>
                      <span className="font-medium">{formatCurrency(booking.total_amount)}</span>
                      <span className="text-muted-foreground"> (Paid: {formatCurrency(booking.paid_amount)})</span>
                    </div>
                  </div>

                  {booking.special_requests && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Special requests: </span>
                      <span className="italic">{booking.special_requests}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {unassignedBookings?.recommendations && unassignedBookings.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {unassignedBookings.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Room Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Room - {selectedBooking?.guest_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              {/* Booking Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Check-in:</span>
                  <div className="font-medium">
                    {new Date(selectedBooking.check_in_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Check-out:</span>
                  <div className="font-medium">
                    {new Date(selectedBooking.check_out_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Room Type:</span>
                  <div className="font-medium">{selectedBooking.room_type}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Guests:</span>
                  <div className="font-medium">1 guest</div>
                </div>
              </div>

              {/* Available Rooms */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Room</label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an available room" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms?.available_rooms.map((room) => (
                      <SelectItem key={room.room_id} value={room.room_id}>
                        Room {room.room_number} - {room.room_type} (Floor {room.floor})
                        {room.features.length > 0 && ` - ${room.features.join(', ')}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableRooms?.available_rooms.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    No rooms available for the selected dates
                  </p>
                )}
              </div>

              {/* Assignment Reason */}
              <div>
                <label className="text-sm font-medium mb-2 block">Assignment Reason (Optional)</label>
                <Input
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  placeholder="Enter reason for this room assignment..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAssignDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmAssignment}
                  disabled={!selectedRoom || loading}
                >
                  {loading ? 'Assigning...' : 'Assign Room'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}