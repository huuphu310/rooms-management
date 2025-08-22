export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

export enum TransactionType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  PRODUCTION = 'production',
  CONSUMPTION = 'consumption',
  RETURN = 'return',
  DAMAGE = 'damage'
}

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  RECEIVED = 'received',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled'
}

export enum ValuationMethod {
  FIFO = 'fifo',
  LIFO = 'lifo',
  AVERAGE = 'average',
  SPECIFIC = 'specific'
}

export interface ProductCategory {
  id: string
  name: string
  parent_id?: string
  is_active: boolean
}

export interface Supplier {
  id: string
  name: string
  contact_person?: string
  email?: string
  phone: string
  address?: string
  payment_terms?: string
  is_active: boolean
}

export interface Location {
  id: string
  name: string
  address?: string
  is_main: boolean
  is_active: boolean
}

// Core Product Types
export interface ProductEnhanced {
  id: string
  name: string
  sku: string
  barcode?: string
  internal_code: string
  category_id: string
  category?: ProductCategory
  description?: string
  brand?: string
  model?: string
  track_inventory: boolean
  current_stock: number
  reserved_stock: number
  available_stock: number
  unit_of_measure: string
  cost_per_unit: number
  selling_price: number
  min_stock_level: number
  max_stock_level?: number
  reorder_point: number
  reorder_quantity: number
  lead_time_days?: number
  shelf_life_days?: number
  requires_batch_tracking: boolean
  requires_expiry_tracking: boolean
  status: ProductStatus
  stock_status: StockStatus
  supplier_id?: string
  supplier?: Supplier
  location_id?: string
  location?: Location
  tax_rate: number
  is_perishable: boolean
  storage_conditions?: string
  image_urls: string[]
  tags: string[]
  stock_value: number
  average_cost: number
  last_purchase_date?: string
  last_sale_date?: string
  total_sold: number
  total_purchased: number
  created_at: string
  updated_at: string
}

export interface ProductEnhancedCreate {
  name: string
  sku: string
  barcode?: string
  category_id: string
  description?: string
  brand?: string
  model?: string
  track_inventory: boolean
  unit_of_measure: string
  cost_per_unit: number
  selling_price: number
  min_stock_level: number
  max_stock_level?: number
  reorder_point: number
  reorder_quantity: number
  lead_time_days?: number
  shelf_life_days?: number
  requires_batch_tracking: boolean
  requires_expiry_tracking: boolean
  supplier_id?: string
  location_id?: string
  tax_rate: number
  is_perishable: boolean
  storage_conditions?: string
  image_urls?: string[]
  tags?: string[]
  initial_stock?: number
}

export interface ProductEnhancedUpdate {
  name?: string
  description?: string
  brand?: string
  model?: string
  category_id?: string
  cost_per_unit?: number
  selling_price?: number
  min_stock_level?: number
  max_stock_level?: number
  reorder_point?: number
  reorder_quantity?: number
  lead_time_days?: number
  shelf_life_days?: number
  supplier_id?: string
  location_id?: string
  tax_rate?: number
  storage_conditions?: string
  image_urls?: string[]
  tags?: string[]
  status?: ProductStatus
}

export interface ProductEnhancedResponse extends ProductEnhanced {}

export interface ProductSearchParams {
  category_id?: string
  supplier_id?: string
  location_id?: string
  status?: ProductStatus
  stock_status?: StockStatus
  search?: string
  tags?: string[]
  track_inventory?: boolean
  is_perishable?: boolean
  page?: number
  limit?: number
  sort_by?: string
  order?: 'asc' | 'desc'
}

// Stock Movement Types
export interface StockMovementEnhanced {
  id: string
  product_id: string
  product?: ProductEnhanced
  transaction_type: TransactionType
  quantity: number
  unit_cost?: number
  total_value?: number
  stock_before: number
  stock_after: number
  batch_number?: string
  expiry_date?: string
  reference_type?: string
  reference_id?: string
  location_id?: string
  location?: Location
  notes?: string
  created_by: string
  created_at: string
}

export interface StockMovementEnhancedResponse extends StockMovementEnhanced {}

export interface StockAdjustmentCreate {
  quantity: number
  reason: string
  notes?: string
  unit_cost?: number
  batch_number?: string
  expiry_date?: string
}

export interface StockTransferCreate {
  product_id: string
  from_location_id: string
  to_location_id: string
  quantity: number
  notes?: string
  batch_number?: string
}

// Purchase Order Types
export interface PurchaseOrderEnhanced {
  id: string
  order_number: string
  supplier_id: string
  supplier?: Supplier
  status: PurchaseOrderStatus
  order_date: string
  expected_date?: string
  received_date?: string
  subtotal: number
  tax_total: number
  discount_amount: number
  total_amount: number
  notes?: string
  items: PurchaseOrderItemEnhanced[]
  created_by: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItemEnhanced {
  id: string
  product_id: string
  product?: ProductEnhanced
  quantity: number
  unit_cost: number
  total_cost: number
  received_quantity: number
  tax_amount: number
  discount_amount: number
  notes?: string
}

export interface PurchaseOrderEnhancedCreate {
  supplier_id: string
  expected_date?: string
  notes?: string
  items: {
    product_id: string
    quantity: number
    unit_cost: number
    tax_amount?: number
    discount_amount?: number
    notes?: string
  }[]
}

export interface PurchaseOrderEnhancedResponse extends PurchaseOrderEnhanced {}

// Recipe Types
export interface RecipeEnhanced {
  id: string
  name: string
  description?: string
  category: string
  yield_quantity: number
  yield_unit: string
  preparation_time_minutes?: number
  cost_per_unit: number
  selling_price?: number
  is_active: boolean
  ingredients: RecipeIngredient[]
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  product_id: string
  product?: ProductEnhanced
  quantity: number
  unit: string
  cost_per_unit: number
  total_cost: number
  notes?: string
}

export interface RecipeEnhancedCreate {
  name: string
  description?: string
  category: string
  yield_quantity: number
  yield_unit: string
  preparation_time_minutes?: number
  selling_price?: number
  ingredients: {
    product_id: string
    quantity: number
    unit: string
    notes?: string
  }[]
}

export interface RecipeEnhancedResponse extends RecipeEnhanced {}

// Dashboard Types
export interface InventoryDashboardResponse {
  total_products: number
  active_products: number
  total_stock_value: number
  low_stock_products: number
  out_of_stock_products: number
  expiring_products: number
  recent_movements: StockMovementEnhanced[]
  top_selling_products: {
    product: ProductEnhanced
    quantity_sold: number
    revenue: number
  }[]
  stock_by_category: {
    category: string
    quantity: number
    value: number
  }[]
  purchase_orders_pending: number
  inventory_turnover: number
  stock_accuracy: number
}

// Batch and Expiry Tracking
export interface BatchInfo {
  batch_number: string
  expiry_date?: string
  quantity: number
  cost_per_unit: number
  supplier_id?: string
  received_date: string
}

export interface ExpiryAlert {
  id: string
  product_id: string
  product?: ProductEnhanced
  batch_number: string
  expiry_date: string
  quantity: number
  days_to_expiry: number
  severity: 'warning' | 'critical'
}