import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { reportsApi } from '@/lib/api/reports'
import type { ReportDefinition, KPIDashboard } from '@/types/reports'
import {
  BarChart3,
  FileText,
  DollarSign,
  Users,
  TrendingUp,
  Package,
  Shield,
  Settings,
  Calendar,
  Download,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Star,
  Bell
} from 'lucide-react'

// Import child components
import OperationalReports from './components/OperationalReports'
import FinancialReports from './components/FinancialReports'
import GuestAnalytics from './components/GuestAnalytics'
import PerformanceReports from './components/PerformanceReports'
import KPIDashboardView from './components/KPIDashboardView'
import ReportViewer from './components/ReportViewer'
import ReportScheduler from './components/ReportScheduler'
import QuickReports from './components/QuickReports'

export default function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [reports, setReports] = useState<ReportDefinition[]>([])
  const [kpiData, setKpiData] = useState<KPIDashboard | null>(null)
  const [favoriteReports, setFavoriteReports] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [reportsList, kpi] = await Promise.all([
        reportsApi.listReportDefinitions(),
        reportsApi.getKPIDashboard()
      ])
      setReports(reportsList)
      setKpiData(kpi)
      // Load favorites from local storage
      const saved = localStorage.getItem('favoriteReports')
      if (saved) {
        setFavoriteReports(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (reportId: string) => {
    const updated = favoriteReports.includes(reportId)
      ? favoriteReports.filter(id => id !== reportId)
      : [...favoriteReports, reportId]
    setFavoriteReports(updated)
    localStorage.setItem('favoriteReports', JSON.stringify(updated))
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      operational: Settings,
      financial: DollarSign,
      guest: Users,
      performance: TrendingUp,
      inventory: Package,
      compliance: Shield,
      custom: FileText
    }
    return icons[category] || FileText
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      operational: 'bg-blue-100 text-blue-800',
      financial: 'bg-green-100 text-green-800',
      guest: 'bg-purple-100 text-purple-800',
      performance: 'bg-orange-100 text-orange-800',
      inventory: 'bg-cyan-100 text-cyan-800',
      compliance: 'bg-red-100 text-red-800',
      custom: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || 
      report.report_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || report.report_category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedReports = filteredReports.reduce((acc, report) => {
    const category = report.report_category
    if (!acc[category]) acc[category] = []
    acc[category].push(report)
    return acc
  }, {} as Record<string, ReportDefinition[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive reporting and business intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadInitialData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Bell className="mr-2 h-4 w-4" />
            Subscriptions
          </Button>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Report
          </Button>
        </div>
      </div>

      {/* KPI Alerts */}
      {kpiData && kpiData.alerts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <TrendingUp className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>KPI Alerts:</strong>
            <ul className="mt-2 space-y-1">
              {kpiData.alerts.map((alert, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.kpi}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="operational">
            <Settings className="mr-2 h-4 w-4" />
            Operational
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="mr-2 h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="guest">
            <Users className="mr-2 h-4 w-4" />
            Guest
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="all">
            <FileText className="mr-2 h-4 w-4" />
            All Reports
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Clock className="mr-2 h-4 w-4" />
            Scheduled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Quick Access Reports */}
          <QuickReports 
            reports={reports.filter(r => favoriteReports.includes(r.id))}
            onRunReport={(reportId) => {
              // Handle report execution
              console.log('Run report:', reportId)
            }}
          />

          {/* KPI Dashboard */}
          {kpiData && <KPIDashboardView data={kpiData} />}

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Recently executed reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Recent reports would be loaded from execution history */}
                <div className="text-sm text-muted-foreground text-center py-4">
                  No recent reports
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="mt-6">
          <OperationalReports />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <FinancialReports />
        </TabsContent>

        <TabsContent value="guest" className="mt-6">
          <GuestAnalytics />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <PerformanceReports />
        </TabsContent>

        <TabsContent value="all" className="space-y-6 mt-6">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedCategory(null)}
              className={!selectedCategory ? 'bg-accent' : ''}
            >
              All Categories
            </Button>
            {Object.keys(groupedReports).map(category => (
              <Button
                key={category}
                variant="outline"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? 'bg-accent' : ''}
              >
                <span className="capitalize">{category}</span>
              </Button>
            ))}
          </div>

          {/* Reports Grid */}
          {Object.entries(groupedReports).map(([category, categoryReports]) => {
            const Icon = getCategoryIcon(category)
            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="capitalize">{category} Reports</CardTitle>
                      <CardDescription>{categoryReports.length} reports available</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryReports.map(report => (
                      <div
                        key={report.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{report.report_name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(report.id)
                            }}
                          >
                            <Star 
                              className={`h-4 w-4 ${
                                favoriteReports.includes(report.id) 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-400'
                              }`}
                            />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {report.description || 'No description available'}
                        </p>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline" className="text-xs">
                            {report.report_type}
                          </Badge>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                // Handle view report
                                console.log('View report:', report.id)
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => {
                                // Handle run report
                                console.log('Run report:', report.id)
                              }}
                            >
                              Run
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <ReportScheduler reports={reports} />
        </TabsContent>
      </Tabs>

      {/* Report Categories Overview */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Object.keys(groupedReports).map(category => {
          const Icon = getCategoryIcon(category)
          const count = groupedReports[category].length
          return (
            <Card 
              key={category}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setActiveTab('all')
                setSelectedCategory(category)
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize">
                  {category}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {count === 1 ? 'report' : 'reports'}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}