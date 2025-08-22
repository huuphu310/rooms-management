import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import InventoryDashboard from './InventoryDashboard'
import ProductManagement from './ProductManagement'
import PurchaseOrderManagement from './PurchaseOrderManagement'
import { BarChart3, Package, ShoppingCart, Clipboard, Beaker, TrendingUp, Plus, AlertCircle } from 'lucide-react'

export default function InventoryEnhanced() {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Mock data for quick stats in tabs
  const quickStats = {
    products: 156,
    lowStock: 12,
    orders: 8,
    recipes: 24
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Enhanced Inventory System</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive inventory management with advanced features
          </p>
        </div>
        <Badge variant="default" className="bg-green-600">
          Enhanced Features
        </Badge>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('dashboard')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dashboard</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Overview</div>
            <p className="text-xs text-muted-foreground">Analytics & insights</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('products')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.products}</div>
            <p className="text-xs text-muted-foreground">
              {quickStats.lowStock} low stock
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('orders')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.orders}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('recipes')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipes & BOM</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.recipes}</div>
            <p className="text-xs text-muted-foreground">Active recipes</p>
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
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Recipes
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Clipboard className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <InventoryDashboard />
        </TabsContent>

        <TabsContent value="products" className="space-y-6 mt-6">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="orders" className="space-y-6 mt-6">
          <PurchaseOrderManagement />
        </TabsContent>

        <TabsContent value="recipes" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Recipe & BOM Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Beaker className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Recipe Management</h3>
                <p className="text-muted-foreground mb-4">
                  Create and manage recipes with bill of materials for food production and inventory consumption tracking.
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Recipe
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Stock Valuation Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed inventory valuation using FIFO, LIFO, or average cost methods.
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Movement Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Track product movements, consumption patterns, and velocity.
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Analyze purchase orders, supplier performance, and cost trends.
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  ABC Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Categorize inventory items based on consumption value and importance.
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Expiry & Batch Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Track expiring items, batch numbers, and quality control.
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Custom Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Create custom reports with flexible filters and data export.
                </p>
                <Button size="sm" variant="outline">Create Custom</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Inventory Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Turnover Ratio</span>
                    <Badge variant="default">8.5x</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Stock Accuracy</span>
                    <Badge variant="default" className="bg-green-600">97.2%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Carrying Cost</span>
                    <Badge variant="secondary">$12,450</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Dead Stock Value</span>
                    <Badge variant="destructive">$2,100</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Forecasting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Demand Forecasting</h4>
                    <p className="text-sm text-muted-foreground">
                      AI-powered demand prediction based on historical data and seasonal trends.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Reorder Suggestions</h4>
                    <p className="text-sm text-muted-foreground">
                      Smart reorder recommendations to optimize stock levels and reduce costs.
                    </p>
                  </div>
                  <Button size="sm" variant="outline">View Forecasts</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}