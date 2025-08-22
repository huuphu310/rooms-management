import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Settings, Plus, Edit, Trash2, Zap, AlertTriangle } from 'lucide-react'

export default function AllocationSettings() {
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [vipPriority, setVipPriority] = useState(true)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Allocation Settings</h2>
          <p className="text-muted-foreground">
            Configure room allocation rules, preferences, and automation settings
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto-Assignment</h4>
              <p className="text-sm text-muted-foreground">
                Automatically assign rooms to confirmed bookings
              </p>
            </div>
            <Switch 
              checked={autoAssignEnabled} 
              onCheckedChange={setAutoAssignEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Alert Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Send alerts for unassigned bookings and conflicts
              </p>
            </div>
            <Switch 
              checked={alertsEnabled} 
              onCheckedChange={setAlertsEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">VIP Priority</h4>
              <p className="text-sm text-muted-foreground">
                Prioritize VIP guests in room assignment
              </p>
            </div>
            <Switch 
              checked={vipPriority} 
              onCheckedChange={setVipPriority}
            />
          </div>
        </CardContent>
      </Card>

      {/* Allocation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Allocation Rules (3)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">VIP Guest Priority</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Assign premium rooms to VIP guests automatically</p>
                    <p className="mt-1">Priority: High | Type: Guest Type</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Long Stay Preference</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Assign corner rooms for stays longer than 7 nights</p>
                    <p className="mt-1">Priority: Medium | Type: Duration</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Floor Distribution</span>
                    <Badge className="bg-orange-100 text-orange-800">Inactive</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Distribute guests evenly across floors</p>
                    <p className="mt-1">Priority: Low | Type: Room Feature</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-red-600">Critical Alert</label>
                <p className="text-sm text-muted-foreground">&lt; 1 hour before check-in</p>
              </div>
              <div>
                <label className="text-sm font-medium text-orange-600">Warning Alert</label>
                <p className="text-sm text-muted-foreground">&lt; 24 hours before check-in</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-600">Info Alert</label>
                <p className="text-sm text-muted-foreground">&gt; 24 hours before check-in</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Strategies */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Optimize Occupancy</h4>
              <p className="text-sm text-muted-foreground">
                Maximize room utilization by filling rooms efficiently
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">VIP First</h4>
              <p className="text-sm text-muted-foreground">
                Prioritize VIP guests and give them the best available rooms
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Group by Type</h4>
              <p className="text-sm text-muted-foreground">
                Keep similar booking types together (families, business, etc.)
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Distribute Wear</h4>
              <p className="text-sm text-muted-foreground">
                Distribute usage evenly across all rooms to minimize wear
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}