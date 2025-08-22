import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'
import type { InventoryDashboardResponse, ProductEnhancedResponse } from '@/types/inventory-enhanced'
import { Package, TrendingDown, AlertTriangle, ShoppingCart, Clock, DollarSign } from 'lucide-react'

export default function InventoryDashboard() {
  const [dashboardData, setDashboardData] = useState<InventoryDashboardResponse | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<ProductEnhancedResponse[]>([])
  const [expiringProducts, setExpiringProducts] = useState<ProductEnhancedResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [dashboard, lowStock, expiring] = await Promise.all([
        inventoryEnhancedApi.getDashboardData(),
        inventoryEnhancedApi.getLowStockProducts(),
        inventoryEnhancedApi.getExpiringProducts()
      ])
      
      setDashboardData(dashboard)
      setLowStockProducts(lowStock)
      setExpiringProducts(expiring)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading dashboard...</div>
  }

  if (!dashboardData) {
    return <div className="text-center text-muted-foreground">Failed to load dashboard data</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h2>
        <p className="text-muted-foreground">Overview of your inventory management system</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.total_products}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.active_products} active products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dashboardData.total_stock_value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Turnover: {dashboardData.inventory_turnover.toFixed(1)}x
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardData.low_stock_products}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.out_of_stock_products} out of stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.purchase_orders_pending}
            </div>
            <p className="text-xs text-muted-foreground">
              Expiring soon: {dashboardData.expiring_products}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(lowStockProducts.length > 0 || expiringProducts.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {lowStockProducts.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{lowStockProducts.length} products</strong> are running low on stock.
                <Button variant="link" className="h-auto p-0 ml-2">
                  View details
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {expiringProducts.length > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>{expiringProducts.length} products</strong> are expiring soon.
                <Button variant="link" className="h-auto p-0 ml-2">
                  View details
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Detailed Views */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements">Recent Movements</TabsTrigger>
          <TabsTrigger value="top-products">Top Products</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recent_movements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <Badge variant={
                        movement.transaction_type === 'purchase' ? 'default' :
                        movement.transaction_type === 'sale' ? 'secondary' : 'outline'
                      }>
                        {movement.transaction_type}
                      </Badge>
                      <div>
                        <p className="font-medium">{movement.product?.name || 'Unknown Product'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(movement.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {movement.transaction_type === 'sale' ? '-' : '+'}{movement.quantity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${movement.total_value?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-products">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.top_selling_products.map((item, index) => (
                  <div key={item.product.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.quantity_sold} sold</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.revenue.toFixed(2)} revenue
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Stock by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.stock_by_category.map((category) => (
                  <div key={category.category} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{category.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.quantity} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${category.value.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}