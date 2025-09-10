import { api } from '../api'
import type {
  ProductEnhancedCreate,
  ProductEnhancedResponse,
  ProductEnhancedUpdate,
  ProductSearchParams,
  StockAdjustmentCreate,
  StockTransferCreate,
  PurchaseOrderEnhancedCreate,
  PurchaseOrderEnhancedResponse,
  RecipeEnhancedCreate,
  RecipeEnhancedResponse,
  InventoryDashboardResponse,
  StockMovementEnhancedResponse
} from '@/types/inventory-enhanced'

// Products
export const inventoryEnhancedApi = {
  // Products
  async getProducts(params?: ProductSearchParams): Promise<ProductEnhancedResponse[]> {
    const { data } = await api.get('/inventory-enhanced/products', { params })
    // Handle paginated response - extract the data array
    return data.data || data
  },

  async getProduct(id: string): Promise<ProductEnhancedResponse> {
    const { data } = await api.get(`/inventory-enhanced/products/${id}`)
    return data
  },

  async createProduct(product: ProductEnhancedCreate): Promise<ProductEnhancedResponse> {
    const { data } = await api.post('/inventory-enhanced/products', product)
    return data
  },

  async updateProduct(id: string, product: ProductEnhancedUpdate): Promise<ProductEnhancedResponse> {
    const { data } = await api.put(`/inventory-enhanced/products/${id}`, product)
    return data
  },

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/inventory-enhanced/products/${id}`)
  },

  // Stock Management
  async adjustStock(productId: string, adjustment: StockAdjustmentCreate): Promise<StockMovementEnhancedResponse> {
    const { data } = await api.post(`/inventory-enhanced/products/${productId}/adjust-stock`, adjustment)
    return data
  },

  async transferStock(transfer: StockTransferCreate): Promise<StockMovementEnhancedResponse[]> {
    const { data } = await api.post('/inventory-enhanced/stock/transfer', transfer)
    return data
  },

  async getStockMovements(productId?: string, limit?: number): Promise<StockMovementEnhancedResponse[]> {
    const params = { product_id: productId, limit }
    const { data } = await api.get('/inventory-enhanced/stock-movements', { params })
    return data
  },

  // Purchase Orders
  async getPurchaseOrders(): Promise<PurchaseOrderEnhancedResponse[]> {
    const { data } = await api.get('/inventory-enhanced/purchase-orders')
    // Handle paginated response - extract the data array
    return data.data || data
  },

  async getPurchaseOrder(id: string): Promise<PurchaseOrderEnhancedResponse> {
    const { data } = await api.get(`/inventory-enhanced/purchase-orders/${id}`)
    return data
  },

  async createPurchaseOrder(order: PurchaseOrderEnhancedCreate): Promise<PurchaseOrderEnhancedResponse> {
    const { data } = await api.post('/inventory-enhanced/purchase-orders', order)
    return data
  },

  async submitPurchaseOrder(id: string): Promise<PurchaseOrderEnhancedResponse> {
    const { data } = await api.post(`/inventory-enhanced/purchase-orders/${id}/submit`)
    return data
  },

  async approvePurchaseOrder(id: string): Promise<PurchaseOrderEnhancedResponse> {
    const { data } = await api.post(`/inventory-enhanced/purchase-orders/${id}/approve`)
    return data
  },

  async receivePurchaseOrder(id: string, items: Array<{item_id: string, received_quantity: number}>): Promise<PurchaseOrderEnhancedResponse> {
    const { data } = await api.post(`/inventory-enhanced/purchase-orders/${id}/receive`, { items })
    return data
  },

  // Recipes
  async getRecipes(): Promise<RecipeEnhancedResponse[]> {
    const { data } = await api.get('/inventory-enhanced/recipes')
    return data
  },

  async getRecipe(id: string): Promise<RecipeEnhancedResponse> {
    const { data } = await api.get(`/inventory-enhanced/recipes/${id}`)
    return data
  },

  async createRecipe(recipe: RecipeEnhancedCreate): Promise<RecipeEnhancedResponse> {
    const { data } = await api.post('/inventory-enhanced/recipes', recipe)
    return data
  },

  async produceFromRecipe(id: string, quantity: number): Promise<void> {
    await api.post(`/inventory-enhanced/recipes/${id}/produce`, { quantity })
  },

  // Dashboard
  async getDashboardData(): Promise<InventoryDashboardResponse> {
    const { data } = await api.get('/inventory-enhanced/dashboard')
    return data
  },

  async getLowStockProducts(): Promise<ProductEnhancedResponse[]> {
    const { data } = await api.get('/inventory-enhanced/products/low-stock')
    return data
  },

  async getExpiringProducts(): Promise<ProductEnhancedResponse[]> {
    const { data } = await api.get('/inventory-enhanced/products/expiring')
    return data
  },

  // Integration
  async consumeForRoomService(items: Array<{product_id: string, quantity: number, room_id: string}>): Promise<void> {
    await api.post('/inventory-enhanced/integration/room-service', { items })
  },

  async consumeForPOS(items: Array<{product_id: string, quantity: number}>): Promise<void> {
    await api.post('/inventory-enhanced/integration/pos', { items })
  }
}