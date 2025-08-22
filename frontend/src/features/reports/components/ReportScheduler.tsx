import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { reportsApi } from '@/lib/api/reports'
import type { 
  ReportDefinition, 
  ReportSchedule, 
  ReportFrequency,
  ReportFormat,
  CreateScheduleRequest 
} from '@/types/reports'
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Edit,
  Trash2,
  Power,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  FileText,
  Users,
  Settings
} from 'lucide-react'

interface ReportSchedulerProps {
  reports: ReportDefinition[]
}

export default function ReportScheduler({ reports }: ReportSchedulerProps) {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null)
  const [formData, setFormData] = useState<Partial<CreateScheduleRequest>>({
    frequency: 'daily',
    delivery_format: 'pdf',
    schedule_config: {},
    recipients: { emails: [] }
  })

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const data = await reportsApi.listSchedules()
      setSchedules(data)
    } catch (error) {
      console.error('Failed to load schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSchedule = async () => {
    if (!formData.report_id || !formData.schedule_name) return

    try {
      setLoading(true)
      const newSchedule = await reportsApi.createSchedule(formData as CreateScheduleRequest)
      setSchedules([...schedules, newSchedule])
      setCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Failed to create schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSchedule = async (scheduleId: string) => {
    try {
      const result = await reportsApi.toggleSchedule(scheduleId)
      setSchedules(schedules.map(s => 
        s.id === scheduleId ? { ...s, is_active: result.is_active } : s
      ))
    } catch (error) {
      console.error('Failed to toggle schedule:', error)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      await reportsApi.deleteSchedule(scheduleId)
      setSchedules(schedules.filter(s => s.id !== scheduleId))
    } catch (error) {
      console.error('Failed to delete schedule:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      frequency: 'daily',
      delivery_format: 'pdf',
      schedule_config: {},
      recipients: { emails: [] }
    })
    setEditingSchedule(null)
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getFrequencyLabel = (frequency: ReportFrequency) => {
    const labels: Record<ReportFrequency, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      custom: 'Custom'
    }
    return labels[frequency]
  }

  const formatNextRun = (date?: string) => {
    if (!date) return 'Not scheduled'
    const nextRun = new Date(date)
    const now = new Date()
    const diff = nextRun.getTime() - now.getTime()
    
    if (diff < 0) return 'Overdue'
    if (diff < 3600000) return `In ${Math.floor(diff / 60000)} minutes`
    if (diff < 86400000) return `In ${Math.floor(diff / 3600000)} hours`
    return nextRun.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Scheduled Reports</h3>
          <p className="text-sm text-muted-foreground">
            Automate report generation and distribution
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Schedule
        </Button>
      </div>

      {/* Active Schedules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Schedules</CardTitle>
          <CardDescription>
            {schedules.filter(s => s.is_active).length} active schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground mt-2">Loading schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No scheduled reports yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                Create your first schedule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => {
                const report = reports.find(r => r.id === schedule.report_id)
                return (
                  <div key={schedule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{schedule.schedule_name}</h4>
                          <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                            {schedule.is_active ? 'Active' : 'Paused'}
                          </Badge>
                          <Badge variant="outline">
                            {getFrequencyLabel(schedule.frequency)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Report: {report?.report_name || 'Unknown'}
                        </p>
                        
                        <div className="grid gap-2 md:grid-cols-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>Next: {formatNextRun(schedule.next_run_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(schedule.last_status)}
                            <span>Last: {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Never'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{schedule.recipients.emails?.length || 0} recipients</span>
                          </div>
                        </div>

                        {schedule.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {schedule.error_message}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => handleToggleSchedule(schedule.id)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSchedule(schedule)
                            setFormData({
                              report_id: schedule.report_id,
                              schedule_name: schedule.schedule_name,
                              frequency: schedule.frequency,
                              schedule_config: schedule.schedule_config,
                              default_parameters: schedule.default_parameters,
                              recipients: schedule.recipients,
                              delivery_format: schedule.delivery_format
                            })
                            setCreateDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Schedule Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Schedule' : 'Create Report Schedule'}
            </DialogTitle>
            <DialogDescription>
              Set up automated report generation and distribution
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Schedule Name */}
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                value={formData.schedule_name || ''}
                onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                placeholder="e.g., Daily Operations Report"
              />
            </div>

            {/* Report Selection */}
            <div className="space-y-2">
              <Label htmlFor="report">Report</Label>
              <Select
                value={formData.report_id}
                onValueChange={(value) => setFormData({ ...formData, report_id: value })}
              >
                <SelectTrigger id="report">
                  <SelectValue placeholder="Select a report" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map(report => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.report_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: ReportFrequency) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Time */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.schedule_config?.time || '09:00'}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule_config: { ...formData.schedule_config, time: e.target.value }
                  })}
                />
              </div>

              {formData.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="day-of-week">Day of Week</Label>
                  <Select
                    value={String(formData.schedule_config?.day_of_week || 1)}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      schedule_config: { ...formData.schedule_config, day_of_week: parseInt(value) }
                    })}
                  >
                    <SelectTrigger id="day-of-week">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                      <SelectItem value="0">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="day-of-month">Day of Month</Label>
                  <Input
                    id="day-of-month"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.schedule_config?.day_of_month || 1}
                    onChange={(e) => setFormData({
                      ...formData,
                      schedule_config: { ...formData.schedule_config, day_of_month: parseInt(e.target.value) }
                    })}
                  />
                </div>
              )}
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label htmlFor="recipients">Email Recipients</Label>
              <Input
                id="recipients"
                value={formData.recipients?.emails?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  recipients: { 
                    ...formData.recipients, 
                    emails: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                  }
                })}
                placeholder="email1@example.com, email2@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple emails with commas
              </p>
            </div>

            {/* Delivery Format */}
            <div className="space-y-2">
              <Label htmlFor="format">Delivery Format</Label>
              <Select
                value={formData.delivery_format}
                onValueChange={(value: ReportFormat) => setFormData({ ...formData, delivery_format: value })}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule} disabled={loading}>
              {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}