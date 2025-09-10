import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'
import { ProductForm } from './components/ProductForm'
import { StockAdjustmentDialog } from './components/StockAdjustmentDialog'
import type { ProductEnhancedResponse, ProductSearchParams, ProductStatus, StockStatus } from '@/types/inventory-enhanced'
import { Search, Plus, Edit, Package, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'

export default function ProductManagement() {
  const [products, setProducts] = useState<ProductEnhancedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useState<ProductSearchParams>({
    page: 1,
    limit: 50
  })
  const [selectedProduct, setSelectedProduct] = useState<ProductEnhancedResponse | null>(null)
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [showStockDialog, setShowStockDialog] = useState(false)
  const { t } = useLanguage()
  const { formatCurrency, convertFromVND } = useCurrency()

  useEffect(() => {
    loadProducts()
  }, [searchParams])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await inventoryEnhancedApi.getProducts(searchParams)
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (search: string) => {
    setSearchParams(prev => ({ ...prev, search, page: 1 }))
  }

  const handleStatusFilter = (status: string) => {
    const statusValue = status === 'all' ? undefined : status as ProductStatus
    setSearchParams(prev => ({ ...prev, status: statusValue, page: 1 }))
  }

  const handleStockStatusFilter = (stockStatus: string) => {
    const statusValue = stockStatus === 'all' ? undefined : stockStatus as StockStatus
    setSearchParams(prev => ({ ...prev, stock_status: statusValue, page: 1 }))
  }

  const handleProductSaved = () => {
    setShowProductDialog(false)
    setSelectedProduct(null)
    loadProducts()
  }

  const handleStockAdjustment = () => {
    setShowStockDialog(false)
    setSelectedProduct(null)
    loadProducts()
  }

  const getStockStatusBadge = (status: StockStatus) => {
    if (!status) return null
    const variants = {
      in_stock: 'default',
      low_stock: 'secondary',
      out_of_stock: 'destructive',
      discontinued: 'outline'
    }
    const labels = {
      in_stock: t('inventory.inStock'),
      low_stock: t('inventory.lowStock'),
      out_of_stock: t('inventory.outOfStock'),
      discontinued: t('inventory.discontinued')
    }
    return <Badge variant={variants[status] as any}>{labels[status] || status}</Badge>
  }

  const getStatusBadge = (status: ProductStatus) => {
    if (!status) return null
    const variants = {
      active: 'default',
      inactive: 'secondary',
      discontinued: 'destructive'
    }
    const labels = {
      active: t('inventory.active'),
      inactive: t('inventory.inactive'),
      discontinued: t('inventory.discontinued')
    }
    return <Badge variant={variants[status] as any}>{labels[status] || status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('inventory.productManagement')}</h2>
          <p className="text-muted-foreground">{t('inventory.productManagementSubtitle')}</p>
        </div>
        <Button onClick={() => setShowProductDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('inventory.addProduct')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('inventory.searchProducts')}
                className="pl-10"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Select onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('inventory.productStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.allStatus')}</SelectItem>
                <SelectItem value="active">{t('inventory.active')}</SelectItem>
                <SelectItem value="inactive">{t('inventory.inactive')}</SelectItem>
                <SelectItem value="discontinued">{t('inventory.discontinued')}</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={handleStockStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('inventory.stockStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.allStock')}</SelectItem>
                <SelectItem value="in_stock">{t('inventory.inStock')}</SelectItem>
                <SelectItem value="low_stock">{t('inventory.lowStock')}</SelectItem>
                <SelectItem value="out_of_stock">{t('inventory.outOfStock')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('inventory.products')} ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">{t('inventory.loadingProducts')}...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.product')}</TableHead>
                  <TableHead>{t('inventory.sku')}</TableHead>
                  <TableHead>{t('inventory.category')}</TableHead>
                  <TableHead>{t('inventory.stock')}</TableHead>
                  <TableHead>{t('inventory.value')}</TableHead>
                  <TableHead>{t('inventory.status')}</TableHead>
                  <TableHead>{t('inventory.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image_urls && product.image_urls.length > 0 ? (
                          <img 
                            src={product.image_urls[0]} 
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.brand && (
                            <p className="text-sm text-muted-foreground">{product.brand}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {product.sku}
                      </code>
                    </TableCell>
                    <TableCell>{product.category?.name || t('inventory.uncategorized')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={
                          product.current_stock <= product.min_stock_level ? 'text-red-600 font-medium' : ''
                        }>
                          {product.current_stock} {product.unit_of_measure}
                        </span>
                        {product.current_stock <= product.min_stock_level && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('inventory.min')}: {product.min_stock_level}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatCurrency(convertFromVND(Number(product.stock_value) || 0))}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('inventory.avg')}: {formatCurrency(convertFromVND(Number(product.average_cost) || 0))}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(product.status)}
                        {getStockStatusBadge(product.stock_status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product)
                            setShowProductDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product)
                            setShowStockDialog(true)
                          }}
                        >
                          {t('inventory.adjustStock')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={selectedProduct}
            onSave={handleProductSaved}
            onCancel={() => {
              setShowProductDialog(false)
              setSelectedProduct(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      {selectedProduct && (
        <StockAdjustmentDialog
          open={showStockDialog}
          onOpenChange={setShowStockDialog}
          product={selectedProduct}
          onSuccess={handleStockAdjustment}
        />
      )}
    </div>
  )
}