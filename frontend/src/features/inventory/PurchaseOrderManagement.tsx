import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'
import { PurchaseOrderForm } from './components/PurchaseOrderForm'
import { ReceiveOrderDialog } from './components/ReceiveOrderDialog'
import type { PurchaseOrderEnhancedResponse, PurchaseOrderStatus } from '@/types/inventory-enhanced'
import { Plus, Eye, Check, Truck, AlertCircle, Calendar } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'

export default function PurchaseOrderManagement() {
  const [orders, setOrders] = useState<PurchaseOrderEnhancedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderEnhancedResponse | null>(null)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  
  const { t } = useLanguage()
  const { formatCurrency, convertFromVND } = useCurrency()

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await inventoryEnhancedApi.getPurchaseOrders()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load purchase orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleOrderAction = async (orderId: string, action: 'submit' | 'approve' | 'receive') => {
    try {
      switch (action) {
        case 'submit':
          await inventoryEnhancedApi.submitPurchaseOrder(orderId)
          break
        case 'approve':
          await inventoryEnhancedApi.approvePurchaseOrder(orderId)
          break
        case 'receive':
          const order = orders.find(o => o.id === orderId)
          if (order) {
            setSelectedOrder(order)
            setShowReceiveDialog(true)
            return
          }
          break
      }
      await loadOrders()
    } catch (error) {
      console.error(`Failed to ${action} order:`, error)
    }
  }

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const variants = {
      draft: 'secondary',
      submitted: 'default',
      approved: 'default',
      received: 'default',
      partial: 'secondary',
      cancelled: 'destructive'
    }
    const colors = {
      draft: 'text-gray-600',
      submitted: 'text-blue-600',
      approved: 'text-green-600',
      received: 'text-green-800',
      partial: 'text-orange-600',
      cancelled: 'text-red-600'
    }
    return (
      <Badge variant={variants[status] as any} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getFilteredOrders = () => {
    const orderList = Array.isArray(orders) ? orders : []
    switch (activeTab) {
      case 'draft':
        return orderList.filter(order => order.status === 'draft')
      case 'pending':
        return orderList.filter(order => ['submitted', 'approved'].includes(order.status))
      case 'received':
        return orderList.filter(order => ['received', 'partial'].includes(order.status))
      default:
        return orderList
    }
  }

  const getPendingOrdersCount = () => (Array.isArray(orders) ? orders : []).filter(order => ['submitted', 'approved'].includes(order.status)).length
  const getDraftOrdersCount = () => (Array.isArray(orders) ? orders : []).filter(order => order.status === 'draft').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('inventory.purchaseOrders')}</h2>
          <p className="text-muted-foreground">{t('inventory.manageProcurement')}</p>
        </div>
        <Button onClick={() => setShowOrderDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('inventory.createOrder')}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.totalOrders')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.draftOrders')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getDraftOrdersCount()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.pendingOrders')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{getPendingOrdersCount()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.totalValue')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(orders.reduce((sum, order) => sum + (convertFromVND(Number(order.total_amount) || 0)), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.purchaseOrders')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t('inventory.allOrders')} ({orders.length})</TabsTrigger>
              <TabsTrigger value="draft">{t('inventory.draft')} ({getDraftOrdersCount()})</TabsTrigger>
              <TabsTrigger value="pending">{t('inventory.pending')} ({getPendingOrdersCount()})</TabsTrigger>
              <TabsTrigger value="received">{t('inventory.received')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center h-32">Loading orders...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('inventory.orderNumber')}</TableHead>
                      <TableHead>{t('inventory.supplier')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('billing.items')}</TableHead>
                      <TableHead>{t('common.total')}</TableHead>
                      <TableHead>{t('inventory.orderDate')}</TableHead>
                      <TableHead>{t('inventory.expectedDelivery')}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredOrders().map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {order.po_number || order.order_number}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.supplier_name || order.supplier?.name || 'Unknown Supplier'}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.supplier?.contact_person}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {order.items_count || order.items?.length || 0} item{(order.items_count || order.items?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(convertFromVND(Number(order.total_amount) || 0))}</p>
                            <p className="text-sm text-muted-foreground">
                              {t('common.subtotal')}: {formatCurrency(convertFromVND(Number(order.subtotal) || 0))}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(order.order_date || order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {(order.expected_delivery_date || order.expected_date) ? (
                            <div className={
                              new Date(order.expected_delivery_date || order.expected_date) < new Date() && 
                              !['received'].includes(order.status) 
                                ? 'text-red-600' : ''
                            }>
                              {new Date(order.expected_delivery_date || order.expected_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{t('inventory.notSet')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log('Opening details for order:', order)
                                setSelectedOrder(order)
                                setShowDetailsDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {order.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOrderAction(order.id, 'submit')}
                              >
                                {t('inventory.submit')}
                              </Button>
                            )}

                            {order.status === 'submitted' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOrderAction(order.id, 'approve')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}

                            {order.status === 'approved' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOrderAction(order.id, 'receive')}
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventory.newPurchaseOrder')}</DialogTitle>
          </DialogHeader>
          <PurchaseOrderForm
            onSave={() => {
              setShowOrderDialog(false)
              loadOrders()
            }}
            onCancel={() => setShowOrderDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      {selectedOrder && console.log('Selected order for dialog:', selectedOrder)}
      {selectedOrder && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t('inventory.purchaseOrders')} {selectedOrder.po_number || selectedOrder.order_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">{t('inventory.orderInformation')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span>Order Date:</span>
                      <span>{new Date(selectedOrder.order_date || selectedOrder.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Date:</span>
                      <span>
                        {(selectedOrder.expected_delivery_date || selectedOrder.expected_date) 
                          ? new Date(selectedOrder.expected_delivery_date || selectedOrder.expected_date).toLocaleDateString()
                          : 'Not set'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">{t('inventory.supplier')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>{selectedOrder.supplier_name || selectedOrder.supplier?.name || 'Unknown Supplier'}</strong></div>
                    <div>{selectedOrder.supplier?.contact_person}</div>
                    <div>{selectedOrder.supplier?.email}</div>
                    <div>{selectedOrder.supplier?.phone}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">{t('inventory.orderItems')}</h4>
                {(selectedOrder.items && selectedOrder.items.length > 0) ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Received</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                              <p className="text-sm text-muted-foreground">{item.product?.sku || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity || 0}</TableCell>
                          <TableCell>${(Number(item.unit_cost) || 0).toFixed(2)}</TableCell>
                          <TableCell>${(Number(item.total_cost || (item.quantity * item.unit_cost)) || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              item.received_quantity === item.quantity ? 'default' :
                              item.received_quantity > 0 ? 'secondary' : 'outline'
                            }>
                              {item.received_quantity || 0} / {item.quantity || 0}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No items in this order yet
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span>Subtotal:</span>
                  <span>${(Number(selectedOrder.subtotal) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Tax:</span>
                  <span>${(Number(selectedOrder.tax_total) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>${(Number(selectedOrder.total_amount) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Receive Order Dialog */}
      {selectedOrder && (
        <ReceiveOrderDialog
          open={showReceiveDialog}
          onOpenChange={setShowReceiveDialog}
          order={selectedOrder}
          onSuccess={() => {
            setShowReceiveDialog(false)
            setSelectedOrder(null)
            loadOrders()
          }}
        />
      )}
    </div>
  )
}