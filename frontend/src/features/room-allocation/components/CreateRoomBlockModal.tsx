import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import { roomsApi } from '@/lib/api/rooms'
import type { CreateRoomBlock, BlockType } from '@/types/room-allocation'
import { Calendar, AlertTriangle } from 'lucide-react'

interface CreateRoomBlockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const BLOCK_TYPES: { value: BlockType; label: string; description: string }[] = [
  { value: 'maintenance', label: 'Maintenance', description: 'Regular maintenance or repairs' },
  { value: 'renovation', label: 'Renovation', description: 'Major renovation work' },
  { value: 'vip_hold', label: 'VIP Hold', description: 'Reserved for VIP guests' },
  { value: 'long_stay', label: 'Long Stay', description: 'Extended reservation' },
  { value: 'staff', label: 'Staff', description: 'Staff accommodation' },
  { value: 'inspection', label: 'Inspection', description: 'Room inspection' },
  { value: 'deep_clean', label: 'Deep Clean', description: 'Thorough cleaning' },
]

export default function CreateRoomBlockModal({ isOpen, onClose, onSuccess }: CreateRoomBlockModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  
  const [formData, setFormData] = useState<CreateRoomBlock>({
    room_id: '',
    start_date: '',
    end_date: '',
    block_type: 'maintenance' as BlockType,
    block_reason: '',
    can_override: false,
  })

  useEffect(() => {
    if (isOpen) {
      loadRooms()
      // Set default dates (today to tomorrow)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      setFormData(prev => ({
        ...prev,
        start_date: today.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0],
      }))
    }
  }, [isOpen])

  const loadRooms = async () => {
    try {
      setLoadingRooms(true)
      const response = await roomsApi.getRooms()
      setRooms(response.data || [])
    } catch (error) {
      console.error('Failed to load rooms:', error)
      setError('Failed to load rooms')
    } finally {
      setLoadingRooms(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.room_id) {
      setError('Please select a room')
      return
    }
    if (!formData.start_date || !formData.end_date) {
      setError('Please select start and end dates')
      return
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setError('End date must be after start date')
      return
    }

    try {
      setLoading(true)
      console.log('Creating room block with data:', formData)
      await roomAllocationApi.createRoomBlock(formData)
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        room_id: '',
        start_date: '',
        end_date: '',
        block_type: 'maintenance' as BlockType,
        block_reason: '',
        can_override: false,
      })
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create room block')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Room Block
          </DialogTitle>
          <DialogDescription>
            Block a room for maintenance, VIP holds, or other purposes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="room">Room *</Label>
            <Select
              value={formData.room_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, room_id: value }))}
              disabled={loadingRooms}
            >
              <SelectTrigger id="room">
                <SelectValue placeholder={loadingRooms ? "Loading rooms..." : "Select a room"} />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    Room {room.room_number} - {room.room_type?.name || 'Standard'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="block_type">Block Type *</Label>
            <Select
              value={formData.block_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, block_type: value as BlockType }))}
            >
              <SelectTrigger id="block_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div>{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason / Notes</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for blocking this room..."
              value={formData.block_reason}
              onChange={(e) => setFormData(prev => ({ ...prev, block_reason: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="can_override"
              checked={formData.can_override}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_override: checked }))}
            />
            <Label htmlFor="can_override" className="cursor-pointer">
              Allow override (can be overridden in case of emergency)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingRooms}>
              {loading ? 'Creating...' : 'Create Block'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}