import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import type { 
  AssignRoomRequest, 
  AvailableRoomsResponse,
  AssignmentValidation 
} from '@/types/room-allocation'
import { 
  Calendar,
  User,
  Home,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  Bed,
  Users,
  MapPin
} from 'lucide-react'

interface RoomAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  bookingDetails: {
    booking_code: string
    guest_name: string
    check_in_date: string
    check_out_date: string
    room_type_requested: string
    guest_count: number
    special_requests?: string
  }
  onAssignmentComplete: () => void
}

export default function RoomAssignmentModal({
  isOpen,
  onClose,
  bookingId,
  bookingDetails,
  onAssignmentComplete
}: RoomAssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomsResponse | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [assignmentType, setAssignmentType] = useState<'manual' | 'guest_request' | 'upgrade' | 'downgrade'>('manual')
  const [assignmentReason, setAssignmentReason] = useState('')
  const [isGuaranteed, setIsGuaranteed] = useState(false)
  const [validation, setValidation] = useState<AssignmentValidation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAvailableRooms()
    }
  }, [isOpen, bookingDetails])

  useEffect(() => {
    if (selectedRoomId) {
      validateAssignment()
    }
  }, [selectedRoomId])

  const loadAvailableRooms = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await roomAllocationApi.getAvailableRooms({
        check_in_date: bookingDetails.check_in_date,
        check_out_date: bookingDetails.check_out_date,
        guest_count: bookingDetails.guest_count
      })
      
      setAvailableRooms(response)
    } catch (err) {
      setError('Failed to load available rooms')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const validateAssignment = async () => {
    if (!selectedRoomId) return
    
    try {
      const response = await roomAllocationApi.validateAssignment(bookingId, selectedRoomId)
      setValidation(response)
      
      // Auto-detect assignment type based on validation
      if (response.price_adjustment) {
        if (response.price_adjustment.difference > 0) {
          setAssignmentType('upgrade')
        } else if (response.price_adjustment.difference < 0) {
          setAssignmentType('downgrade')
        }
      }
    } catch (err) {
      console.error('Validation failed:', err)
    }
  }

  const handleAssignment = async () => {
    if (!selectedRoomId) {
      setError('Please select a room')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const request: AssignRoomRequest = {
        booking_id: bookingId,
        room_id: selectedRoomId,
        assignment_type: assignmentType,
        assignment_reason: assignmentReason || undefined,
        is_guaranteed: isGuaranteed
      }

      await roomAllocationApi.assignRoom(request)
      onAssignmentComplete()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign room')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedRoomId('')
    setAssignmentReason('')
    setIsGuaranteed(false)
    setValidation(null)
    setError(null)
    onClose()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Assign Room - {bookingDetails.booking_code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Details */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Guest</p>
                    <p className="font-medium">{bookingDetails.guest_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Stay Period</p>
                    <p className="font-medium">
                      {formatDate(bookingDetails.check_in_date)} - {formatDate(bookingDetails.check_out_date)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Room Type Requested</p>
                    <p className="font-medium">{bookingDetails.room_type_requested}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Guests</p>
                    <p className="font-medium">{bookingDetails.guest_count} person(s)</p>
                  </div>
                </div>
              </div>

              {bookingDetails.special_requests && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Special Requests</p>
                  <p className="text-sm text-blue-700">{bookingDetails.special_requests}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Room Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="room-select">Select Room</Label>
              <Select
                value={selectedRoomId}
                onValueChange={setSelectedRoomId}
                disabled={loading}
              >
                <SelectTrigger id="room-select" className="mt-2">
                  <SelectValue placeholder="Choose an available room..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms?.rooms.map((room) => (
                    <SelectItem key={room.room_id} value={room.room_id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Room {room.room_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {room.room_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Floor {room.floor}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {room.features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          <span className="text-sm font-medium">
                            {formatCurrency(room.rate_per_night)}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Validation Results */}
            {validation && selectedRoomId && (
              <Card className={validation.is_valid ? 'border-green-200' : 'border-orange-200'}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    {validation.is_valid ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-2">
                      <p className={`font-medium ${validation.is_valid ? 'text-green-900' : 'text-orange-900'}`}>
                        {validation.is_valid ? 'Room is available' : 'Room has conflicts'}
                      </p>
                      
                      {validation.price_adjustment && (
                        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Original Rate:</span>
                            <span>{formatCurrency(validation.price_adjustment.original_rate)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>New Rate:</span>
                            <span>{formatCurrency(validation.price_adjustment.new_rate)}</span>
                          </div>
                          {validation.price_adjustment.difference !== 0 && (
                            <div className="flex justify-between text-sm font-medium pt-2 border-t">
                              <span>Rate Difference:</span>
                              <span className={validation.price_adjustment.difference > 0 ? 'text-red-600' : 'text-green-600'}>
                                {validation.price_adjustment.difference > 0 ? '+' : ''}
                                {formatCurrency(validation.price_adjustment.difference)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {validation.warnings && validation.warnings.length > 0 && (
                        <div className="space-y-1">
                          {validation.warnings.map((warning, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-orange-700">
                              <Info className="h-3 w-3" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assignment Type */}
            <div>
              <Label htmlFor="assignment-type">Assignment Type</Label>
              <Select
                value={assignmentType}
                onValueChange={(value: any) => setAssignmentType(value)}
              >
                <SelectTrigger id="assignment-type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Assignment</SelectItem>
                  <SelectItem value="guest_request">Guest Request</SelectItem>
                  <SelectItem value="upgrade">Room Upgrade</SelectItem>
                  <SelectItem value="downgrade">Room Downgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Reason */}
            <div>
              <Label htmlFor="reason">Assignment Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={assignmentReason}
                onChange={(e) => setAssignmentReason(e.target.value)}
                placeholder="Provide any additional context for this room assignment..."
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Guaranteed Assignment */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="guaranteed"
                checked={isGuaranteed}
                onCheckedChange={(checked) => setIsGuaranteed(checked as boolean)}
              />
              <Label
                htmlFor="guaranteed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Guaranteed assignment (Cannot be changed without approval)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignment} 
            disabled={loading || !selectedRoomId || (validation && !validation.is_valid)}
          >
            {loading ? 'Assigning...' : 'Assign Room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}