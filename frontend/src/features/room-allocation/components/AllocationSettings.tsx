import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Settings, Plus, Edit, Trash2, Zap, AlertTriangle } from 'lucide-react'
import CreateAllocationRuleModal from './CreateAllocationRuleModal'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import { useToast } from '@/components/ui/use-toast'
import type { AllocationRule } from '@/types/room-allocation'

export default function AllocationSettings() {
  const { toast } = useToast()
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [vipPriority, setVipPriority] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [rules, setRules] = useState<AllocationRule[]>([])
  const [loadingRules, setLoadingRules] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoadingRules(true)
      const response = await roomAllocationApi.getAllocationRules({ is_active: true })
      setRules(response.data || [])
    } catch (error) {
      console.error('Failed to load allocation rules:', error)
      toast({
        title: 'Error',
        description: 'Failed to load allocation rules',
        variant: 'destructive',
      })
    } finally {
      setLoadingRules(false)
    }
  }

  const handleCreateRule = () => {
    setIsCreateModalOpen(true)
  }

  const handleRuleCreated = () => {
    toast({
      title: 'Success',
      description: 'Allocation rule created successfully',
    })
    loadRules() // Reload rules
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return
    }

    try {
      await roomAllocationApi.deleteAllocationRule(ruleId)
      toast({
        title: 'Success',
        description: 'Rule deleted successfully',
      })
      loadRules()
    } catch (error) {
      console.error('Failed to delete rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive',
      })
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await roomAllocationApi.updateAllocationRule(ruleId, { is_active: !isActive })
      toast({
        title: 'Success',
        description: `Rule ${!isActive ? 'activated' : 'deactivated'} successfully`,
      })
      loadRules()
    } catch (error) {
      console.error('Failed to toggle rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to update rule status',
        variant: 'destructive',
      })
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 15) return 'text-red-600'
    if (priority >= 10) return 'text-orange-600'
    if (priority >= 5) return 'text-yellow-600'
    return 'text-blue-600'
  }

  const getPriorityLabel = (priority: number) => {
    if (priority >= 15) return 'Critical'
    if (priority >= 10) return 'High'
    if (priority >= 5) return 'Medium'
    return 'Low'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Allocation Settings</h2>
          <p className="text-muted-foreground">
            Configure room allocation rules, preferences, and automation settings
          </p>
        </div>
        <Button onClick={handleCreateRule}>
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
            Allocation Rules ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRules ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading rules...
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No allocation rules configured</p>
              <Button onClick={handleCreateRule}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{rule.rule_name}</span>
                        <Badge className={rule.is_active ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Type: {rule.rule_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <p className="mt-1">
                          Priority: <span className={getPriorityColor(rule.priority)}>{getPriorityLabel(rule.priority)}</span> ({rule.priority})
                        </p>
                        {rule.conditions && (
                          <p className="mt-1 text-xs">
                            Conditions: {Object.keys(rule.conditions).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleRule(rule.id, rule.is_active)}
                        title={rule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Switch checked={rule.is_active} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Create Rule Modal */}
      <CreateAllocationRuleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRuleCreated}
      />
    </div>
  )
}