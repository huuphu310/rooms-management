import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import { Zap, AlertTriangle } from 'lucide-react'

interface CreateAllocationRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const RULE_TYPES = [
  { value: 'guest_type', label: 'Guest Type', description: 'Based on guest category (VIP, Regular, etc.)' },
  { value: 'duration', label: 'Stay Duration', description: 'Based on length of stay' },
  { value: 'room_feature', label: 'Room Feature', description: 'Based on room features and amenities' },
  { value: 'occupancy', label: 'Occupancy', description: 'Based on hotel occupancy levels' },
  { value: 'time_based', label: 'Time Based', description: 'Based on booking or check-in time' },
  { value: 'custom', label: 'Custom', description: 'Custom rule with specific conditions' },
]

const PRIORITY_LEVELS = [
  { value: 1, label: 'Low', color: 'text-blue-600' },
  { value: 5, label: 'Medium', color: 'text-yellow-600' },
  { value: 10, label: 'High', color: 'text-orange-600' },
  { value: 15, label: 'Critical', color: 'text-red-600' },
]

export default function CreateAllocationRuleModal({ isOpen, onClose, onSuccess }: CreateAllocationRuleModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'guest_type',
    priority: 5,
    is_active: true,
    conditions: {} as Record<string, any>,
    actions: {} as Record<string, any>,
  })

  // Condition states based on rule type
  const [guestType, setGuestType] = useState('vip')
  const [minDuration, setMinDuration] = useState(7)
  const [roomFeature, setRoomFeature] = useState('')
  const [minOccupancy, setMinOccupancy] = useState(80)
  const [timeCondition, setTimeCondition] = useState('advance_booking')
  const [customCondition, setCustomCondition] = useState('')

  // Action states
  const [assignRoomType, setAssignRoomType] = useState('')
  const [assignFloor, setAssignFloor] = useState('')
  const [priorityBoost, setPriorityBoost] = useState(0)
  const [autoUpgrade, setAutoUpgrade] = useState(false)

  const buildConditions = () => {
    const conditions: Record<string, any> = {}
    
    switch (formData.rule_type) {
      case 'guest_type':
        conditions.guest_type = guestType
        break
      case 'duration':
        conditions.min_duration_nights = minDuration
        break
      case 'room_feature':
        conditions.required_features = roomFeature.split(',').map(f => f.trim()).filter(Boolean)
        break
      case 'occupancy':
        conditions.min_occupancy_percentage = minOccupancy
        break
      case 'time_based':
        conditions.time_condition = timeCondition
        break
      case 'custom':
        try {
          conditions.custom = customCondition ? JSON.parse(customCondition) : {}
        } catch {
          conditions.custom_text = customCondition
        }
        break
    }
    
    return conditions
  }

  const buildActions = () => {
    const actions: Record<string, any> = {}
    
    if (assignRoomType) {
      actions.assign_room_type = assignRoomType
    }
    if (assignFloor) {
      actions.prefer_floor = parseInt(assignFloor)
    }
    if (priorityBoost > 0) {
      actions.priority_boost = priorityBoost
    }
    if (autoUpgrade) {
      actions.auto_upgrade = true
    }
    
    return actions
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.rule_name.trim()) {
      setError('Please enter a rule name')
      return
    }

    const conditions = buildConditions()
    const actions = buildActions()

    if (Object.keys(conditions).length === 0) {
      setError('Please configure at least one condition')
      return
    }

    if (Object.keys(actions).length === 0) {
      setError('Please configure at least one action')
      return
    }

    try {
      setLoading(true)
      
      const ruleData = {
        rule_name: formData.rule_name,
        rule_type: formData.rule_type,
        priority: formData.priority,
        is_active: formData.is_active,
        conditions,
        actions,
      }

      console.log('Creating allocation rule:', ruleData)
      await roomAllocationApi.createAllocationRule(ruleData)
      
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        rule_name: '',
        rule_type: 'guest_type',
        priority: 5,
        is_active: true,
        conditions: {},
        actions: {},
      })
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create allocation rule')
    } finally {
      setLoading(false)
    }
  }

  const renderConditionInputs = () => {
    switch (formData.rule_type) {
      case 'guest_type':
        return (
          <div className="space-y-2">
            <Label>Guest Type</Label>
            <Select value={guestType} onValueChange={setGuestType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vip">VIP Guest</SelectItem>
                <SelectItem value="regular">Regular Guest</SelectItem>
                <SelectItem value="corporate">Corporate Guest</SelectItem>
                <SelectItem value="group">Group Booking</SelectItem>
                <SelectItem value="long_stay">Long Stay Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      
      case 'duration':
        return (
          <div className="space-y-2">
            <Label>Minimum Stay Duration (nights)</Label>
            <Input
              type="number"
              min="1"
              value={minDuration}
              onChange={(e) => setMinDuration(parseInt(e.target.value))}
            />
          </div>
        )
      
      case 'room_feature':
        return (
          <div className="space-y-2">
            <Label>Required Features (comma-separated)</Label>
            <Input
              placeholder="e.g., balcony, sea view, corner room"
              value={roomFeature}
              onChange={(e) => setRoomFeature(e.target.value)}
            />
          </div>
        )
      
      case 'occupancy':
        return (
          <div className="space-y-2">
            <Label>Minimum Occupancy Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={minOccupancy}
                onChange={(e) => setMinOccupancy(parseInt(e.target.value))}
              />
              <span>%</span>
            </div>
          </div>
        )
      
      case 'time_based':
        return (
          <div className="space-y-2">
            <Label>Time Condition</Label>
            <Select value={timeCondition} onValueChange={setTimeCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advance_booking">Advance Booking (&gt;7 days)</SelectItem>
                <SelectItem value="last_minute">Last Minute (&lt;24 hours)</SelectItem>
                <SelectItem value="weekend">Weekend Check-in</SelectItem>
                <SelectItem value="weekday">Weekday Check-in</SelectItem>
                <SelectItem value="peak_season">Peak Season</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      
      case 'custom':
        return (
          <div className="space-y-2">
            <Label>Custom Condition (JSON or text)</Label>
            <Textarea
              placeholder='e.g., {"special_request": "quiet room"}'
              value={customCondition}
              onChange={(e) => setCustomCondition(e.target.value)}
              rows={3}
            />
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Create Allocation Rule
          </DialogTitle>
          <DialogDescription>
            Define conditions and actions for automatic room allocation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule_name">Rule Name *</Label>
              <Input
                id="rule_name"
                placeholder="e.g., VIP Guest Priority"
                value={formData.rule_name}
                onChange={(e) => setFormData(prev => ({ ...prev, rule_name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule_type">Rule Type *</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, rule_type: value }))}
                >
                  <SelectTrigger id="rule_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((type) => (
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

              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level *</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: parseInt(value) }))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value.toString()}>
                        <span className={level.color}>{level.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <h3 className="font-medium">Conditions</h3>
            <div className="p-4 border rounded-lg bg-muted/50">
              {renderConditionInputs()}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="font-medium">Actions</h3>
            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign Room Type</Label>
                  <Select value={assignRoomType} onValueChange={setAssignRoomType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No preference</SelectItem>
                      <SelectItem value="standard">Standard Room</SelectItem>
                      <SelectItem value="deluxe">Deluxe Room</SelectItem>
                      <SelectItem value="suite">Suite</SelectItem>
                      <SelectItem value="premium">Premium Room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prefer Floor</Label>
                  <Select value={assignFloor} onValueChange={setAssignFloor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No preference</SelectItem>
                      <SelectItem value="1">1st Floor</SelectItem>
                      <SelectItem value="2">2nd Floor</SelectItem>
                      <SelectItem value="3">3rd Floor</SelectItem>
                      <SelectItem value="4">4th Floor</SelectItem>
                      <SelectItem value="5">5th Floor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority Boost</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={priorityBoost}
                    onChange={(e) => setPriorityBoost(parseInt(e.target.value))}
                    placeholder="0-100"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="auto_upgrade"
                    checked={autoUpgrade}
                    onCheckedChange={setAutoUpgrade}
                  />
                  <Label htmlFor="auto_upgrade" className="cursor-pointer">
                    Enable Auto-Upgrade
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Activate rule immediately
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}