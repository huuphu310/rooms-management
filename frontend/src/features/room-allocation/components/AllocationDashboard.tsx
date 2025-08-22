import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import type { AllocationDashboard as DashboardData } from '@/types/room-allocation'
import { 
  Home,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  RefreshCw
} from 'lucide-react'

interface AllocationDashboardProps {
  dashboardData: DashboardData | null
  onRefresh: () => void
}

export default function AllocationDashboard({ 
  dashboardData, 
  onRefresh 
}: AllocationDashboardProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Allocation Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time overview of room allocation status and performance
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Room Utilization</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData.occupancy_rate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.occupied_rooms} of {dashboardData.total_rooms} rooms occupied
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${dashboardData.occupancy_rate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardData.unassigned_summary.total_unassigned}
            </div>
            <div className="flex gap-2 mt-2">
              {dashboardData.unassigned_summary.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {dashboardData.unassigned_summary.critical} Critical
                </Badge>
              )}
              {dashboardData.unassigned_summary.warning > 0 && (
                <Badge className="bg-orange-100 text-orange-800 text-xs">
                  {dashboardData.unassigned_summary.warning} Warning
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Arrivals</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData.today_arrivals}
            </div>
            <p className="text-xs text-muted-foreground">
              Expected check-ins today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Departures</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dashboardData.today_departures}
            </div>
            <p className="text-xs text-muted-foreground">
              Expected check-outs today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Arrivals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recent_arrivals.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recent_arrivals.map((arrival, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{arrival.guest_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Room {arrival.room_number}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {arrival.time}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No arrivals yet today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Departures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Departures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.upcoming_departures.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcoming_departures.map((departure, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{departure.guest_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Room {departure.room_number}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {departure.time}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No departures scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="default">
              <AlertTriangle className="mr-2 h-4 w-4" />
              View Unassigned
            </Button>
            <Button variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Auto Assign All
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View Room Grid
            </Button>
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Block Rooms
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}