"""Enhanced Inventory Service based on documentation"""
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID, uuid4
import uuid
import logging
from decimal import Decimal
from collections import defaultdict

from supabase import Client
from app.core.redis_client import CacheService
from app.schemas.inventory_enhanced import (
    # Enums
    ProductStatus, TransactionType, ValuationMethod, PurchaseOrderStatus,
    PaymentStatus, ReceivingStatus, QualityCheckStatus, StockLevel, ExpiryStatus,
    
    # Models
    ProductEnhanced, ProductEnhancedCreate, ProductEnhancedUpdate, ProductEnhancedResponse,
    SupplierEnhanced, SupplierEnhancedCreate, SupplierEnhancedUpdate, SupplierEnhancedResponse,
    PurchaseOrderEnhanced, PurchaseOrderEnhancedCreate, PurchaseOrderEnhancedResponse,
    PurchaseOrderItemEnhanced, RecipeEnhanced, RecipeEnhancedCreate, RecipeEnhancedResponse,
    InventoryTransaction, InventoryTransactionResponse, InventoryValuation,
    InventoryLocationCreate, InventoryLocationResponse,
    
    # Dashboard and Reports
    InventoryDashboard, StockStatusReport, ExpiryAlert, PurchaseAnalysis, ConsumptionPattern,
    
    # Search Parameters
    InventorySearchParams, PurchaseOrderSearchParams, TransactionSearchParams,
    
    # List Responses
    InventoryListResponse, PurchaseOrderListResponse, SupplierListResponse, TransactionListResponse
)
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException

logger = logging.getLogger(__name__)


