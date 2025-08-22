import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { reportsApi } from '@/lib/api/reports'
import type { DailyOperationsReport } from '@/types/reports'
import {
  CalendarIcon,
  Download,
  RefreshCw,
  Home,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Loader2,
  FileText,
  Settings,
  TrendingUp
} from 'lucide-react'

export default function OperationalReports() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [activeTab, setActiveTab] = useState('daily')
  const [loading, setLoading] = useState(false)
  const [dailyReport, setDailyReport] = useState<DailyOperationsReport | null>(null)
  const [occupancyData, setOccupancyData] = useState<any>(null)
  const [housekeepingData, setHousekeepingData] = useState<any>(null)

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReport()
    } else if (activeTab === 'occupancy') {
      loadOccupancyAnalysis()
    } else if (activeTab === 'housekeeping') {
      loadHousekeepingReport()
    }
  }, [activeTab, selectedDate, dateRange])

  const loadDailyReport = async () => {
    try {
      setLoading(true)
      const report = await reportsApi.getDailyOperationsReport(
        format(selectedDate, 'yyyy-MM-dd')
      )
      setDailyReport(report)
    } catch (error) {
      console.error('Failed to load daily report:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOccupancyAnalysis = async () => {
    try {
      setLoading(true)
      const data = await reportsApi.getOccupancyAnalysis(
        format(dateRange.from, 'yyyy-MM-dd'),
        format(dateRange.to, 'yyyy-MM-dd'),
        'day'
      )
      setOccupancyData(data)
    } catch (error) {
      console.error('Failed to load occupancy analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHousekeepingReport = async () => {
    try {
      setLoading(true)
      const data = await reportsApi.getHousekeepingReport(
        format(selectedDate, 'yyyy-MM-dd')
      )
      setHousekeepingData(data)
    } catch (error) {
      console.error('Failed to load housekeeping report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    // Implementation for export
    console.log('Export report in format:', format)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'bg-green-100 text-green-800'
      case 'dirty': return 'bg-red-100 text-red-800'
      case 'inspected': return 'bg-blue-100 text-blue-800'
      case 'out_of_order': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="daily">Daily Operations</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy Analysis</TabsTrigger>
            <TabsTrigger value="housekeeping">Housekeeping</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (activeTab === 'daily') loadDailyReport()
              else if (activeTab === 'occupancy') loadOccupancyAnalysis()
              else if (activeTab === 'housekeeping') loadHousekeepingReport()
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

        {/* Daily Operations Tab */}
        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Daily Operations Report</CardTitle>
                  <CardDescription>
                    Comprehensive overview of today's operations
                  </CardDescription>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
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
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : dailyReport ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          Occupancy Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dailyReport.summary.occupancy.occupancy_rate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {dailyReport.summary.occupancy.occupied_rooms} of {dailyReport.summary.occupancy.total_rooms} rooms
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          Total Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsApi.formatCurrency(dailyReport.summary.revenue.total_revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ADR: {reportsApi.formatCurrency(dailyReport.summary.revenue.adr)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          Arrivals/Departures
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <ArrowDown className="h-4 w-4 text-green-500" />
                            <span className="text-xl font-bold">
                              {dailyReport.summary.occupancy.arrivals_today}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowUp className="h-4 w-4 text-blue-500" />
                            <span className="text-xl font-bold">
                              {dailyReport.summary.occupancy.departures_today}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Check-ins/Check-outs
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          Operations Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dailyReport.summary.operations.rooms_to_clean}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Rooms to clean
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Arrivals Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Today's Arrivals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dailyReport.detailed_sections.arrivals.map((arrival) => (
                          <div key={arrival.booking_code} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{arrival.guest_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Room {arrival.room} • {arrival.nights} nights
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{arrival.status}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {arrival.check_in_time}
                              </span>
                            </div>
                          </div>
                        ))}
                        {dailyReport.detailed_sections.arrivals.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No arrivals scheduled for today
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Departures Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Today's Departures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dailyReport.detailed_sections.departures.map((departure) => (
                          <div key={departure.booking_code} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{departure.guest_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Room {departure.room}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {departure.balance_due && departure.balance_due > 0 && (
                                <Badge variant="destructive">
                                  Balance: {reportsApi.formatCurrency(departure.balance_due)}
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {departure.check_out_time}
                              </span>
                            </div>
                          </div>
                        ))}
                        {dailyReport.detailed_sections.departures.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No departures scheduled for today
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Alerts */}
                  {dailyReport.detailed_sections.alerts.length > 0 && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Operational Alerts:</strong>
                        <ul className="mt-2 space-y-1">
                          {dailyReport.detailed_sections.alerts.map((alert, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                                {alert.type}
                              </Badge>
                              <span className="text-sm">{alert.message}</span>
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No report data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupancy Analysis Tab */}
        <TabsContent value="occupancy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Analysis</CardTitle>
              <CardDescription>
                Detailed occupancy trends and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : occupancyData ? (
                <div className="space-y-4">
                  {/* Occupancy data visualization would go here */}
                  <p className="text-muted-foreground">
                    Occupancy analysis visualization coming soon...
                  </p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Select a date range to view occupancy analysis
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Housekeeping Tab */}
        <TabsContent value="housekeeping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Housekeeping Report</CardTitle>
              <CardDescription>
                Room cleaning status and staff productivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : housekeepingData ? (
                <div className="space-y-4">
                  {/* Housekeeping data would go here */}
                  <p className="text-muted-foreground">
                    Housekeeping report visualization coming soon...
                  </p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No housekeeping data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}