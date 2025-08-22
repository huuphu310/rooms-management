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
import type { GuestDemographicsReport } from '@/types/reports'
import {
  Download,
  RefreshCw,
  Users,
  Globe,
  Calendar,
  Star,
  TrendingUp,
  BarChart3,
  PieChart,
  Loader2,
  UserCheck,
  MapPin,
  Heart,
  Briefcase,
  Home,
  CreditCard,
  Clock
} from 'lucide-react'

export default function GuestAnalytics() {
  const [activeTab, setActiveTab] = useState('demographics')
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
  )
  const [loading, setLoading] = useState(false)
  const [demographicsReport, setDemographicsReport] = useState<GuestDemographicsReport | null>(null)
  const [satisfactionData, setSatisfactionData] = useState<any>(null)

  useEffect(() => {
    if (activeTab === 'demographics') {
      loadDemographicsReport()
    } else if (activeTab === 'satisfaction') {
      loadSatisfactionReport()
    }
  }, [activeTab, selectedPeriod])

  const loadDemographicsReport = async () => {
    try {
      setLoading(true)
      const report = await reportsApi.getGuestDemographics(selectedPeriod)
      setDemographicsReport(report)
    } catch (error) {
      console.error('Failed to load demographics report:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSatisfactionReport = async () => {
    try {
      setLoading(true)
      const data = await reportsApi.getGuestSatisfaction(selectedPeriod)
      setSatisfactionData(data)
    } catch (error) {
      console.error('Failed to load satisfaction report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    console.log('Export report in format:', format)
  }

  const getNationalityColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
    return colors[index % colors.length]
  }

  const getAgeGroupIcon = (ageGroup: string) => {
    if (ageGroup.includes('18-25')) return '👦'
    if (ageGroup.includes('26-35')) return '👨'
    if (ageGroup.includes('36-45')) return '👨‍💼'
    if (ageGroup.includes('46-55')) return '👴'
    if (ageGroup.includes('56+')) return '👵'
    return '👤'
  }

  const getPurposeIcon = (purpose: string) => {
    const icons: Record<string, any> = {
      business: Briefcase,
      leisure: Heart,
      family: Home,
      event: Calendar,
      other: Users
    }
    return icons[purpose.toLowerCase()] || Users
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="demographics">Guest Demographics</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfaction Analysis</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty & Retention</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button variant="outline" size="sm" onClick={() => {
              if (activeTab === 'demographics') loadDemographicsReport()
              else if (activeTab === 'satisfaction') loadSatisfactionReport()
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

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : demographicsReport ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{demographicsReport.total_guests}</div>
                    <p className="text-xs text-muted-foreground">In {selectedPeriod}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Avg. Stay Length</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {demographicsReport.behavior_patterns.average_length_of_stay.toFixed(1)} nights
                    </div>
                    <p className="text-xs text-muted-foreground">Per booking</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Repeat Guest Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {demographicsReport.behavior_patterns.repeat_guest_rate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Returning customers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Direct Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {demographicsReport.behavior_patterns.direct_booking_rate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">No commission</p>
                  </CardContent>
                </Card>
              </div>

              {/* Nationality Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Guest Nationalities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(demographicsReport.demographics.by_nationality)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([nationality, count], index) => {
                        const percentage = (count / demographicsReport.total_guests) * 100
                        return (
                          <div key={nationality} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${getNationalityColor(index)}`} />
                                <span className="font-medium">{nationality}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold">{count}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Demographics Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Age Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Age Groups</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(demographicsReport.demographics.by_age_group).map(([ageGroup, count]) => {
                        const percentage = (count / demographicsReport.total_guests) * 100
                        return (
                          <div key={ageGroup} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getAgeGroupIcon(ageGroup)}</span>
                              <div>
                                <p className="font-medium">{ageGroup}</p>
                                <p className="text-sm text-muted-foreground">{count} guests</p>
                              </div>
                            </div>
                            <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Travel Purpose */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Travel Purpose</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(demographicsReport.demographics.by_purpose).map(([purpose, count]) => {
                        const Icon = getPurposeIcon(purpose)
                        const percentage = (count / demographicsReport.total_guests) * 100
                        return (
                          <div key={purpose} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-accent">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium capitalize">{purpose}</p>
                                <p className="text-sm text-muted-foreground">{count} bookings</p>
                              </div>
                            </div>
                            <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preferences */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Room Type Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Room Type Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(demographicsReport.preferences.room_type).map(([type, count]) => (
                        <div key={type} className="flex justify-between p-2 hover:bg-accent rounded">
                          <span>{type}</span>
                          <span className="font-medium">{count} bookings</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(demographicsReport.preferences.payment_method).map(([method, count]) => (
                        <div key={method} className="flex justify-between p-2 hover:bg-accent rounded">
                          <span className="capitalize">{method.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{count} transactions</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Behavior Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Guest Behavior Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 border rounded-lg">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {demographicsReport.behavior_patterns.booking_lead_time} days
                      </p>
                      <p className="text-sm text-muted-foreground">Avg. booking lead time</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {demographicsReport.behavior_patterns.average_length_of_stay.toFixed(1)} nights
                      </p>
                      <p className="text-sm text-muted-foreground">Avg. length of stay</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {demographicsReport.behavior_patterns.repeat_guest_rate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Repeat guest rate</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Home className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {demographicsReport.behavior_patterns.direct_booking_rate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Direct bookings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No demographics data available for this period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Satisfaction Tab */}
        <TabsContent value="satisfaction" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : satisfactionData ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Guest Satisfaction Analysis</CardTitle>
                  <CardDescription>
                    Customer feedback and ratings analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Satisfaction analysis visualization coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No satisfaction data available for this period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Loyalty Tab */}
        <TabsContent value="loyalty" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty & Retention</CardTitle>
              <CardDescription>
                Guest loyalty program and retention metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-16">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Loyalty analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}