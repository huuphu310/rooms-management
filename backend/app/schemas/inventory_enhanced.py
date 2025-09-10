"""Enhanced Inventory Management Schemas based on documentation"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, validator
from uuid import UUID
from decimal import Decimal


# Enhanced Enums
class ProductStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class TransactionType(str, Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    WASTE = "waste"
    RETURN = "return"
    CONSUMPTION = "consumption"
    PRODUCTION = "production"


class ValuationMethod(str, Enum):
    FIFO = "FIFO"
    LIFO = "LIFO"
    AVERAGE = "AVERAGE"
    SPECIFIC = "SPECIFIC"


class PurchaseOrderStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    PARTIAL_RECEIVED = "partial_received"
    RECEIVED = "received"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"


class ReceivingStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    COMPLETE = "complete"
    REJECTED = "rejected"


class QualityCheckStatus(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    PARTIAL = "partial"


class RecipeType(str, Enum):
    FOOD = "food"
    BEVERAGE = "beverage"
    COCKTAIL = "cocktail"
    BUNDLE = "bundle"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class PreparationMethod(str, Enum):
    CHOPPED = "chopped"
    DICED = "diced"
    SLICED = "sliced"
    MINCED = "minced"
    WHOLE = "whole"


class ExpiryStatus(str, Enum):
    OK = "ok"
    ALERT = "alert"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"


class StockLevel(str, Enum):
    NORMAL = "normal"
    LOW = "low"
    CRITICAL = "critical"
    EXCESS = "excess"


# Base Models
class InventoryLocationBase(BaseModel):
    """Inventory location information"""
    name: str = Field(..., max_length=200)
    location_type: str = Field(..., max_length=50)
    description: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    is_default: bool = False
    allows_negative_stock: bool = False
    requires_approval: bool = False
    is_active: bool = True


class SupplierEnhanced(BaseModel):
    """Enhanced supplier information"""
    name: str = Field(..., max_length=200)
    supplier_code: str = Field(..., max_length=50)
    contact_person: Optional[str] = Field(None, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    alternative_phone: Optional[str] = Field(None, max_length=20)
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state_province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    
    # Business Information
    tax_id: Optional[str] = Field(None, max_length=50)
    business_license: Optional[str] = Field(None, max_length=100)
    
    # Payment Terms
    payment_terms: Optional[str] = Field(None, max_length=50)
    credit_limit: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    currency: str = Field(default="VND", max_length=10)
    
    # Performance Metrics
    rating: Optional[Decimal] = Field(None, ge=0, le=5, decimal_places=1)
    lead_time_days: Optional[int] = Field(None, ge=0)
    
    # Status
    is_active: bool = True
    is_approved: bool = False
    
    # Bank Information
    bank_name: Optional[str] = Field(None, max_length=200)
    account_number: Optional[str] = Field(None, max_length=50)
    account_name: Optional[str] = Field(None, max_length=200)
    
    # Documents
    attachments: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class ProductCategoryEnhanced(BaseModel):
    """Enhanced product category"""
    name: str = Field(..., max_length=200)
    category_code: str = Field(..., max_length=50)
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    
    # Costing
    default_markup_percentage: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    target_food_cost_percentage: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)
    
    # Inventory Settings
    requires_batch_tracking: bool = False
    requires_expiry_tracking: bool = False
    default_shelf_life_days: Optional[int] = Field(None, ge=0)
    
    # Quality Control
    requires_quality_check: bool = False
    quality_check_parameters: Optional[List[str]] = None
    
    # Waste Management
    average_waste_percentage: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    
    # Status
    is_active: bool = True
    sort_order: int = 0


class ProductEnhanced(BaseModel):
    """Enhanced product information"""
    # Basic Information
    name: str = Field(..., max_length=200)
    sku: str = Field(..., max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    category_id: Optional[UUID] = None
    
    # Alternative Identifiers
    internal_code: Optional[str] = Field(None, max_length=50)
    supplier_sku: Optional[str] = Field(None, max_length=100)
    manufacturer_code: Optional[str] = Field(None, max_length=100)
    
    # Description
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=255)
    specifications: Optional[str] = None
    
    # Classification
    product_type: str = Field(default="inventory", max_length=50)  # inventory, recipe, bundle
    
    # Units
    base_unit: Optional[str] = Field(default="pcs", max_length=50)
    purchase_unit: Optional[str] = Field(None, max_length=50)
    sale_unit: Optional[str] = Field(None, max_length=50)
    unit_conversion_factor: Decimal = Field(default=1, gt=0, decimal_places=4)
    
    # Costing
    cost_price: Decimal = Field(default=0, ge=0, decimal_places=4)
    average_cost: Decimal = Field(default=0, ge=0, decimal_places=4)
    last_cost: Decimal = Field(default=0, ge=0, decimal_places=4)
    
    # Pricing
    selling_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    markup_percentage: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    
    # Tax
    tax_rate: Decimal = Field(default=0, ge=0, le=100, decimal_places=2)
    is_tax_inclusive: bool = False
    
    # Inventory Control
    track_inventory: bool = True
    current_stock: Decimal = Field(default=0, decimal_places=3)
    min_stock_level: Decimal = Field(default=0, ge=0, decimal_places=3)
    max_stock_level: Optional[Decimal] = Field(None, ge=0, decimal_places=3)
    reorder_point: Decimal = Field(default=0, ge=0, decimal_places=3)
    reorder_quantity: Decimal = Field(default=0, ge=0, decimal_places=3)
    
    # Batch and Expiry Tracking
    requires_batch_tracking: bool = False
    requires_expiry_tracking: bool = False
    default_shelf_life_days: Optional[int] = Field(None, ge=0)
    
    # Quality Control
    requires_quality_check: bool = False
    quality_parameters: Optional[List[str]] = None
    
    # Supplier
    primary_supplier_id: Optional[UUID] = None
    lead_time_days: Optional[int] = Field(None, ge=0)
    
    # Physical Properties
    weight: Optional[Decimal] = Field(None, ge=0, decimal_places=3)
    volume: Optional[Decimal] = Field(None, ge=0, decimal_places=3)
    dimensions: Optional[str] = Field(None, max_length=100)
    
    # Storage
    storage_requirements: Optional[str] = None
    storage_temperature_min: Optional[Decimal] = None
    storage_temperature_max: Optional[Decimal] = None
    
    # Recipe Information (for recipe products)
    recipe_id: Optional[UUID] = None
    yield_quantity: Optional[Decimal] = Field(None, gt=0, decimal_places=3)
    portion_size: Optional[Decimal] = Field(None, gt=0, decimal_places=3)
    
    # Allergens and Dietary
    allergens: List[str] = Field(default_factory=list)
    dietary_tags: List[str] = Field(default_factory=list)
    
    # Images
    image_url: Optional[str] = None
    additional_images: List[str] = Field(default_factory=list)
    
    # Status
    status: ProductStatus = ProductStatus.ACTIVE
    is_sellable: bool = True
    is_purchasable: bool = True
    
    # Seasonal
    is_seasonal: bool = False
    season_start_date: Optional[date] = None
    season_end_date: Optional[date] = None
    
    # Notes
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class PurchaseOrderEnhanced(BaseModel):
    """Enhanced purchase order"""
    # Basic Information
    po_number: str = Field(..., max_length=50)
    supplier_id: UUID
    
    # Dates
    order_date: date
    expected_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    
    # Financial
    subtotal: Decimal = Field(default=0, decimal_places=2)
    tax_amount: Decimal = Field(default=0, decimal_places=2)
    discount_amount: Decimal = Field(default=0, decimal_places=2)
    shipping_cost: Decimal = Field(default=0, decimal_places=2)
    total_amount: Decimal = Field(default=0, decimal_places=2)
    
    # Payment
    payment_terms: Optional[str] = Field(None, max_length=50)
    payment_due_date: Optional[date] = None
    payment_status: PaymentStatus = PaymentStatus.PENDING
    paid_amount: Decimal = Field(default=0, decimal_places=2)
    
    # Delivery
    delivery_location_id: Optional[UUID] = None
    delivery_address: Optional[str] = None
    delivery_instructions: Optional[str] = None
    
    # Status
    status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT
    
    # Approval
    requires_approval: bool = True
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    
    # Receiving
    received_by: Optional[UUID] = None
    received_at: Optional[datetime] = None
    receiving_notes: Optional[str] = None
    
    # Documents
    attachments: Optional[Dict[str, Any]] = None
    
    # Notes
    notes: Optional[str] = None


class PurchaseOrderItemEnhanced(BaseModel):
    """Enhanced purchase order item"""
    po_id: UUID
    product_id: UUID
    
    # Quantities
    ordered_quantity: Decimal = Field(..., gt=0, decimal_places=3)
    received_quantity: Decimal = Field(default=0, decimal_places=3)
    rejected_quantity: Decimal = Field(default=0, decimal_places=3)
    
    # Units
    unit: str = Field(..., max_length=50)
    units_per_package: int = Field(default=1, gt=0)
    
    # Pricing
    unit_cost: Decimal = Field(..., ge=0, decimal_places=4)
    discount_percent: Decimal = Field(default=0, ge=0, decimal_places=2)
    discount_amount: Decimal = Field(default=0, decimal_places=2)
    tax_percent: Decimal = Field(default=0, ge=0, decimal_places=2)
    tax_amount: Decimal = Field(default=0, decimal_places=2)
    line_total: Decimal = Field(..., decimal_places=2)
    
    # Specifications
    product_name: Optional[str] = Field(None, max_length=200)
    product_sku: Optional[str] = Field(None, max_length=100)
    supplier_sku: Optional[str] = Field(None, max_length=100)
    specifications: Optional[str] = None
    
    # Receiving
    receiving_status: ReceivingStatus = ReceivingStatus.PENDING
    
    # Quality Check
    quality_check_required: bool = False
    quality_check_status: Optional[QualityCheckStatus] = None
    quality_check_notes: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None


class RecipeEnhanced(BaseModel):
    """Enhanced recipe management"""
    # Basic Information
    recipe_code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    recipe_type: RecipeType
    
    # Product Link
    finished_product_id: Optional[UUID] = None
    
    # Yield
    yield_quantity: Decimal = Field(..., gt=0, decimal_places=3)
    yield_unit: str = Field(..., max_length=50)
    portion_size: Optional[Decimal] = Field(None, gt=0, decimal_places=3)
    portion_unit: Optional[str] = Field(None, max_length=50)
    number_of_portions: Optional[int] = Field(None, gt=0)
    
    # Cost
    total_cost: Optional[Decimal] = Field(None, decimal_places=2)
    cost_per_portion: Optional[Decimal] = Field(None, decimal_places=2)
    target_cost_percentage: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)
    
    # Pricing
    selling_price: Optional[Decimal] = Field(None, decimal_places=2)
    profit_margin: Optional[Decimal] = Field(None, decimal_places=2)
    
    # Preparation
    prep_time_minutes: Optional[int] = Field(None, ge=0)
    cook_time_minutes: Optional[int] = Field(None, ge=0)
    total_time_minutes: Optional[int] = Field(None, ge=0)
    difficulty_level: Optional[DifficultyLevel] = None
    
    # Instructions
    preparation_instructions: Optional[str] = None
    cooking_instructions: Optional[str] = None
    plating_instructions: Optional[str] = None
    
    # Allergens and Dietary
    allergens: List[str] = Field(default_factory=list)
    dietary_tags: List[str] = Field(default_factory=list)
    
    # Images
    image_url: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_seasonal: bool = False
    season_start_date: Optional[date] = None
    season_end_date: Optional[date] = None


class RecipeIngredient(BaseModel):
    """Recipe ingredient specification"""
    recipe_id: UUID
    product_id: UUID
    
    # Quantity
    quantity: Decimal = Field(..., gt=0, decimal_places=4)
    unit: str = Field(..., max_length=50)
    
    # Cost
    unit_cost: Optional[Decimal] = Field(None, decimal_places=4)
    total_cost: Optional[Decimal] = Field(None, decimal_places=2)
    
    # Preparation
    preparation_method: Optional[PreparationMethod] = None
    
    # Waste
    waste_percentage: Decimal = Field(default=0, ge=0, decimal_places=2)
    net_quantity: Optional[Decimal] = Field(None, decimal_places=4)
    
    # Alternatives
    is_optional: bool = False
    can_substitute: bool = False
    substitute_product_ids: List[UUID] = Field(default_factory=list)
    
    # Notes
    notes: Optional[str] = None
    sequence_order: Optional[int] = None


class InventoryTransaction(BaseModel):
    """Enhanced inventory transaction"""
    product_id: UUID
    location_id: Optional[UUID] = None
    
    # Transaction Details
    transaction_type: TransactionType
    quantity: Decimal = Field(..., decimal_places=3)
    unit_cost: Optional[Decimal] = Field(None, decimal_places=4)
    total_cost: Optional[Decimal] = Field(None, decimal_places=2)
    
    # Reference
    reference_type: Optional[str] = Field(None, max_length=50)
    reference_id: Optional[UUID] = None
    reference_number: Optional[str] = Field(None, max_length=50)
    
    # Batch Information
    batch_number: Optional[str] = Field(None, max_length=50)
    lot_number: Optional[str] = Field(None, max_length=50)
    serial_numbers: List[str] = Field(default_factory=list)
    manufacture_date: Optional[date] = None
    expiry_date: Optional[date] = None
    
    # Transaction Context
    transaction_date: datetime = Field(default_factory=datetime.now)
    fiscal_period: Optional[str] = Field(None, max_length=20)
    
    # Approval
    requires_approval: bool = False
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    
    # Notes
    notes: Optional[str] = None
    reason_code: Optional[str] = Field(None, max_length=50)


class InventoryValuation(BaseModel):
    """Inventory valuation information"""
    valuation_date: date
    valuation_method: ValuationMethod
    
    # Total Values
    total_quantity: Optional[Decimal] = Field(None, decimal_places=3)
    total_value: Optional[Decimal] = Field(None, decimal_places=2)
    
    # Breakdowns
    category_breakdown: Optional[Dict[str, Any]] = None
    location_breakdown: Optional[Dict[str, Any]] = None
    
    # Status
    status: str = Field(default="draft", max_length=20)
    
    # Approval
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    
    # Notes
    notes: Optional[str] = None


# Response Models
class InventoryLocationResponse(InventoryLocationBase):
    id: UUID
    total_products: int = 0
    total_stock_value: Decimal = Decimal(0)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SupplierEnhancedResponse(SupplierEnhanced):
    id: UUID
    total_orders: int = 0
    total_purchase_value: Decimal = Decimal(0)
    avg_lead_time: Optional[int] = None
    last_order_date: Optional[datetime] = None
    on_time_delivery_rate: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProductEnhancedResponse(ProductEnhanced):
    id: UUID
    category_name: Optional[str] = None
    supplier_name: Optional[str] = None
    stock_level: StockLevel = StockLevel.NORMAL
    stock_value: Decimal = Decimal(0)
    days_since_last_movement: Optional[int] = None
    expiry_status: Optional[ExpiryStatus] = None
    next_expiry_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PurchaseOrderEnhancedResponse(PurchaseOrderEnhanced):
    id: UUID
    supplier_name: str
    items: List['PurchaseOrderItemEnhancedResponse'] = Field(default_factory=list)
    items_count: int = 0
    received_percentage: Decimal = Decimal(0)
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PurchaseOrderItemEnhancedResponse(PurchaseOrderItemEnhanced):
    id: UUID
    product_name: str
    remaining_quantity: Decimal = Decimal(0)
    
    class Config:
        from_attributes = True


class RecipeEnhancedResponse(RecipeEnhanced):
    id: UUID
    ingredients: List[RecipeIngredient] = Field(default_factory=list)
    ingredients_count: int = 0
    can_produce: bool = True
    max_producible_quantity: Optional[Decimal] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class InventoryTransactionResponse(InventoryTransaction):
    id: UUID
    product_name: str
    location_name: Optional[str] = None
    stock_before: Decimal
    stock_after: Decimal
    created_by: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Dashboard and Reporting Models
class InventoryDashboard(BaseModel):
    """Inventory dashboard data"""
    total_inventory_value: Decimal
    total_products: int
    low_stock_count: int
    critical_stock_count: int
    expiring_items_count: int
    expired_items_count: int
    pending_purchase_orders: int
    pending_purchase_value: Decimal
    todays_transactions: Dict[str, Any]
    top_moving_products: List[Dict[str, Any]]
    stock_alerts: List[Dict[str, Any]]


class StockStatusReport(BaseModel):
    """Stock status report"""
    product_id: UUID
    sku: str
    product_name: str
    category_name: str
    current_stock: Decimal
    reorder_point: Decimal
    min_stock_level: Decimal
    max_stock_level: Optional[Decimal]
    unit_cost: Decimal
    stock_value: Decimal
    stock_status: StockLevel
    
    class Config:
        from_attributes = True


class ExpiryAlert(BaseModel):
    """Expiry alert information"""
    batch_number: str
    product_name: str
    location_name: str
    current_quantity: Decimal
    expiry_date: date
    expiry_status: ExpiryStatus
    days_to_expiry: int
    
    class Config:
        from_attributes = True


class PurchaseAnalysis(BaseModel):
    """Purchase analysis report"""
    supplier_name: str
    total_orders: int
    total_purchased: Decimal
    avg_order_value: Decimal
    avg_lead_time: Optional[int]
    late_delivery_percentage: Optional[Decimal]
    
    class Config:
        from_attributes = True


class ConsumptionPattern(BaseModel):
    """Consumption pattern analysis"""
    product_name: str
    month: str
    sales_quantity: Decimal
    waste_quantity: Decimal
    avg_transaction_quantity: Decimal
    transaction_count: int
    
    class Config:
        from_attributes = True


# Create, Update models
class InventoryLocationCreate(InventoryLocationBase):
    pass


class InventoryLocationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    location_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    is_default: Optional[bool] = None
    allows_negative_stock: Optional[bool] = None
    requires_approval: Optional[bool] = None
    is_active: Optional[bool] = None


class SupplierEnhancedCreate(SupplierEnhanced):
    pass


class SupplierEnhancedUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    alternative_phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state_province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    tax_id: Optional[str] = Field(None, max_length=50)
    business_license: Optional[str] = Field(None, max_length=100)
    payment_terms: Optional[str] = Field(None, max_length=50)
    credit_limit: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    currency: Optional[str] = Field(None, max_length=10)
    rating: Optional[Decimal] = Field(None, ge=0, le=5, decimal_places=1)
    lead_time_days: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    is_approved: Optional[bool] = None
    bank_name: Optional[str] = Field(None, max_length=200)
    account_number: Optional[str] = Field(None, max_length=50)
    account_name: Optional[str] = Field(None, max_length=200)
    attachments: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class ProductEnhancedCreate(ProductEnhanced):
    initial_stock: Decimal = Field(default=0, decimal_places=3)
    initial_location_id: Optional[UUID] = None


class ProductEnhancedUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=255)
    specifications: Optional[str] = None
    category_id: Optional[UUID] = None
    selling_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    markup_percentage: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    min_stock_level: Optional[Decimal] = Field(None, ge=0, decimal_places=3)
    max_stock_level: Optional[Decimal] = Field(None, ge=0, decimal_places=3)
    reorder_point: Optional[Decimal] = Field(None, ge=0, decimal_places=3)
    reorder_quantity: Optional[Decimal] = Field(None, ge=0, decimal_places=3)
    primary_supplier_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    is_sellable: Optional[bool] = None
    is_purchasable: Optional[bool] = None
    notes: Optional[str] = None


class PurchaseOrderItemCreate(BaseModel):
    """Simple purchase order item for creation"""
    product_id: Union[UUID, str]  # Accept both UUID and string
    quantity: Union[Decimal, float, int] = Field(..., gt=0)
    unit_cost: Union[Decimal, float] = Field(..., ge=0)
    tax_amount: Optional[Union[Decimal, float]] = Field(default=0)
    discount_amount: Optional[Union[Decimal, float]] = Field(default=0)
    notes: Optional[str] = None
    
    class Config:
        json_encoders = {
            Decimal: float
        }


class PurchaseOrderEnhancedCreate(BaseModel):
    supplier_id: Union[UUID, str]  # Accept both UUID and string
    order_date: Optional[Union[date, str]] = Field(default_factory=date.today)
    expected_date: Optional[Union[date, str]] = None  # Match frontend field name
    expected_delivery_date: Optional[Union[date, str]] = None  # Keep for backward compatibility
    delivery_address: Optional[str] = None
    payment_terms: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate]
    
    class Config:
        json_encoders = {
            Decimal: float,
            date: lambda v: v.isoformat() if v else None
        }


class RecipeEnhancedCreate(RecipeEnhanced):
    ingredients: List[RecipeIngredient] = Field(default_factory=list)


class RecipeEnhancedUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    yield_quantity: Optional[Decimal] = Field(None, gt=0, decimal_places=3)
    portion_size: Optional[Decimal] = Field(None, gt=0, decimal_places=3)
    selling_price: Optional[Decimal] = Field(None, decimal_places=2)
    prep_time_minutes: Optional[int] = Field(None, ge=0)
    cook_time_minutes: Optional[int] = Field(None, ge=0)
    difficulty_level: Optional[DifficultyLevel] = None
    is_active: Optional[bool] = None
    is_seasonal: Optional[bool] = None
    season_start_date: Optional[date] = None
    season_end_date: Optional[date] = None


# Search and Filter Models
class InventorySearchParams(BaseModel):
    search: Optional[str] = None
    category_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    product_type: Optional[str] = None
    status: Optional[ProductStatus] = None
    stock_level: Optional[StockLevel] = None
    expiry_status: Optional[ExpiryStatus] = None
    is_active: Optional[bool] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="name")
    order: str = Field(default="asc", pattern="^(asc|desc)$")


class PurchaseOrderSearchParams(BaseModel):
    search: Optional[str] = None
    supplier_id: Optional[UUID] = None
    status: Optional[PurchaseOrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    order_date_from: Optional[date] = None
    order_date_to: Optional[date] = None
    delivery_date_from: Optional[date] = None
    delivery_date_to: Optional[date] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="order_date")
    order: str = Field(default="desc", pattern="^(asc|desc)$")


class TransactionSearchParams(BaseModel):
    search: Optional[str] = None
    product_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    transaction_type: Optional[TransactionType] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    reference_type: Optional[str] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=100)
    sort_by: str = Field(default="transaction_date")
    order: str = Field(default="desc", pattern="^(asc|desc)$")


# List Response Models
class InventoryListResponse(BaseModel):
    data: List[ProductEnhancedResponse]
    pagination: Dict[str, Any]


class PurchaseOrderListResponse(BaseModel):
    data: List[PurchaseOrderEnhancedResponse]
    pagination: Dict[str, Any]


class SupplierListResponse(BaseModel):
    data: List[SupplierEnhancedResponse]
    pagination: Dict[str, Any]


class TransactionListResponse(BaseModel):
    data: List[InventoryTransactionResponse]
    pagination: Dict[str, Any]


# Forward reference updates
PurchaseOrderEnhancedResponse.update_forward_refs()
PurchaseOrderItemEnhancedResponse.update_forward_refs()