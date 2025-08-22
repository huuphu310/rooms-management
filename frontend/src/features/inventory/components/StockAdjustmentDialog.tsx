import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'
import type { ProductEnhancedResponse, StockAdjustmentCreate } from '@/types/inventory-enhanced'
import { Package, TrendingUp, TrendingDown } from 'lucide-react'

interface StockAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductEnhancedResponse
  onSuccess: () => void
}

export function StockAdjustmentDialog({ 
  open, 
  onOpenChange, 
  product, 
  onSuccess 
}: StockAdjustmentDialogProps) {
  const [formData, setFormData] = useState<StockAdjustmentCreate & { adjustment_type: 'add' | 'remove' | 'set' }>({
    quantity: 0,
    reason: '',
    notes: '',
    unit_cost: product.cost_per_unit,
    batch_number: '',
    expiry_date: '',
    adjustment_type: 'add'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      // Calculate the final quantity based on adjustment type
      let finalQuantity = formData.quantity
      if (formData.adjustment_type === 'remove') {
        finalQuantity = -Math.abs(finalQuantity)
      } else if (formData.adjustment_type === 'set') {
        finalQuantity = finalQuantity - product.current_stock
      }

      const adjustmentData: StockAdjustmentCreate = {
        quantity: finalQuantity,
        reason: formData.reason,
        notes: formData.notes,
        unit_cost: formData.unit_cost,
        batch_number: formData.batch_number || undefined,
        expiry_date: formData.expiry_date || undefined
      }

      await inventoryEnhancedApi.adjustStock(product.id, adjustmentData)
      onSuccess()
    } catch (error) {
      console.error('Failed to adjust stock:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getPreviewStock = () => {
    switch (formData.adjustment_type) {
      case 'add':
        return product.current_stock + Math.abs(formData.quantity)
      case 'remove':
        return Math.max(0, product.current_stock - Math.abs(formData.quantity))
      case 'set':
        return Math.max(0, formData.quantity)
      default:
        return product.current_stock
    }
  }

  const getAdjustmentIcon = () => {
    switch (formData.adjustment_type) {
      case 'add':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'remove':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'set':
        return <Package className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adjust Stock: {product.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{product.current_stock}</p>
                  <p className="text-sm text-muted-foreground">{product.unit_of_measure}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <Badge variant={product.stock_status === 'in_stock' ? 'default' : 
                              product.stock_status === 'low_stock' ? 'secondary' : 'destructive'}>
                  {product.stock_status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Min: {product.min_stock_level} {product.unit_of_measure}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <Select 
              value={formData.adjustment_type} 
              onValueChange={(value: 'add' | 'remove' | 'set') => handleInputChange('adjustment_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock</SelectItem>
                <SelectItem value="remove">Remove Stock</SelectItem>
                <SelectItem value="set">Set Stock Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              {formData.adjustment_type === 'set' ? 'New Stock Level' : 'Quantity'}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              placeholder={formData.adjustment_type === 'set' ? 'Set to...' : 'Amount to adjust'}
              required
            />
          </div>

          {/* Preview */}
          {formData.quantity > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAdjustmentIcon()}
                    <span className="text-sm font-medium">New Stock Level:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">
                      {getPreviewStock()} {product.unit_of_measure}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {formData.adjustment_type === 'add' ? '+' : 
                       formData.adjustment_type === 'remove' ? '-' : '='}
                      {Math.abs(formData.quantity)} {product.unit_of_measure}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unit Cost */}
          <div className="space-y-2">
            <Label htmlFor="unit_cost">Unit Cost ($)</Label>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_cost}
              onChange={(e) => handleInputChange('unit_cost', parseFloat(e.target.value) || 0)}
              placeholder="Cost per unit"
            />
          </div>

          {/* Batch and Expiry (if applicable) */}
          {product.requires_batch_tracking && (
            <div className="space-y-2">
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                value={formData.batch_number}
                onChange={(e) => handleInputChange('batch_number', e.target.value)}
                placeholder="Enter batch number"
              />
            </div>
          )}

          {product.requires_expiry_tracking && (
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleInputChange('expiry_date', e.target.value)}
              />
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value) => handleInputChange('reason', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received_stock">Stock Received</SelectItem>
                <SelectItem value="damaged_goods">Damaged Goods</SelectItem>
                <SelectItem value="theft_loss">Theft/Loss</SelectItem>
                <SelectItem value="expired_items">Expired Items</SelectItem>
                <SelectItem value="inventory_count">Inventory Count</SelectItem>
                <SelectItem value="transfer_out">Transfer Out</SelectItem>
                <SelectItem value="transfer_in">Transfer In</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this adjustment..."
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
              disabled={loading || !formData.quantity || !formData.reason}
            >
              {loading ? 'Adjusting...' : 'Adjust Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}