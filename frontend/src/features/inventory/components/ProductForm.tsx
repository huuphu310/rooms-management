import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inventoryEnhancedApi } from '@/lib/api/inventory-enhanced'
import type { 
  ProductEnhancedResponse, 
  ProductEnhancedCreate, 
  ProductEnhancedUpdate,
  ProductStatus 
} from '@/types/inventory-enhanced'
import { X, Plus } from 'lucide-react'

interface ProductFormProps {
  product?: ProductEnhancedResponse | null
  onSave: () => void
  onCancel: () => void
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductEnhancedCreate | ProductEnhancedUpdate>({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    brand: '',
    model: '',
    track_inventory: true,
    unit_of_measure: 'piece',
    cost_per_unit: 0,
    selling_price: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    reorder_point: 0,
    reorder_quantity: 0,
    lead_time_days: 0,
    shelf_life_days: 0,
    requires_batch_tracking: false,
    requires_expiry_tracking: false,
    supplier_id: '',
    location_id: '',
    tax_rate: 0,
    is_perishable: false,
    storage_conditions: '',
    image_urls: [],
    tags: [],
    initial_stock: 0
  })
  const [loading, setLoading] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        category_id: product.category_id,
        description: product.description || '',
        brand: product.brand || '',
        model: product.model || '',
        cost_per_unit: product.cost_per_unit,
        selling_price: product.selling_price,
        min_stock_level: product.min_stock_level,
        max_stock_level: product.max_stock_level || 0,
        reorder_point: product.reorder_point,
        reorder_quantity: product.reorder_quantity,
        lead_time_days: product.lead_time_days || 0,
        shelf_life_days: product.shelf_life_days || 0,
        requires_batch_tracking: product.requires_batch_tracking,
        requires_expiry_tracking: product.requires_expiry_tracking,
        supplier_id: product.supplier_id || '',
        location_id: product.location_id || '',
        tax_rate: product.tax_rate,
        is_perishable: product.is_perishable,
        storage_conditions: product.storage_conditions || '',
        image_urls: product.image_urls || [],
        tags: product.tags || [],
        status: product.status
      })
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (product) {
        await inventoryEnhancedApi.updateProduct(product.id, formData as ProductEnhancedUpdate)
      } else {
        await inventoryEnhancedApi.createProduct(formData as ProductEnhancedCreate)
      }
      onSave()
    } catch (error) {
      console.error('Failed to save product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (newTag && !formData.tags?.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }))
  }

  const addImageUrl = () => {
    if (newImageUrl && !formData.image_urls?.includes(newImageUrl)) {
      setFormData(prev => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), newImageUrl]
      }))
      setNewImageUrl('')
    }
  }

  const removeImageUrl = (url: string) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls?.filter(u => u !== url) || []
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="stock">Stock Management</TabsTrigger>
          <TabsTrigger value="media">Media & Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(value) => handleInputChange('category_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cat-1">Beverages</SelectItem>
                      <SelectItem value="cat-2">Food Items</SelectItem>
                      <SelectItem value="cat-3">Cleaning Supplies</SelectItem>
                      <SelectItem value="cat-4">Amenities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit of Measure</Label>
                  <Select 
                    value={formData.unit_of_measure} 
                    onValueChange={(value) => handleInputChange('unit_of_measure', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {product && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status as string} 
                      onValueChange={(value) => handleInputChange('status', value as ProductStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_per_unit">Cost per Unit ($) *</Label>
                  <Input
                    id="cost_per_unit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_per_unit}
                    onChange={(e) => handleInputChange('cost_per_unit', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price ($) *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) => handleInputChange('selling_price', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%) </Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              {formData.selling_price && formData.cost_per_unit && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    Markup: {((formData.selling_price - formData.cost_per_unit) / formData.cost_per_unit * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm">
                    Margin: {((formData.selling_price - formData.cost_per_unit) / formData.selling_price * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="track_inventory"
                    checked={formData.track_inventory}
                    onCheckedChange={(checked) => handleInputChange('track_inventory', checked)}
                  />
                  <Label htmlFor="track_inventory">Track Inventory</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_perishable"
                    checked={formData.is_perishable}
                    onCheckedChange={(checked) => handleInputChange('is_perishable', checked)}
                  />
                  <Label htmlFor="is_perishable">Perishable Item</Label>
                </div>
              </div>

              {formData.track_inventory && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_stock_level">Min Stock Level *</Label>
                      <Input
                        id="min_stock_level"
                        type="number"
                        min="0"
                        value={formData.min_stock_level}
                        onChange={(e) => handleInputChange('min_stock_level', parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_stock_level">Max Stock Level</Label>
                      <Input
                        id="max_stock_level"
                        type="number"
                        min="0"
                        value={formData.max_stock_level}
                        onChange={(e) => handleInputChange('max_stock_level', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reorder_point">Reorder Point</Label>
                      <Input
                        id="reorder_point"
                        type="number"
                        min="0"
                        value={formData.reorder_point}
                        onChange={(e) => handleInputChange('reorder_point', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
                      <Input
                        id="reorder_quantity"
                        type="number"
                        min="0"
                        value={formData.reorder_quantity}
                        onChange={(e) => handleInputChange('reorder_quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {!product && (
                    <div className="space-y-2">
                      <Label htmlFor="initial_stock">Initial Stock</Label>
                      <Input
                        id="initial_stock"
                        type="number"
                        min="0"
                        value={formData.initial_stock}
                        onChange={(e) => handleInputChange('initial_stock', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_time_days">Lead Time (days)</Label>
                  <Input
                    id="lead_time_days"
                    type="number"
                    min="0"
                    value={formData.lead_time_days}
                    onChange={(e) => handleInputChange('lead_time_days', parseInt(e.target.value) || 0)}
                  />
                </div>
                {formData.is_perishable && (
                  <div className="space-y-2">
                    <Label htmlFor="shelf_life_days">Shelf Life (days)</Label>
                    <Input
                      id="shelf_life_days"
                      type="number"
                      min="0"
                      value={formData.shelf_life_days}
                      onChange={(e) => handleInputChange('shelf_life_days', parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}
              </div>

              {formData.is_perishable && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_batch_tracking"
                      checked={formData.requires_batch_tracking}
                      onCheckedChange={(checked) => handleInputChange('requires_batch_tracking', checked)}
                    />
                    <Label htmlFor="requires_batch_tracking">Batch Tracking</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_expiry_tracking"
                      checked={formData.requires_expiry_tracking}
                      onCheckedChange={(checked) => handleInputChange('requires_expiry_tracking', checked)}
                    />
                    <Label htmlFor="requires_expiry_tracking">Expiry Tracking</Label>
                  </div>
                </div>
              )}

              {formData.storage_conditions !== undefined && (
                <div className="space-y-2">
                  <Label htmlFor="storage_conditions">Storage Conditions</Label>
                  <Textarea
                    id="storage_conditions"
                    value={formData.storage_conditions}
                    onChange={(e) => handleInputChange('storage_conditions', e.target.value)}
                    rows={2}
                    placeholder="e.g., Store in a cool, dry place"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Image URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                />
                <Button type="button" onClick={addImageUrl}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.image_urls && formData.image_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {formData.image_urls.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt={`Product ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeImageUrl(url)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
        </Button>
      </div>
    </form>
  )
}