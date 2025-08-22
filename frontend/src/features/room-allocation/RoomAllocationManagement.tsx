import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import type { 
  AllocationDashboard as AllocationDashboardData, 
  UnassignedBookingsResponse
} from '@/types/room-allocation'
import { 
  Calendar,
  AlertTriangle,
  Users,
  Home,
  Clock,
  CheckCircle,
  Grid3X3,
  BarChart3,
  Settings,
  Plus,
  RefreshCw
} from 'lucide-react'

// Import child components (will create these)
import RoomAllocationGrid from './components/RoomAllocationGrid'
import UnassignedBookingsPanel from './components/UnassignedBookingsPanel'
import AllocationDashboard from './components/AllocationDashboard'
import RoomBlocksManagement from './components/RoomBlocksManagement'
import AllocationReports from './components/AllocationReports'
import AllocationSettings from './components/AllocationSettings'

export default function RoomAllocationManagement() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dashboardData, setDashboardData] = useState<AllocationDashboardData | null>(null)
  const [unassignedBookings, setUnassignedBookings] = useState<UnassignedBookingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Current month for grid view
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadDashboardData(),
        loadUnassignedBookings()
      ])
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      const data = await roomAllocationApi.getAllocationDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const loadUnassignedBookings = async () => {
    try {
      const data = await roomAllocationApi.getUnassignedBookings()
      setUnassignedBookings(data)
    } catch (error) {
      console.error('Failed to load unassigned bookings:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadInitialData()
    } finally {
      setRefreshing(false)
    }
  }

  const handleAutoAssign = async () => {
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const request = {
        date_range: {
          from: tomorrow.toISOString().split('T')[0],
          to: nextWeek.toISOString().split('T')[0]
        },
        assignment_strategy: 'optimize_occupancy' as const,
        respect_preferences: true
      }

      await roomAllocationApi.autoAssignRooms(request)
      await loadInitialData() // Refresh data
    } catch (error) {
      console.error('Auto-assignment failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading room allocation system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Room Allocation Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage room assignments, optimize occupancy, and track allocation performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAutoAssign}>
            <Plus className="mr-2 h-4 w-4" />
            Auto Assign
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {unassignedBookings && unassignedBookings.summary.critical > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>URGENT:</strong> {unassignedBookings.summary.critical} bookings need immediate room assignment 
            (less than 1 hour until check-in)
            <Button 
              variant="link" 
              className="h-auto p-0 ml-2 text-red-600"
              onClick={() => setActiveTab('unassigned')}
            >
              View Details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => setActiveTab('dashboard')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData?.occupancy_rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.occupied_rooms || 0} of {dashboardData?.total_rooms || 0} rooms
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => setActiveTab('unassigned')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {unassignedBookings?.summary.total_unassigned || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {unassignedBookings?.summary.critical || 0} critical alerts
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => setActiveTab('grid')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Arrivals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData?.today_arrivals || 0}
            </div>
            <p className="text-xs text-muted-foreground">Expected check-ins</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => setActiveTab('grid')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departures</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dashboardData?.today_departures || 0}
            </div>
            <p className="text-xs text-muted-foreground">Expected check-outs</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => setActiveTab('dashboard')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData?.available_rooms || 0}
            </div>
            <p className="text-xs text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Room Grid
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Unassigned
            {unassignedBookings && unassignedBookings.summary.total_unassigned > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 text-xs">
                {unassignedBookings.summary.total_unassigned}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Blocks
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <AllocationDashboard 
            dashboardData={dashboardData}
            onRefresh={loadDashboardData}
          />
        </TabsContent>

        <TabsContent value="grid" className="space-y-6 mt-6">
          <RoomAllocationGrid 
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onAllocationChange={loadDashboardData}
          />
        </TabsContent>

        <TabsContent value="unassigned" className="space-y-6 mt-6">
          <UnassignedBookingsPanel 
            unassignedBookings={unassignedBookings}
            onBookingAssigned={loadInitialData}
            onRefresh={loadUnassignedBookings}
          />
        </TabsContent>

        <TabsContent value="blocks" className="space-y-6 mt-6">
          <RoomBlocksManagement 
            onBlockCreated={loadDashboardData}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 mt-6">
          <AllocationReports />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <AllocationSettings />
        </TabsContent>
      </Tabs>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Room Allocation Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Grid3X3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Visual Grid Management</p>
                <p className="text-sm text-muted-foreground">Monthly calendar with drag & drop</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Auto-Assignment</p>
                <p className="text-sm text-muted-foreground">Smart room allocation algorithms</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Smart Alerts</p>
                <p className="text-sm text-muted-foreground">Proactive conflict detection</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Analytics & Reports</p>
                <p className="text-sm text-muted-foreground">Utilization optimization insights</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}