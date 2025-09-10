import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'
import type { InventoryDashboardResponse, ProductEnhancedResponse } from '@/types/inventory-enhanced'
import { Package, TrendingDown, AlertTriangle, ShoppingCart, Clock, DollarSign, TrendingUp } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'

export default function InventoryDashboard() {
  const [dashboardData, setDashboardData] = useState<InventoryDashboardResponse | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<ProductEnhancedResponse[]>([])
  const [expiringProducts, setExpiringProducts] = useState<ProductEnhancedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const { formatCurrency, convertFromVND } = useCurrency()

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
    return <div className="flex items-center justify-center h-96">{t('common.loading')}...</div>
  }

  if (!dashboardData) {
    return <div className="text-center text-muted-foreground">{t('common.loadError')}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('inventory.inventoryDashboard')}</h2>
        <p className="text-muted-foreground">{t('inventory.dashboardOverview')}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.totalProducts')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.total_products}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.active_products} {t('inventory.activeProducts')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.stockValue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(convertFromVND(Number(dashboardData.total_stock_value) || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('inventory.turnover')}: {(Number(dashboardData.inventory_turnover) || 0).toFixed(1)}x
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.lowStockItems')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardData.low_stock_products}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.out_of_stock_products} {t('inventory.outOfStock')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.pendingOrders')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.purchase_orders_pending}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('inventory.expiringSoon')}: {dashboardData.expiring_products}
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
                <strong>{lowStockProducts.length} {t('inventory.products')}</strong> {t('inventory.runningLowStock')}.
                <Button variant="link" className="h-auto p-0 ml-2">
                  {t('common.viewDetails')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {expiringProducts.length > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>{expiringProducts.length} {t('inventory.products')}</strong> {t('inventory.expiringSoonText')}.
                <Button variant="link" className="h-auto p-0 ml-2">
                  {t('common.viewDetails')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Detailed Views */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements">{t('inventory.recentMovements')}</TabsTrigger>
          <TabsTrigger value="top-products">{t('inventory.topProducts')}</TabsTrigger>
          <TabsTrigger value="categories">{t('inventory.byCategory')}</TabsTrigger>
        </TabsList>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.recentStockMovements')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dashboardData.recent_movements || []).length > 0 ? (
                  (dashboardData.recent_movements || []).map((movement) => (
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
                          {formatCurrency(convertFromVND(Number(movement.total_value) || 0))}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t('inventory.noRecentMovements')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('inventory.noRecentMovementsDescription')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-products">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.topSellingProducts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dashboardData.top_selling_products || []).length > 0 ? (
                  (dashboardData.top_selling_products || []).map((item, index) => (
                    <div key={item.product.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.quantity_sold} {t('inventory.sold')}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(convertFromVND(Number(item.revenue) || 0))} {t('inventory.revenue')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t('inventory.noTopProducts')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('inventory.noTopProductsDescription')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.stockByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dashboardData.stock_by_category || []).length > 0 ? (
                  (dashboardData.stock_by_category || []).map((category) => (
                    <div key={category.category} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{category.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.quantity} {t('inventory.items')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(convertFromVND(Number(category.value) || 0))}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t('inventory.noCategoryData')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('inventory.noCategoryDataDescription')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}