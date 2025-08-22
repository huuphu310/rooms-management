import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { KPIDashboard, KPIData } from '@/types/reports'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Target,
  Activity,
  DollarSign,
  Users,
  Percent,
  Home,
  Calendar,
  RefreshCw,
  Download,
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

interface KPIDashboardViewProps {
  data: KPIDashboard
  onRefresh?: () => void
  onExport?: () => void
  onConfigure?: () => void
}

export default function KPIDashboardView({ 
  data, 
  onRefresh,
  onExport,
  onConfigure 
}: KPIDashboardViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleCardExpansion = (kpiName: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(kpiName)) {
      newExpanded.delete(kpiName)
    } else {
      newExpanded.add(kpiName)
    }
    setExpandedCards(newExpanded)
  }

  const getKPIIcon = (kpiName: string) => {
    const icons: Record<string, any> = {
      occupancy_rate: Home,
      adr: DollarSign,
      revpar: Activity,
      total_revenue: DollarSign,
      guest_satisfaction: Users,
      booking_conversion: Percent,
      average_los: Calendar,
      repeat_guest_rate: Users
    }
    return icons[kpiName] || Activity
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const formatKPIValue = (value: number, kpiName: string): string => {
    if (kpiName.includes('rate') || kpiName.includes('percentage')) {
      return `${value.toFixed(1)}%`
    }
    if (kpiName.includes('revenue') || kpiName === 'adr' || kpiName === 'revpar') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
      }).format(value)
    }
    if (kpiName === 'average_los') {
      return `${value.toFixed(1)} nights`
    }
    return value.toFixed(1)
  }

  const getProgressPercentage = (current: number, target: number): number => {
    if (target === 0) return 0
    const percentage = (current / target) * 100
    return Math.min(Math.max(percentage, 0), 100)
  }

  const getComparisonValue = (period: string): string => {
    const key = `vs_${period}` as keyof typeof data.period_comparison
    return data.period_comparison[key] || 'N/A'
  }

  // Group KPIs by category
  const kpiCategories = {
    occupancy: ['occupancy_rate', 'average_los'],
    financial: ['total_revenue', 'adr', 'revpar'],
    guest: ['guest_satisfaction', 'repeat_guest_rate'],
    conversion: ['booking_conversion']
  }

  const getCategoryTitle = (category: string): string => {
    const titles: Record<string, string> = {
      occupancy: 'Occupancy Metrics',
      financial: 'Financial Performance',
      guest: 'Guest Metrics',
      conversion: 'Conversion & Sales'
    }
    return titles[category] || category
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">KPI Dashboard</h2>
          <p className="text-muted-foreground">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={onConfigure}>
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>
      </div>

      {/* Period Comparison Tabs */}
      <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="day">vs Yesterday</TabsTrigger>
          <TabsTrigger value="week">vs Last Week</TabsTrigger>
          <TabsTrigger value="month">vs Last Month</TabsTrigger>
          <TabsTrigger value="year">vs Last Year</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Period Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getComparisonValue(
                  selectedPeriod === 'day' ? 'yesterday' :
                  selectedPeriod === 'week' ? 'last_week' :
                  selectedPeriod === 'month' ? 'last_month' : 'last_year'
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* KPI Categories */}
      {Object.entries(kpiCategories).map(([category, kpiNames]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-semibold">{getCategoryTitle(category)}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpiNames.map(kpiName => {
              const kpiData = data.kpis[kpiName]
              if (!kpiData) return null

              const Icon = getKPIIcon(kpiName)
              const isExpanded = expandedCards.has(kpiName)

              return (
                <Card 
                  key={kpiName}
                  className={`transition-all duration-200 ${
                    isExpanded ? 'md:col-span-2' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${getStatusColor(kpiData.status)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium">
                            {kpiName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </CardTitle>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCardExpansion(kpiName)}
                      >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Current Value */}
                      <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-bold">
                          {formatKPIValue(kpiData.current, kpiName)}
                        </div>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(kpiData.trend)}
                          <Badge variant={kpiData.status === 'critical' ? 'destructive' : 'secondary'}>
                            {kpiData.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Target Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Target</span>
                          <span className="font-medium">
                            {formatKPIValue(kpiData.target, kpiName)}
                          </span>
                        </div>
                        <Progress 
                          value={getProgressPercentage(kpiData.current, kpiData.target)} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground text-right">
                          {getProgressPercentage(kpiData.current, kpiData.target).toFixed(0)}% of target
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">vs Yesterday:</span>
                              <p className="font-medium">{data.period_comparison.vs_yesterday}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">vs Last Week:</span>
                              <p className="font-medium">{data.period_comparison.vs_last_week}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">vs Last Month:</span>
                              <p className="font-medium">{data.period_comparison.vs_last_month}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">vs Last Year:</span>
                              <p className="font-medium">{data.period_comparison.vs_last_year}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* Active Alerts */}
      {data.alerts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Active KPI Alerts
            </CardTitle>
            <CardDescription>
              {data.alerts.length} alert{data.alerts.length !== 1 ? 's' : ''} require attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-orange-50">
                  <Badge 
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="mt-0.5"
                  >
                    {alert.severity}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.kpi}</p>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}