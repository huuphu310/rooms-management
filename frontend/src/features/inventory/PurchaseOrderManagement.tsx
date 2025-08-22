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

export default function PurchaseOrderManagement() {
  const [orders, setOrders] = useState<PurchaseOrderEnhancedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderEnhancedResponse | null>(null)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await inventoryEnhancedApi.getPurchaseOrders()
      setOrders(data)
    } catch (error) {
      console.error('Failed to load purchase orders:', error)
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
    switch (activeTab) {
      case 'draft':
        return orders.filter(order => order.status === 'draft')
      case 'pending':
        return orders.filter(order => ['submitted', 'approved'].includes(order.status))
      case 'received':
        return orders.filter(order => ['received', 'partial'].includes(order.status))
      default:
        return orders
    }
  }

  const getPendingOrdersCount = () => orders.filter(order => ['submitted', 'approved'].includes(order.status)).length
  const getDraftOrdersCount = () => orders.filter(order => order.status === 'draft').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">Manage procurement and stock receiving</p>
        </div>
        <Button onClick={() => setShowOrderDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Order
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Orders</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getDraftOrdersCount()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{getPendingOrdersCount()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${orders.reduce((sum, order) => sum + order.total_amount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({getDraftOrdersCount()})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({getPendingOrdersCount()})</TabsTrigger>
              <TabsTrigger value="received">Received</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center h-32">Loading orders...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredOrders().map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {order.order_number}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.supplier?.name || 'Unknown Supplier'}</p>
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
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">${order.total_amount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">
                              Subtotal: ${order.subtotal.toFixed(2)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(order.order_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {order.expected_date ? (
                            <div className={
                              new Date(order.expected_date) < new Date() && 
                              !['received'].includes(order.status) 
                                ? 'text-red-600' : ''
                            }>
                              {new Date(order.expected_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
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
                                Submit
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
            <DialogTitle>Create Purchase Order</DialogTitle>
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
      {selectedOrder && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Purchase Order {selectedOrder.order_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span>Order Date:</span>
                      <span>{new Date(selectedOrder.order_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Date:</span>
                      <span>
                        {selectedOrder.expected_date 
                          ? new Date(selectedOrder.expected_date).toLocaleDateString()
                          : 'Not set'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Supplier</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>{selectedOrder.supplier?.name}</strong></div>
                    <div>{selectedOrder.supplier?.contact_person}</div>
                    <div>{selectedOrder.supplier?.email}</div>
                    <div>{selectedOrder.supplier?.phone}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
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
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-sm text-muted-foreground">{item.product?.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.unit_cost.toFixed(2)}</TableCell>
                        <TableCell>${item.total_cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.received_quantity === item.quantity ? 'default' :
                            item.received_quantity > 0 ? 'secondary' : 'outline'
                          }>
                            {item.received_quantity} / {item.quantity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span>Subtotal:</span>
                  <span>${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Tax:</span>
                  <span>${selectedOrder.tax_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>${selectedOrder.total_amount.toFixed(2)}</span>
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