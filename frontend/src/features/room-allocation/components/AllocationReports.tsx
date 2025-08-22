import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp, Calendar, Users, Download } from 'lucide-react'

export default function AllocationReports() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Allocation Reports</h2>
          <p className="text-muted-foreground">
            Analytics and optimization insights for room allocation performance
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Utilization Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Room utilization rates, occupancy trends, and optimization recommendations
            </p>
            <Button size="sm" variant="outline" disabled={loading}>
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Assignment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Assignment lead times, auto vs manual rates, and efficiency metrics
            </p>
            <Button size="sm" variant="outline" disabled={loading}>
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Conflict Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Room conflicts, resolution times, and prevention strategies
            </p>
            <Button size="sm" variant="outline" disabled={loading}>
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guest Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Room preference fulfillment and guest satisfaction correlation
            </p>
            <Button size="sm" variant="outline" disabled={loading}>
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Room rate optimization and upgrade conversion analysis
            </p>
            <Button size="sm" variant="outline" disabled={loading}>
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Seasonal Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Seasonal allocation patterns and demand forecasting insights
            </p>
            <Button size="sm" variant="outline" disabled={loading}>
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Real-time Analytics</p>
                <p className="text-sm text-muted-foreground">Live performance tracking</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Trend Analysis</p>
                <p className="text-sm text-muted-foreground">Historical patterns & forecasts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Guest Insights</p>
                <p className="text-sm text-muted-foreground">Preference & satisfaction data</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Download className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Export Options</p>
                <p className="text-sm text-muted-foreground">PDF, Excel, CSV formats</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}