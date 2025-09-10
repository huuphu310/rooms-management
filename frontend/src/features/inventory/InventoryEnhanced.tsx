import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import InventoryDashboard from './InventoryDashboard'
import ProductManagement from './ProductManagement'
import PurchaseOrderManagement from './PurchaseOrderManagement'
import { BarChart3, Package, ShoppingCart, Clipboard, Beaker, TrendingUp, Plus, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'

export default function InventoryEnhanced() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { t } = useLanguage()
  const { formatCurrency, convertFromVND } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    products: 0,
    lowStock: 0,
    orders: 0,
    recipes: 0
  })

  useEffect(() => {
    loadStatistics()
  }, [])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      // Load products count and low stock count
      const [products, orders, dashboard] = await Promise.all([
        inventoryEnhancedApi.getProducts({ limit: 1 }),
        inventoryEnhancedApi.getPurchaseOrders({ status: 'pending', limit: 1 }),
        inventoryEnhancedApi.getDashboardData()
      ])
      
      setStats({
        products: dashboard.total_products || 0,
        lowStock: dashboard.low_stock_products || 0,
        orders: dashboard.purchase_orders_pending || 0,
        recipes: 24 // This would come from a recipes API when available
      })
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{t('inventory.enhancedTitle')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('inventory.enhancedSubtitle')}
          </p>
        </div>
        <Badge variant="default" className="bg-green-600">
          {t('inventory.enhancedFeatures')}
        </Badge>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('dashboard')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.dashboard')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('inventory.overview')}</div>
            <p className="text-xs text-muted-foreground">{t('inventory.analyticsInsights')}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('products')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.products')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStock} {t('inventory.lowStock')}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('orders')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.purchaseOrders')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders}</div>
            <p className="text-xs text-muted-foreground">{t('inventory.pendingApproval')}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('recipes')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.recipesBOM')}</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recipes}</div>
            <p className="text-xs text-muted-foreground">{t('inventory.activeRecipes')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('inventory.tabDashboard')}
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('inventory.tabProducts')}
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t('inventory.tabOrders')}
          </TabsTrigger>
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            {t('inventory.tabRecipes')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Clipboard className="h-4 w-4" />
            {t('inventory.tabReports')}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('inventory.tabAnalytics')}
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
                {t('inventory.recipeBOMManagement')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Beaker className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('inventory.recipeManagement')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('inventory.recipeDescription')}
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('inventory.createRecipe')}
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
                  {t('inventory.stockValuationReport')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('inventory.stockValuationDescription')}
                </p>
                <Button size="sm" variant="outline">{t('inventory.generateReport')}</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('inventory.movementAnalysis')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('inventory.movementAnalysisDescription')}
                </p>
                <Button size="sm" variant="outline">{t('inventory.generateReport')}</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t('inventory.purchaseAnalysis')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('inventory.purchaseAnalysisDescription')}
                </p>
                <Button size="sm" variant="outline">{t('inventory.generateReport')}</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  {t('inventory.abcAnalysis')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('inventory.abcAnalysisDescription')}
                </p>
                <Button size="sm" variant="outline">{t('inventory.generateReport')}</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {t('inventory.expiryBatchReport')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('inventory.expiryBatchDescription')}
                </p>
                <Button size="sm" variant="outline">{t('inventory.generateReport')}</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('inventory.customReports')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('inventory.customReportsDescription')}
                </p>
                <Button size="sm" variant="outline">{t('inventory.createCustom')}</Button>
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
                  {t('inventory.inventoryPerformance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>{t('inventory.turnoverRatio')}</span>
                    <Badge variant="default">8.5x</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('inventory.stockAccuracy')}</span>
                    <Badge variant="default" className="bg-green-600">97.2%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('inventory.carryingCost')}</span>
                    <Badge variant="secondary">{formatCurrency(convertFromVND(12450000))}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('inventory.deadStockValue')}</span>
                    <Badge variant="destructive">{formatCurrency(convertFromVND(2100000))}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('inventory.forecasting')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">{t('inventory.demandForecasting')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('inventory.demandForecastingDescription')}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{t('inventory.reorderSuggestions')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('inventory.reorderSuggestionsDescription')}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">{t('inventory.viewForecasts')}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}