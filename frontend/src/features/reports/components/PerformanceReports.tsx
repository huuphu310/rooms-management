import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { reportsApi } from '@/lib/api/reports'
import type { KPIDashboard } from '@/types/reports'
import {
  Download,
  RefreshCw,
  Users,
  TrendingUp,
  Target,
  Award,
  Activity,
  BarChart3,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Briefcase,
  Calendar,
  DollarSign
} from 'lucide-react'

export default function PerformanceReports() {
  const [activeTab, setActiveTab] = useState('staff')
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
  )
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [loading, setLoading] = useState(false)
  const [staffPerformance, setStaffPerformance] = useState<any>(null)
  const [kpiDashboard, setKpiDashboard] = useState<KPIDashboard | null>(null)

  const departments = [
    { value: 'all', label: 'All Departments' },
    { value: 'front_desk', label: 'Front Desk' },
    { value: 'housekeeping', label: 'Housekeeping' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'food_service', label: 'Food & Service' },
    { value: 'management', label: 'Management' }
  ]

  useEffect(() => {
    if (activeTab === 'staff') {
      loadStaffPerformance()
    } else if (activeTab === 'kpi') {
      loadKPIDashboard()
    }
  }, [activeTab, selectedPeriod, selectedDepartment])

  const loadStaffPerformance = async () => {
    try {
      setLoading(true)
      const data = await reportsApi.getStaffPerformance(selectedPeriod, selectedDepartment)
      setStaffPerformance(data)
    } catch (error) {
      console.error('Failed to load staff performance:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadKPIDashboard = async () => {
    try {
      setLoading(true)
      const data = await reportsApi.getKPIDashboard()
      setKpiDashboard(data)
    } catch (error) {
      console.error('Failed to load KPI dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    console.log('Export report in format:', format)
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 75) return 'text-blue-600 bg-blue-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Good'
    if (score >= 60) return 'Satisfactory'
    return 'Needs Improvement'
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="staff">Staff Performance</TabsTrigger>
            <TabsTrigger value="kpi">KPI Tracking</TabsTrigger>
            <TabsTrigger value="productivity">Productivity Analysis</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === 'staff' && (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button variant="outline" size="sm" onClick={() => {
              if (activeTab === 'staff') loadStaffPerformance()
              else if (activeTab === 'kpi') loadKPIDashboard()
            }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReport('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Staff Performance Tab */}
        <TabsContent value="staff" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : staffPerformance ? (
            <>
              {/* Department Overview */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {staffPerformance?.total_staff || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Active employees</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {staffPerformance?.average_score?.toFixed(1) || 0}%
                    </div>
                    <Badge className={getPerformanceColor(staffPerformance?.average_score || 0)}>
                      {getPerformanceLabel(staffPerformance?.average_score || 0)}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {staffPerformance?.attendance_rate?.toFixed(1) || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">On-time arrivals</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Training Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {staffPerformance?.training_completion?.toFixed(0) || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Required modules</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>
                    Employees with highest performance scores this period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {staffPerformance?.top_performers?.map((employee: any, index: number) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">{employee.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{employee.score}%</p>
                            <Badge className={getPerformanceColor(employee.score)}>
                              {getPerformanceLabel(employee.score)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <p className="text-center text-muted-foreground py-4">
                        No performance data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Department Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Department Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {staffPerformance?.by_department?.map((dept: any) => (
                      <div key={dept.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{dept.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {dept.staff_count} staff
                            </span>
                            <Badge variant="outline">{dept.average_score.toFixed(1)}%</Badge>
                          </div>
                        </div>
                        <Progress value={dept.average_score} className="h-2" />
                      </div>
                    )) || (
                      <p className="text-center text-muted-foreground py-4">
                        No department data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Attendance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Present</span>
                        <span className="font-medium">{staffPerformance?.attendance?.present || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Late</span>
                        <span className="font-medium">{staffPerformance?.attendance?.late || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Absent</span>
                        <span className="font-medium">{staffPerformance?.attendance?.absent || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">On Leave</span>
                        <span className="font-medium">{staffPerformance?.attendance?.on_leave || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Task Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {staffPerformance?.task_completion?.completed || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Tasks completed</p>
                      </div>
                      <Progress 
                        value={
                          ((staffPerformance?.task_completion?.completed || 0) / 
                          (staffPerformance?.task_completion?.total || 1)) * 100
                        } 
                        className="h-2" 
                      />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending</span>
                        <span>{staffPerformance?.task_completion?.pending || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Training Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Completed</span>
                        <Badge variant="default">
                          {staffPerformance?.training?.completed || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">In Progress</span>
                        <Badge variant="secondary">
                          {staffPerformance?.training?.in_progress || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Not Started</span>
                        <Badge variant="outline">
                          {staffPerformance?.training?.not_started || 0}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No performance data available for this period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* KPI Tracking Tab */}
        <TabsContent value="kpi" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : kpiDashboard ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                  <CardDescription>
                    Real-time tracking of critical business metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(kpiDashboard.kpis).map(([name, data]) => (
                      <div key={name} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium capitalize">
                            {name.replace(/_/g, ' ')}
                          </h4>
                          <Badge variant={data.status === 'critical' ? 'destructive' : 'secondary'}>
                            {data.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold">{data.current}</div>
                          <Progress 
                            value={(data.current / data.target) * 100} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Target: {data.target}</span>
                            <span>Trend: {data.trend}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No KPI data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Productivity Analysis Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Productivity Analysis</CardTitle>
              <CardDescription>
                Efficiency metrics and resource utilization
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-16">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Productivity analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}