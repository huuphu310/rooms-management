import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import type { BillingDashboard, TodaySummary } from '@/types/billing-enhanced'
import { 
  DollarSign, 
  CreditCard, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Receipt,
  Users,
  Calendar
} from 'lucide-react'

export default function BillingDashboardComponent() {
  const [dashboardData, setDashboardData] = useState<BillingDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await billingEnhancedApi.getBillingDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load billing dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading billing dashboard...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load billing dashboard data. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  const { today_summary, payment_trend, top_pending } = dashboardData

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Billing Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor payment performance and manage financial operations
        </p>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(today_summary.total_collected)}
            </div>
            <p className="text-xs text-muted-foreground">
              From completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(today_summary.pending_payments)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(today_summary.overdue_amount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Generated</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {today_summary.invoices_generated}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for overdue payments */}
      {today_summary.overdue_amount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{formatCurrency(today_summary.overdue_amount)}</strong> in overdue payments requires attention.
            <Button variant="link" className="h-auto p-0 ml-2">
              View overdue invoices
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Views */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Payment Trends</TabsTrigger>
          <TabsTrigger value="pending">Top Pending</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="invoices">Recent Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Last 7 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payment_trend.last_7_days.length > 0 ? (
                    payment_trend.last_7_days.map((day, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm text-muted-foreground">{day.date}</span>
                        <span className="font-medium">{formatCurrency(day.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No payment data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Last 30 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payment_trend.last_30_days.length > 0 ? (
                    payment_trend.last_30_days.slice(0, 10).map((day, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm text-muted-foreground">{day.date}</span>
                        <span className="font-medium">{formatCurrency(day.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No payment data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Top Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top_pending.length > 0 ? (
                <div className="space-y-4">
                  {top_pending.map((pending, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={pending.days_overdue > 0 ? 'destructive' : 'secondary'}>
                          {pending.days_overdue > 0 ? `${pending.days_overdue} days overdue` : 'Due soon'}
                        </Badge>
                        <div>
                          <p className="font-medium">{pending.booking}</p>
                          <p className="text-sm text-muted-foreground">
                            {pending.days_overdue > 0 ? 'Overdue' : 'Pending payment'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(pending.amount)}</p>
                        <Button variant="outline" size="sm" className="mt-1">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Pending Payments</h3>
                  <p className="text-muted-foreground">All payments are up to date!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cash Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(0)}</div>
                <p className="text-sm text-muted-foreground">Today's cash transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Card Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(0)}</div>
                <p className="text-sm text-muted-foreground">Credit & debit cards</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bank Transfers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(0)}</div>
                <p className="text-sm text-muted-foreground">Direct transfers</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Recent Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Recent Invoices</h3>
                <p className="text-muted-foreground mb-4">
                  View and manage recently created invoices
                </p>
                <Button variant="outline">
                  View All Invoices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="default">
              <Receipt className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
            <Button variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
            <Button variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              View Overdue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}