class InventoryServiceEnhanced:
    def __init__(self, db: Client, cache: Optional[CacheService] = None):
        self.db = db
        self.cache = cache
        
    # Product Management
    async def create_product(self, product_data: ProductEnhancedCreate) -> ProductEnhancedResponse:
        """Create a new product with enhanced features"""
        try:
            # Check for duplicate SKU
            existing = self.db.table("products").select("id").eq("sku", product_data.sku).execute()
            if existing.data:
                raise ConflictException(f"Product with SKU '{product_data.sku}' already exists")
            
            # Generate internal code if not provided
            if not product_data.internal_code:
                product_data.internal_code = f"PRD{str(uuid4())[:8].upper()}"
            
            # Prepare data for insertion
            product_dict = product_data.dict(exclude={'initial_stock', 'initial_location_id'})
            
            # Set computed fields
            if product_data.markup_percentage and product_data.standard_cost:
                product_dict['selling_price'] = product_data.standard_cost * (1 + product_data.markup_percentage / 100)
            
            # Create product
            response = self.db.table("products").insert(product_dict).execute()
            
            if not response.data:
                raise BadRequestException("Failed to create product")
            
            product_id = response.data[0]['id']
            
            # Create initial stock transaction if provided
            if product_data.initial_stock > 0:
                await self._create_stock_transaction(
                    product_id=UUID(product_id),
                    location_id=product_data.initial_location_id,
                    transaction_type=TransactionType.ADJUSTMENT,
                    quantity=product_data.initial_stock,
                    unit_cost=product_data.standard_cost,
                    notes="Initial stock",
                    reference_type="initial_stock"
                )
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("products:*")
            
            return await self.get_product(UUID(product_id))
            
        except Exception as e:
            logger.error(f"Error creating product: {str(e)}")
            raise
    
    async def get_product(self, product_id: UUID) -> ProductEnhancedResponse:
        """Get product with enhanced information"""
        try:
            # Check cache first
            cache_key = f"products:{product_id}"
            if self.cache:
                cached = await self.cache.get(cache_key)
                if cached:
                    return ProductEnhancedResponse.parse_obj(cached)
            
            # Get product with joins
            response = self.db.table("products").select(
                "*,category:product_categories(name),supplier:suppliers(name)"
            ).eq("id", str(product_id)).single().execute()
            
            if not response.data:
                raise NotFoundException("Product not found")
            
            product_data = response.data
            
            # Calculate enhanced fields
            product_data['stock_level'] = self._calculate_stock_level(product_data)
            product_data['stock_value'] = product_data['current_stock'] * product_data['standard_cost']
            product_data['category_name'] = product_data.get('category', {}).get('name')
            product_data['supplier_name'] = product_data.get('supplier', {}).get('name')
            
            # Get expiry information
            expiry_info = await self._get_next_expiry_info(product_id)
            product_data['expiry_status'] = expiry_info['status']
            product_data['next_expiry_date'] = expiry_info['next_expiry_date']
            
            # Get last movement date
            product_data['days_since_last_movement'] = await self._get_days_since_last_movement(product_id)
            
            result = ProductEnhancedResponse(**product_data)
            
            # Cache result
            if self.cache:
                await self.cache.set(cache_key, result.dict(), ttl=300)  # 5 minutes
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting product {product_id}: {str(e)}")
            raise
    
    async def search_products(self, params: InventorySearchParams) -> InventoryListResponse:
        """Search products with enhanced filtering"""
        try:
            query = self.db.table("products").select(
                "*,category:product_categories(name),supplier:suppliers(name)",
                count="exact"
            )
            
            # Apply filters
            if params.search:
                query = query.or_(f"name.ilike.%{params.search}%,sku.ilike.%{params.search}%")
            
            if params.category_id:
                query = query.eq("category_id", str(params.category_id))
            
            if params.supplier_id:
                query = query.eq("primary_supplier_id", str(params.supplier_id))
            
            if params.status:
                query = query.eq("status", params.status.value)
            
            if params.is_active is not None:
                query = query.eq("is_active", params.is_active)
            
            # Stock level filtering
            if params.stock_level:
                if params.stock_level == StockLevel.CRITICAL:
                    query = query.lte("current_stock", "min_stock_level")
                elif params.stock_level == StockLevel.LOW:
                    query = query.lte("current_stock", "reorder_point")
                elif params.stock_level == StockLevel.EXCESS:
                    query = query.gte("current_stock", "max_stock_level")
            
            # Pagination and sorting
            offset = (params.page - 1) * params.limit
            query = query.range(offset, offset + params.limit - 1)
            query = query.order(params.sort_by, desc=(params.order == "desc"))
            
            response = query.execute()
            
            # Process results
            products = []
            for product_data in response.data:
                # Calculate enhanced fields
                product_data['stock_level'] = self._calculate_stock_level(product_data)
                product_data['stock_value'] = product_data['current_stock'] * product_data.get('standard_cost', 0)
                product_data['category_name'] = product_data.get('category', {}).get('name')
                product_data['supplier_name'] = product_data.get('supplier', {}).get('name')
                
                products.append(ProductEnhancedResponse(**product_data))
            
            # Pagination info
            total = response.count if response.count is not None else len(response.data)
            pagination = {
                "page": params.page,
                "limit": params.limit,
                "total": total,
                "total_pages": (total + params.limit - 1) // params.limit
            }
            
            return InventoryListResponse(data=products, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error searching products: {str(e)}")
            raise
    
    async def update_product(self, product_id: UUID, product_data: ProductEnhancedUpdate) -> ProductEnhancedResponse:
        """Update product with enhanced validation"""
        try:
            # Check if product exists
            existing = self.db.table("products").select("*").eq("id", str(product_id)).single().execute()
            if not existing.data:
                raise NotFoundException("Product not found")
            
            # Prepare update data
            update_dict = product_data.dict(exclude_unset=True)
            
            # Recalculate selling price if markup changed
            if 'markup_percentage' in update_dict and existing.data.get('standard_cost'):
                standard_cost = existing.data['standard_cost']
                markup = update_dict['markup_percentage']
                update_dict['selling_price'] = standard_cost * (1 + markup / 100)
            
            # Update product
            response = self.db.table("products").update(update_dict).eq(
                "id", str(product_id)
            ).execute()
            
            if not response.data:
                raise BadRequestException("Failed to update product")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern(f"products:{product_id}:*")
                await self.cache.delete_pattern("products:list:*")
            
            return await self.get_product(product_id)
            
        except Exception as e:
            logger.error(f"Error updating product {product_id}: {str(e)}")
            raise
    
    # Stock Management
    async def adjust_stock(
        self, 
        product_id: UUID, 
        new_quantity: Decimal, 
        location_id: Optional[UUID] = None,
        reason: str = "Manual adjustment",
        notes: Optional[str] = None
    ) -> InventoryTransactionResponse:
        """Adjust stock with full transaction tracking"""
        try:
            # Get current stock
            product = await self.get_product(product_id)
            current_stock = product.current_stock
            
            # Calculate adjustment
            adjustment_quantity = new_quantity - current_stock
            
            if adjustment_quantity == 0:
                raise BadRequestException("No stock adjustment needed")
            
            # Create transaction
            transaction = await self._create_stock_transaction(
                product_id=product_id,
                location_id=location_id,
                transaction_type=TransactionType.ADJUSTMENT,
                quantity=abs(adjustment_quantity),
                reference_type="stock_adjustment",
                notes=f"{reason}. {notes}" if notes else reason
            )
            
            return transaction
            
        except Exception as e:
            logger.error(f"Error adjusting stock for product {product_id}: {str(e)}")
            raise
    
    async def transfer_stock(
        self,
        product_id: UUID,
        from_location_id: UUID,
        to_location_id: UUID,
        quantity: Decimal,
        notes: Optional[str] = None
    ) -> Tuple[InventoryTransactionResponse, InventoryTransactionResponse]:
        """Transfer stock between locations"""
        try:
            # Validate locations exist
            locations = self.db.table("inventory_locations").select("id").in_(
                "id", [str(from_location_id), str(to_location_id)]
            ).execute()
            
            if len(locations.data) != 2:
                raise BadRequestException("Invalid location IDs")
            
            # Create out transaction
            out_transaction = await self._create_stock_transaction(
                product_id=product_id,
                location_id=from_location_id,
                transaction_type=TransactionType.TRANSFER,
                quantity=-quantity,  # Negative for outgoing
                reference_type="stock_transfer",
                reference_id=to_location_id,
                notes=f"Transfer to location {to_location_id}. {notes}" if notes else f"Transfer to location {to_location_id}"
            )
            
            # Create in transaction
            in_transaction = await self._create_stock_transaction(
                product_id=product_id,
                location_id=to_location_id,
                transaction_type=TransactionType.TRANSFER,
                quantity=quantity,  # Positive for incoming
                reference_type="stock_transfer",
                reference_id=from_location_id,
                notes=f"Transfer from location {from_location_id}. {notes}" if notes else f"Transfer from location {from_location_id}"
            )
            
            return out_transaction, in_transaction
            
        except Exception as e:
            logger.error(f"Error transferring stock: {str(e)}")
            raise
    
    # Purchase Order Management
    async def create_purchase_order(self, po_data: PurchaseOrderEnhancedCreate) -> PurchaseOrderEnhancedResponse:
        """Create purchase order with enhanced features"""
        try:
            # Generate PO number
            po_number = await self._generate_po_number()
            
            # Calculate totals
            subtotal = sum(item.line_total for item in po_data.items)
            tax_amount = sum(item.tax_amount for item in po_data.items)
            total_amount = subtotal + tax_amount + (po_data.shipping_cost or 0) - (po_data.discount_amount or 0)
            
            # Prepare PO data
            po_dict = po_data.dict(exclude={'items'})
            po_dict.update({
                'po_number': po_number,
                'subtotal': subtotal,
                'tax_amount': tax_amount,
                'total_amount': total_amount,
                'status': PurchaseOrderStatus.DRAFT.value
            })
            
            # Set payment due date based on terms
            if po_data.payment_terms:
                terms_days = self._parse_payment_terms(po_data.payment_terms)
                if terms_days:
                    po_dict['payment_due_date'] = po_data.order_date + timedelta(days=terms_days)
            
            # Create PO
            response = self.db.table("purchase_orders").insert(po_dict).execute()
            
            if not response.data:
                raise BadRequestException("Failed to create purchase order")
            
            po_id = UUID(response.data[0]['id'])
            
            # Create PO items
            for item in po_data.items:
                item_dict = item.dict()
                item_dict['po_id'] = str(po_id)
                
                self.db.table("purchase_order_items").insert(item_dict).execute()
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("purchase_orders:*")
            
            return await self.get_purchase_order(po_id)
            
        except Exception as e:
            logger.error(f"Error creating purchase order: {str(e)}")
            raise
    
    async def get_purchase_order(self, po_id: UUID) -> PurchaseOrderEnhancedResponse:
        """Get purchase order with items"""
        try:
            # Get PO with supplier info
            response = self.db.table("purchase_orders").select(
                "*,supplier:suppliers(name)"
            ).eq("id", str(po_id)).single().execute()
            
            if not response.data:
                raise NotFoundException("Purchase order not found")
            
            po_data = response.data
            po_data['supplier_name'] = po_data.get('supplier', {}).get('name', '')
            
            # Get PO items
            items_response = self.db.table("purchase_order_items").select(
                "*,product:products(name)"
            ).eq("po_id", str(po_id)).execute()
            
            items = []
            for item_data in items_response.data or []:
                item_data['product_name'] = item_data.get('product', {}).get('name', '')
                item_data['remaining_quantity'] = item_data['ordered_quantity'] - item_data['received_quantity']
                items.append(item_data)
            
            po_data['items'] = items
            po_data['items_count'] = len(items)
            
            # Calculate received percentage
            total_ordered = sum(item['ordered_quantity'] for item in items)
            total_received = sum(item['received_quantity'] for item in items)
            po_data['received_percentage'] = (total_received / total_ordered * 100) if total_ordered > 0 else 0
            
            return PurchaseOrderEnhancedResponse(**po_data)
            
        except Exception as e:
            logger.error(f"Error getting purchase order {po_id}: {str(e)}")
            raise
    
    # Recipe Management
    async def create_recipe(self, recipe_data: RecipeEnhancedCreate) -> RecipeEnhancedResponse:
        """Create recipe with BOM"""
        try:
            # Generate recipe code
            if not recipe_data.recipe_code:
                recipe_data.recipe_code = f"RCP{str(uuid4())[:8].upper()}"
            
            # Calculate recipe cost
            total_cost = await self._calculate_recipe_cost(recipe_data.ingredients)
            cost_per_portion = total_cost / recipe_data.number_of_portions if recipe_data.number_of_portions else total_cost
            
            # Prepare recipe data
            recipe_dict = recipe_data.dict(exclude={'ingredients'})
            recipe_dict.update({
                'total_cost': total_cost,
                'cost_per_portion': cost_per_portion
            })
            
            # Calculate profit margin if selling price is set
            if recipe_data.selling_price:
                recipe_dict['profit_margin'] = ((recipe_data.selling_price - cost_per_portion) / recipe_data.selling_price * 100) if recipe_data.selling_price > 0 else 0
            
            # Create recipe
            response = self.db.table("recipes").insert(recipe_dict).execute()
            
            if not response.data:
                raise BadRequestException("Failed to create recipe")
            
            recipe_id = UUID(response.data[0]['id'])
            
            # Create recipe ingredients
            for ingredient in recipe_data.ingredients:
                ingredient_dict = ingredient.dict()
                ingredient_dict['recipe_id'] = str(recipe_id)
                
                # Calculate costs
                product = await self.get_product(ingredient.product_id)
                unit_cost = product.standard_cost
                ingredient_dict['unit_cost'] = unit_cost
                ingredient_dict['total_cost'] = ingredient.quantity * unit_cost
                
                # Calculate net quantity after waste
                if ingredient.waste_percentage:
                    ingredient_dict['net_quantity'] = ingredient.quantity * (1 - ingredient.waste_percentage / 100)
                else:
                    ingredient_dict['net_quantity'] = ingredient.quantity
                
                self.db.table("recipe_ingredients").insert(ingredient_dict).execute()
            
            return await self.get_recipe(recipe_id)
            
        except Exception as e:
            logger.error(f"Error creating recipe: {str(e)}")
            raise
    
    async def get_recipe(self, recipe_id: UUID) -> RecipeEnhancedResponse:
        """Get recipe with ingredients"""
        try:
            # Get recipe
            response = self.db.table("recipes").select("*").eq("id", str(recipe_id)).single().execute()
            
            if not response.data:
                raise NotFoundException("Recipe not found")
            
            recipe_data = response.data
            
            # Get ingredients
            ingredients_response = self.db.table("recipe_ingredients").select(
                "*,product:products(name,current_stock)"
            ).eq("recipe_id", str(recipe_id)).execute()
            
            ingredients = ingredients_response.data or []
            recipe_data['ingredients'] = ingredients
            recipe_data['ingredients_count'] = len(ingredients)
            
            # Check if recipe can be produced
            can_produce, max_quantity = await self._check_recipe_availability(recipe_id, ingredients)
            recipe_data['can_produce'] = can_produce
            recipe_data['max_producible_quantity'] = max_quantity
            
            return RecipeEnhancedResponse(**recipe_data)
            
        except Exception as e:
            logger.error(f"Error getting recipe {recipe_id}: {str(e)}")
            raise
    
    # Dashboard and Reports
    async def get_dashboard_data(self) -> InventoryDashboard:
        """Get inventory dashboard data"""
        try:
            # Get basic metrics
            total_inventory_value = await self._calculate_total_inventory_value()
            total_products = await self._get_total_products_count()
            low_stock_count = await self._get_low_stock_count()
            critical_stock_count = await self._get_critical_stock_count()
            
            # Get expiry information
            expiring_items_count = await self._get_expiring_items_count(days=30)
            expired_items_count = await self._get_expired_items_count()
            
            # Get purchase order metrics
            pending_pos = await self._get_pending_purchase_orders()
            pending_purchase_orders = len(pending_pos)
            pending_purchase_value = sum(po['total_amount'] for po in pending_pos)
            
            # Get today's transactions
            todays_transactions = await self._get_todays_transactions()
            
            # Get top moving products
            top_moving_products = await self._get_top_moving_products(limit=10)
            
            # Get stock alerts
            stock_alerts = await self._get_stock_alerts()
            
            return InventoryDashboard(
                total_inventory_value=total_inventory_value,
                total_products=total_products,
                low_stock_count=low_stock_count,
                critical_stock_count=critical_stock_count,
                expiring_items_count=expiring_items_count,
                expired_items_count=expired_items_count,
                pending_purchase_orders=pending_purchase_orders,
                pending_purchase_value=pending_purchase_value,
                todays_transactions=todays_transactions,
                top_moving_products=top_moving_products,
                stock_alerts=stock_alerts
            )
            
        except Exception as e:
            logger.error(f"Error getting dashboard data: {str(e)}")
            raise
    
    async def get_stock_status_report(self) -> List[StockStatusReport]:
        """Get stock status report"""
        try:
            response = self.db.table("products").select(
                "id,sku,name,current_stock,reorder_point,min_stock_level,max_stock_level,standard_cost,category:product_categories(name)"
            ).eq("track_inventory", True).execute()
            
            reports = []
            for product_data in response.data:
                stock_level = self._calculate_stock_level(product_data)
                stock_value = product_data['current_stock'] * product_data['standard_cost']
                
                report = StockStatusReport(
                    product_id=product_data['id'],
                    sku=product_data['sku'],
                    product_name=product_data['name'],
                    category_name=product_data.get('category', {}).get('name', ''),
                    current_stock=product_data['current_stock'],
                    reorder_point=product_data['reorder_point'],
                    min_stock_level=product_data['min_stock_level'],
                    max_stock_level=product_data.get('max_stock_level'),
                    unit_cost=product_data['standard_cost'],
                    stock_value=stock_value,
                    stock_status=stock_level
                )
                reports.append(report)
            
            return reports
            
        except Exception as e:
            logger.error(f"Error getting stock status report: {str(e)}")
            raise
    
    # Helper Methods
    def _calculate_stock_level(self, product_data: Dict[str, Any]) -> StockLevel:
        """Calculate stock level status"""
        current_stock = product_data.get('current_stock', 0)
        min_stock = product_data.get('min_stock_level', 0)
        reorder_point = product_data.get('reorder_point', 0)
        max_stock = product_data.get('max_stock_level')
        
        if current_stock <= min_stock:
            return StockLevel.CRITICAL
        elif current_stock <= reorder_point:
            return StockLevel.LOW
        elif max_stock and current_stock >= max_stock:
            return StockLevel.EXCESS
        else:
            return StockLevel.NORMAL
    
    async def _create_stock_transaction(
        self,
        product_id: UUID,
        transaction_type: TransactionType,
        quantity: Decimal,
        location_id: Optional[UUID] = None,
        unit_cost: Optional[Decimal] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[UUID] = None,
        notes: Optional[str] = None
    ) -> InventoryTransactionResponse:
        """Create stock transaction and update product stock"""
        try:
            # Get current stock
            product_response = self.db.table("products").select(
                "current_stock,standard_cost"
            ).eq("id", str(product_id)).single().execute()
            
            if not product_response.data:
                raise NotFoundException("Product not found")
            
            current_stock = product_response.data['current_stock']
            product_cost = product_response.data['standard_cost']
            stock_before = current_stock
            
            # Use product cost if unit cost not provided
            if unit_cost is None:
                unit_cost = product_cost
            
            # Calculate new stock
            if transaction_type in [TransactionType.PURCHASE, TransactionType.ADJUSTMENT, TransactionType.RETURN]:
                if quantity < 0 and transaction_type == TransactionType.ADJUSTMENT:
                    # Negative adjustment
                    stock_after = current_stock + quantity
                else:
                    stock_after = current_stock + abs(quantity)
            else:
                # Sale, waste, consumption, etc.
                stock_after = current_stock - abs(quantity)
            
            # Prevent negative stock if not allowed
            if stock_after < 0:
                location = None
                if location_id:
                    location_response = self.db.table("inventory_locations").select(
                        "allows_negative_stock"
                    ).eq("id", str(location_id)).single().execute()
                    location = location_response.data
                
                if not location or not location.get('allows_negative_stock', False):
                    raise BadRequestException("Insufficient stock. Cannot go negative.")
            
            # Create transaction record
            transaction_data = {
                'product_id': str(product_id),
                'location_id': str(location_id) if location_id else None,
                'transaction_type': transaction_type.value,
                'quantity': abs(quantity),
                'unit_cost': float(unit_cost) if unit_cost else None,
                'total_cost': float(abs(quantity) * unit_cost) if unit_cost else None,
                'reference_type': reference_type,
                'reference_id': str(reference_id) if reference_id else None,
                'stock_before': float(stock_before),
                'stock_after': float(stock_after),
                'notes': notes,
                'transaction_date': datetime.now().isoformat()
            }
            
            transaction_response = self.db.table("inventory_transactions").insert(
                transaction_data
            ).execute()
            
            if not transaction_response.data:
                raise BadRequestException("Failed to create transaction")
            
            # Update product stock
            self.db.table("products").update({
                'current_stock': float(stock_after)
            }).eq("id", str(product_id)).execute()
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern(f"products:{product_id}:*")
            
            # Get transaction with product info for response
            transaction_id = transaction_response.data[0]['id']
            full_transaction = self.db.table("inventory_transactions").select(
                "*,product:products(name),location:inventory_locations(name)"
            ).eq("id", transaction_id).single().execute()
            
            transaction_data = full_transaction.data
            transaction_data['product_name'] = transaction_data.get('product', {}).get('name', '')
            transaction_data['location_name'] = transaction_data.get('location', {}).get('name')
            transaction_data['created_by'] = UUID("00000000-0000-0000-0000-000000000000")  # System user
            
            return InventoryTransactionResponse(**transaction_data)
            
        except Exception as e:
            logger.error(f"Error creating stock transaction: {str(e)}")
            raise
    
    async def _generate_po_number(self) -> str:
        """Generate unique purchase order number"""
        # Get current date
        today = date.today()
        year_month = today.strftime("%Y%m")
        
        # Get last PO number for this month
        response = self.db.table("purchase_orders").select("po_number").like(
            "po_number", f"PO{year_month}%"
        ).order("po_number", desc=True).limit(1).execute()
        
        if response.data:
            last_number = response.data[0]['po_number']
            # Extract sequence number and increment
            sequence = int(last_number[-4:]) + 1
        else:
            sequence = 1
        
        return f"PO{year_month}{sequence:04d}"
    
    def _parse_payment_terms(self, terms: str) -> Optional[int]:
        """Parse payment terms to extract days"""
        terms = terms.lower().strip()
        if 'net 30' in terms or '30 days' in terms:
            return 30
        elif 'net 15' in terms or '15 days' in terms:
            return 15
        elif 'net 7' in terms or '7 days' in terms:
            return 7
        elif 'immediate' in terms or 'cash' in terms:
            return 0
        return None
    
    async def _calculate_recipe_cost(self, ingredients: List) -> Decimal:
        """Calculate total cost of recipe ingredients"""
        total_cost = Decimal(0)
        
        for ingredient in ingredients:
            # Get product cost
            product = await self.get_product(ingredient.product_id)
            ingredient_cost = ingredient.quantity * product.standard_cost
            
            # Apply waste percentage
            if ingredient.waste_percentage:
                waste_factor = 1 + (ingredient.waste_percentage / 100)
                ingredient_cost *= waste_factor
            
            total_cost += ingredient_cost
        
        return total_cost
    
    async def _check_recipe_availability(self, recipe_id: UUID, ingredients: List) -> Tuple[bool, Optional[Decimal]]:
        """Check if recipe can be produced and maximum quantity"""
        min_possible = None
        
        for ingredient in ingredients:
            product_stock = ingredient.get('product', {}).get('current_stock', 0)
            required_quantity = ingredient['quantity']
            
            if required_quantity <= 0:
                continue
                
            possible_quantity = product_stock / required_quantity
            
            if min_possible is None or possible_quantity < min_possible:
                min_possible = possible_quantity
        
        can_produce = min_possible is not None and min_possible >= 1
        max_quantity = int(min_possible) if min_possible else 0
        
        return can_produce, max_quantity if max_quantity > 0 else None
    
    async def _get_next_expiry_info(self, product_id: UUID) -> Dict[str, Any]:
        """Get next expiry information for product"""
        # This would typically check inventory_batches table
        # For now, return default values
        return {
            'status': ExpiryStatus.OK,
            'next_expiry_date': None
        }
    
    async def _get_days_since_last_movement(self, product_id: UUID) -> Optional[int]:
        """Get days since last stock movement"""
        response = self.db.table("inventory_transactions").select(
            "transaction_date"
        ).eq("product_id", str(product_id)).order(
            "transaction_date", desc=True
        ).limit(1).execute()
        
        if response.data:
            last_movement = datetime.fromisoformat(response.data[0]['transaction_date'])
            return (datetime.now() - last_movement).days
        
        return None
    
    async def _calculate_total_inventory_value(self) -> Decimal:
        """Calculate total inventory value"""
        response = self.db.table("products").select(
            "current_stock,standard_cost"
        ).eq("track_inventory", True).execute()
        
        total_value = Decimal(0)
        for product in response.data:
            stock = Decimal(str(product['current_stock']))
            cost = Decimal(str(product['standard_cost']))
            total_value += stock * cost
        
        return total_value
    
    async def _get_total_products_count(self) -> int:
        """Get total number of active products"""
        response = self.db.table("products").select(
            "id", count="exact"
        ).eq("is_active", True).execute()
        
        return response.count or 0
    
    async def _get_low_stock_count(self) -> int:
        """Get count of low stock items"""
        response = self.db.table("products").select(
            "id", count="exact"
        ).filter("current_stock", "lte", "reorder_point").execute()
        
        return response.count or 0
    
    async def _get_critical_stock_count(self) -> int:
        """Get count of critical stock items"""
        response = self.db.table("products").select(
            "id", count="exact"
        ).filter("current_stock", "lte", "min_stock_level").execute()
        
        return response.count or 0
    
    async def _get_expiring_items_count(self, days: int = 30) -> int:
        """Get count of items expiring within specified days"""
        # This would typically check inventory_batches table
        # For now, return 0
        return 0
    
    async def _get_expired_items_count(self) -> int:
        """Get count of expired items"""
        # This would typically check inventory_batches table
        # For now, return 0
        return 0
    
    async def _get_pending_purchase_orders(self) -> List[Dict[str, Any]]:
        """Get pending purchase orders"""
        response = self.db.table("purchase_orders").select(
            "id,total_amount"
        ).in_("status", ["submitted", "approved"]).execute()
        
        return response.data or []
    
    async def _get_todays_transactions(self) -> Dict[str, Any]:
        """Get today's transaction summary"""
        today = date.today().isoformat()
        
        response = self.db.table("inventory_transactions").select(
            "transaction_type,total_cost", count="exact"
        ).gte("transaction_date", f"{today}T00:00:00").lte(
            "transaction_date", f"{today}T23:59:59"
        ).execute()
        
        # Group by transaction type
        summary = defaultdict(lambda: {'count': 0, 'total_value': 0})
        
        for transaction in response.data:
            transaction_type = transaction['transaction_type']
            summary[transaction_type]['count'] += 1
            summary[transaction_type]['total_value'] += transaction.get('total_cost', 0) or 0
        
        return dict(summary)
    
    async def _get_top_moving_products(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top moving products"""
        # This would typically aggregate transaction data
        # For now, return empty list
        return []
    
    async def _get_stock_alerts(self) -> List[Dict[str, Any]]:
        """Get stock alerts"""
        alerts = []
        
        # Low stock alerts
        response = self.db.table("products").select(
            "id,name,sku,current_stock,reorder_point"
        ).filter("current_stock", "lte", "reorder_point").execute()
        
        for product in response.data:
            alerts.append({
                'type': 'low_stock',
                'product_id': product['id'],
                'product_name': product['name'],
                'sku': product['sku'],
                'current_stock': product['current_stock'],
                'reorder_point': product['reorder_point'],
                'message': f"Product {product['name']} is below reorder point"
            })
        
        return alerts