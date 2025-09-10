import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'
import type { PurchaseOrderEnhancedResponse } from '@/types/inventory-enhanced'
import { Package, CheckCircle, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'

interface ReceiveOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PurchaseOrderEnhancedResponse
  onSuccess: () => void
}

interface ReceiveItem {
  item_id: string
  product_name: string
  ordered_quantity: number
  received_quantity: number
  remaining_quantity: number
  new_received: number
  batch_number?: string
  expiry_date?: string
  notes?: string
}

export function ReceiveOrderDialog({ 
  open, 
  onOpenChange, 
  order, 
  onSuccess 
}: ReceiveOrderDialogProps) {
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([])
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  
  const { t } = useLanguage()
  const { formatCurrency, convertFromVND } = useCurrency()

  // Reset state when order changes or dialog opens
  React.useEffect(() => {
    if (open && order) {
      setReceiveItems(
        order.items.map(item => ({
          item_id: item.id,
          product_name: item.product?.name || 'Unknown Product',
          ordered_quantity: item.quantity || 0,
          received_quantity: item.received_quantity || 0,
          remaining_quantity: (item.quantity || 0) - (item.received_quantity || 0),
          new_received: Math.max(0, (item.quantity || 0) - (item.received_quantity || 0)),
          batch_number: '',
          expiry_date: '',
          notes: ''
        }))
      )
      setNotes('')
    }
  }, [open, order])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const itemsToReceive = receiveItems
        .filter(item => item.new_received > 0)
        .map(item => ({
          item_id: item.item_id,
          received_quantity: item.new_received
        }))

      // Allow marking as complete even if no items to receive (all items already received)
      if (itemsToReceive.length === 0) {
        // Check if all items are already complete
        const allComplete = receiveItems.every(item => item.remaining_quantity === 0)
        if (allComplete) {
          // Still call the API to mark the order as complete
          await inventoryEnhancedApi.receivePurchaseOrder(order.id, [])
          onSuccess()
          return
        } else {
          alert('Please specify quantities to receive')
          return
        }
      }

      await inventoryEnhancedApi.receivePurchaseOrder(order.id, itemsToReceive)
      onSuccess()
    } catch (error) {
      console.error('Failed to receive order:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateReceiveQuantity = (index: number, quantity: number) => {
    const newItems = [...receiveItems]
    const maxQuantity = newItems[index].remaining_quantity
    newItems[index].new_received = Math.min(Math.max(0, quantity), maxQuantity)
    setReceiveItems(newItems)
  }

  const getTotalReceiving = () => {
    return receiveItems.reduce((sum, item) => sum + item.new_received, 0)
  }

  const getCompletionStatus = () => {
    const totalOrdered = receiveItems.reduce((sum, item) => sum + item.ordered_quantity, 0)
    const totalReceived = receiveItems.reduce((sum, item) => sum + item.received_quantity + item.new_received, 0)
    return { totalOrdered, totalReceived, isComplete: totalReceived === totalOrdered }
  }

  const { totalOrdered, totalReceived, isComplete } = getCompletionStatus()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('inventory.receiveOrder')}: {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t('inventory.supplier')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="font-medium">{order.supplier?.name}</p>
                  <p className="text-sm text-muted-foreground">{order.supplier?.contact_person}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t('inventory.orderStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant={order.status === 'approved' ? 'default' : 'secondary'}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Expected: {order.expected_date ? new Date(order.expected_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t('inventory.completion')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                  <div>
                    <p className="font-medium">{totalReceived} / {totalOrdered}</p>
                    <p className="text-sm text-muted-foreground">
                      {isComplete ? 'Complete' : 'Partial'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Receive Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items to Receive</CardTitle>
              <p className="text-sm text-muted-foreground">
                Specify the quantities you're receiving for each item
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Previously Received</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Receiving Now</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiveItems.map((item, index) => (
                    <TableRow key={item.item_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.find(i => i.id === item.item_id)?.product?.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.ordered_quantity}</span>
                      </TableCell>
                      <TableCell>
                        {item.received_quantity > 0 ? (
                          <Badge variant="secondary">{item.received_quantity}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={item.remaining_quantity > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                          {item.remaining_quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={item.remaining_quantity}
                          value={item.new_received}
                          onChange={(e) => updateReceiveQuantity(index, parseInt(e.target.value) || 0)}
                          className="w-24"
                          disabled={item.remaining_quantity === 0}
                        />
                      </TableCell>
                      <TableCell>
                        {item.remaining_quantity === 0 ? (
                          <Badge variant="default" className="bg-green-600">Complete</Badge>
                        ) : item.new_received === item.remaining_quantity ? (
                          <Badge variant="default" className="bg-green-600">Will Complete</Badge>
                        ) : item.new_received > 0 ? (
                          <Badge variant="secondary">Partial</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary */}
          {getTotalReceiving() > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Total Items Receiving:</p>
                    <p className="text-sm text-muted-foreground">
                      This will update your inventory levels
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{getTotalReceiving()}</p>
                    <p className="text-sm text-muted-foreground">
                      {isComplete ? 'Order Complete' : 'Partial Delivery'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Delivery Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about the delivery condition, damages, discrepancies, etc."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Processing...' : 
                getTotalReceiving() === 0 ? 'Mark as Complete' : 
                `Receive ${getTotalReceiving()} Items`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}