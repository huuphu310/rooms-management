import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'
import type { 
  PurchaseOrderEnhancedCreate,
  ProductEnhancedResponse,
  Supplier
} from '@/types/inventory-enhanced'
import { Plus, Trash2, Search } from 'lucide-react'

interface PurchaseOrderFormProps {
  onSave: () => void
  onCancel: () => void
}

interface OrderItem {
  product_id: string
  product?: ProductEnhancedResponse
  quantity: number
  unit_cost: number
  tax_amount: number
  discount_amount: number
  notes: string
}

export function PurchaseOrderForm({ onSave, onCancel }: PurchaseOrderFormProps) {
  const [formData, setFormData] = useState<Omit<PurchaseOrderEnhancedCreate, 'items'>>({
    supplier_id: '',
    expected_date: '',
    notes: ''
  })
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<ProductEnhancedResponse[]>([])
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadSuppliers()
    loadProducts()
  }, [])

  const loadSuppliers = async () => {
    // Mock suppliers for now
    setSuppliers([
      { id: 'sup-1', name: 'ABC Supplies', contact_person: 'John Doe', email: 'john@abc.com', phone: '123-456-7890', is_active: true },
      { id: 'sup-2', name: 'XYZ Distributors', contact_person: 'Jane Smith', email: 'jane@xyz.com', phone: '098-765-4321', is_active: true }
    ])
  }

  const loadProducts = async () => {
    try {
      const data = await inventoryEnhancedApi.getProducts()
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      alert('Please add at least one item to the order')
      return
    }

    try {
      setLoading(true)
      const orderData: PurchaseOrderEnhancedCreate = {
        ...formData,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          tax_amount: item.tax_amount,
          discount_amount: item.discount_amount,
          notes: item.notes || undefined
        }))
      }
      
      await inventoryEnhancedApi.createPurchaseOrder(orderData)
      onSave()
    } catch (error) {
      console.error('Failed to create purchase order:', error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = (product: ProductEnhancedResponse) => {
    const existingItem = items.find(item => item.product_id === product.id)
    if (existingItem) {
      setItems(items.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setItems([...items, {
        product_id: product.id,
        product,
        quantity: 1,
        unit_cost: product.cost_per_unit,
        tax_amount: 0,
        discount_amount: 0,
        notes: ''
      }])
    }
    setShowProductDialog(false)
    setSearchTerm('')
  }

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const getOrderTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0)
    const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0)
    return { subtotal, totalTax, totalDiscount, total: subtotal + totalTax - totalDiscount }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const { subtotal, totalTax, totalDiscount, total } = getOrderTotal()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_date">Expected Delivery Date</Label>
              <Input
                id="expected_date"
                type="date"
                value={formData.expected_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for this order..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order Items ({items.length})</CardTitle>
          <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
            <DialogTrigger asChild>
              <Button type="button" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Select Products</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.brand}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {product.sku}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className={product.current_stock <= product.min_stock_level ? 'text-red-600' : ''}>
                              {product.current_stock} {product.unit_of_measure}
                            </span>
                          </TableCell>
                          <TableCell>${product.cost_per_unit.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addItem(product)}
                            >
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items added yet. Click "Add Product" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={`${item.product_id}-${index}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">{item.product?.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.tax_amount}
                        onChange={(e) => updateItem(index, 'tax_amount', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount_amount}
                        onChange={(e) => updateItem(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${((item.quantity * item.unit_cost) + item.tax_amount - item.discount_amount).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      {items.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !formData.supplier_id || items.length === 0}
        >
          {loading ? 'Creating...' : 'Create Purchase Order'}
        </Button>
      </div>
    </form>
  )
}