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
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { reportsApi } from '@/lib/api/reports'
import type { RevenueReport, ProfitLossReport } from '@/types/reports'
import {
  CalendarIcon,
  Download,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  PieChart,
  Loader2,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Receipt
} from 'lucide-react'

export default function FinancialReports() {
  const [activeTab, setActiveTab] = useState('revenue')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [groupBy, setGroupBy] = useState<'daily' | 'monthly' | 'yearly'>('daily')
  const [loading, setLoading] = useState(false)
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null)
  const [plReport, setPLReport] = useState<ProfitLossReport | null>(null)
  const [arReport, setARReport] = useState<any>(null)

  useEffect(() => {
    if (activeTab === 'revenue') {
      loadRevenueReport()
    } else if (activeTab === 'profit-loss') {
      loadProfitLossReport()
    } else if (activeTab === 'accounts-receivable') {
      loadAccountsReceivable()
    }
  }, [activeTab, dateRange, selectedPeriod, groupBy])

  const loadRevenueReport = async () => {
    try {
      setLoading(true)
      const report = await reportsApi.getRevenueReport(
        format(dateRange.from, 'yyyy-MM-dd'),
        format(dateRange.to, 'yyyy-MM-dd'),
        groupBy
      )
      setRevenueReport(report)
    } catch (error) {
      console.error('Failed to load revenue report:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProfitLossReport = async () => {
    try {
      setLoading(true)
      const report = await reportsApi.getProfitLossStatement(selectedPeriod)
      setPLReport(report)
    } catch (error) {
      console.error('Failed to load P&L report:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAccountsReceivable = async () => {
    try {
      setLoading(true)
      const report = await reportsApi.getAccountsReceivable()
      setARReport(report)
    } catch (error) {
      console.error('Failed to load AR report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    console.log('Export report in format:', format)
  }

  const getChangeIndicator = (value: number) => {
    if (value > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUpRight className="h-4 w-4" />
          <span className="text-sm font-medium">+{value.toFixed(1)}%</span>
        </div>
      )
    } else if (value < 0) {
      return (
        <div className="flex items-center text-red-600">
          <ArrowDownRight className="h-4 w-4" />
          <span className="text-sm font-medium">{value.toFixed(1)}%</span>
        </div>
      )
    }
    return <span className="text-sm text-muted-foreground">0%</span>
  }

  const getProfitabilityColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600'
    if (margin >= 10) return 'text-blue-600'
    if (margin >= 0) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="accounts-receivable">Accounts Receivable</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (activeTab === 'revenue') loadRevenueReport()
              else if (activeTab === 'profit-loss') loadProfitLossReport()
              else if (activeTab === 'accounts-receivable') loadAccountsReceivable()
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

        {/* Revenue Analysis Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Revenue Analysis</CardTitle>
                  <CardDescription>
                    Comprehensive revenue breakdown and trends
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dateRange.from, "PP")} - {format(dateRange.to, "PP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range: any) => {
                          if (range?.from && range?.to) {
                            setDateRange({ from: range.from, to: range.to })
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : revenueReport ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsApi.formatCurrency(revenueReport.summary.total_revenue)}
                        </div>
                        {getChangeIndicator(revenueReport.summary.growth_rate)}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Room Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsApi.formatCurrency(revenueReport.summary.room_revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {((revenueReport.summary.room_revenue / revenueReport.summary.total_revenue) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">F&B Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsApi.formatCurrency(revenueReport.summary.fnb_revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {((revenueReport.summary.fnb_revenue / revenueReport.summary.total_revenue) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">vs Last Period</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {revenueReport.summary.vs_last_period}
                        </div>
                        <p className="text-xs text-muted-foreground">Period comparison</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue by Source */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Revenue by Source</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(revenueReport.revenue_breakdown.by_source).map(([source, amount]) => {
                          const percentage = (amount / revenueReport.summary.total_revenue) * 100
                          return (
                            <div key={source} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize">{source.replace(/_/g, ' ')}</span>
                                <span className="font-medium">
                                  {reportsApi.formatCurrency(amount)}
                                </span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Revenue by Room Type */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Revenue by Room Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(revenueReport.revenue_breakdown.by_room_type).map(([type, amount]) => (
                          <div key={type} className="flex justify-between p-3 border rounded-lg">
                            <span className="font-medium">{type}</span>
                            <div className="text-right">
                              <p className="font-semibold">{reportsApi.formatCurrency(amount)}</p>
                              <p className="text-xs text-muted-foreground">
                                {((amount / revenueReport.summary.room_revenue) * 100).toFixed(1)}% of room revenue
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Year over Year Comparison */}
                  {revenueReport.year_over_year && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Year over Year</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Current Year</p>
                            <p className="text-2xl font-bold">
                              {reportsApi.formatCurrency(revenueReport.year_over_year.current_year)}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Last Year</p>
                            <p className="text-2xl font-bold">
                              {reportsApi.formatCurrency(revenueReport.year_over_year.last_year)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Growth</span>
                            {getChangeIndicator(revenueReport.year_over_year.growth_percentage)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No revenue data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="profit-loss" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Profit & Loss Statement</CardTitle>
                  <CardDescription>
                    Financial performance for the selected period
                  </CardDescription>
                </div>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : plReport ? (
                <div className="space-y-6">
                  {/* Profitability Summary */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsApi.formatCurrency(plReport.profitability.gross_profit)}
                        </div>
                        <p className={cn("text-sm", getProfitabilityColor(plReport.profitability.profit_margin))}>
                          Margin: {plReport.profitability.profit_margin.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Operating Profit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsApi.formatCurrency(plReport.profitability.operating_profit)}
                        </div>
                        <p className={cn("text-sm", getProfitabilityColor(plReport.ratios.gop_margin))}>
                          GOP Margin: {plReport.ratios.gop_margin.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsApi.formatCurrency(plReport.profitability.net_profit)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          EBITDA: {reportsApi.formatCurrency(plReport.profitability.ebitda)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 hover:bg-accent rounded">
                          <span>Room Revenue</span>
                          <span className="font-medium">
                            {reportsApi.formatCurrency(plReport.revenue.room_revenue)}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 hover:bg-accent rounded">
                          <span>Food & Beverage</span>
                          <span className="font-medium">
                            {reportsApi.formatCurrency(plReport.revenue.food_beverage)}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 hover:bg-accent rounded">
                          <span>Other Operating</span>
                          <span className="font-medium">
                            {reportsApi.formatCurrency(plReport.revenue.other_operating)}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 border-t pt-2 font-semibold">
                          <span>Total Revenue</span>
                          <span>{reportsApi.formatCurrency(plReport.revenue.total_revenue)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expense Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Operating Expenses</p>
                          <div className="space-y-1">
                            {Object.entries(plReport.expenses.operating_expenses).map(([category, amount]) => (
                              <div key={category} className="flex justify-between p-2 hover:bg-accent rounded text-sm">
                                <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                                <span>{reportsApi.formatCurrency(amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between p-2 border-t pt-2 font-semibold">
                          <span>Total Expenses</span>
                          <span>{reportsApi.formatCurrency(plReport.expenses.total_expenses)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Financial Ratios */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Key Ratios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{plReport.ratios.expense_ratio.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground">Expense Ratio</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{plReport.ratios.labor_cost_ratio.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground">Labor Cost Ratio</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{plReport.ratios.gop_margin.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground">GOP Margin</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No P&L data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Receivable Tab */}
        <TabsContent value="accounts-receivable" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable</CardTitle>
              <CardDescription>
                Outstanding balances and aging analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : arReport ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Accounts receivable report visualization coming soon...
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No AR data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}