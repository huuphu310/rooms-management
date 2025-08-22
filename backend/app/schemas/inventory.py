from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator
from uuid import UUID
from decimal import Decimal


class ProductCategory(str, Enum):
    BEVERAGE = "beverage"
    FOOD = "food"
    AMENITIES = "amenities"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    OFFICE = "office"
    OTHER = "other"


class StockStatus(str, Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"


class UnitType(str, Enum):
    PIECE = "piece"
    BOX = "box"
    BOTTLE = "bottle"
    KILOGRAM = "kg"
    GRAM = "g"
    LITER = "liter"
    MILLILITER = "ml"
    PACK = "pack"
    SET = "set"


class MovementType(str, Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    DAMAGE = "damage"
    RETURN = "return"
    CONSUMPTION = "consumption"


class PurchaseOrderStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    RECEIVED = "received"
    PARTIAL = "partial"
    CANCELLED = "cancelled"


class ServiceCategory(str, Enum):
    HOUSEKEEPING = "housekeeping"
    LAUNDRY = "laundry"
    TRANSPORT = "transport"
    TOUR = "tour"
    SPA = "spa"
    RESTAURANT = "restaurant"
    OTHER = "other"


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    category: ProductCategory
    unit: UnitType
    description: Optional[str] = None
    cost_price: Decimal = Field(..., ge=0, decimal_places=2)
    selling_price: Decimal = Field(..., ge=0, decimal_places=2)
    tax_rate: Decimal = Field(default=0, ge=0, le=100, decimal_places=2)
    min_stock: int = Field(default=0, ge=0)
    max_stock: Optional[int] = Field(None, ge=0)
    reorder_point: int = Field(default=0, ge=0)
    reorder_quantity: int = Field(default=0, ge=0)
    is_active: bool = True
    is_sellable: bool = True
    image_url: Optional[str] = None

    @validator('selling_price')
    def validate_prices(cls, v, values):
        if 'cost_price' in values and v < values['cost_price']:
            raise ValueError('Selling price cannot be less than cost price')
        return v


class ProductCreate(ProductBase):
    initial_stock: int = Field(default=0, ge=0)
    supplier_id: Optional[UUID] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[ProductCategory] = None
    unit: Optional[UnitType] = None
    cost_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    selling_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)
    min_stock: Optional[int] = Field(None, ge=0)
    max_stock: Optional[int] = Field(None, ge=0)
    reorder_point: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    is_sellable: Optional[bool] = None
    image_url: Optional[str] = None


class ProductResponse(ProductBase):
    id: UUID
    current_stock: int
    stock_value: Decimal
    status: StockStatus
    last_restock_date: Optional[datetime]
    last_sale_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StockMovementBase(BaseModel):
    product_id: UUID
    movement_type: MovementType
    quantity: int = Field(..., gt=0)
    unit_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    reference_type: Optional[str] = Field(None, max_length=50)
    reference_id: Optional[UUID] = None
    notes: Optional[str] = None
    location_id: Optional[UUID] = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementResponse(StockMovementBase):
    id: UUID
    stock_before: int
    stock_after: int
    total_value: Decimal
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class StockAdjustment(BaseModel):
    product_id: UUID
    new_quantity: int = Field(..., ge=0)
    reason: str = Field(..., min_length=1)
    notes: Optional[str] = None


class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: str = Field(..., min_length=10, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    tax_id: Optional[str] = Field(None, max_length=50)
    payment_terms: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    tax_id: Optional[str] = Field(None, max_length=50)
    payment_terms: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: UUID
    total_orders: int
    total_purchase_value: Decimal
    last_order_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PurchaseOrderBase(BaseModel):
    supplier_id: UUID
    expected_delivery: Optional[datetime] = None
    notes: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    items: List['PurchaseOrderItemCreate']


class PurchaseOrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    tax_amount: Optional[Decimal] = Field(None, ge=0, decimal_places=2)


class PurchaseOrderItemResponse(PurchaseOrderItemCreate):
    id: UUID
    total_amount: Decimal
    received_quantity: int
    product_name: str

    class Config:
        from_attributes = True


class PurchaseOrderResponse(PurchaseOrderBase):
    id: UUID
    order_number: str
    status: PurchaseOrderStatus
    items: List[PurchaseOrderItemResponse]
    subtotal: Decimal
    tax_total: Decimal
    total_amount: Decimal
    received_date: Optional[datetime]
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ServiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: ServiceCategory
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0, decimal_places=2)
    duration_minutes: Optional[int] = Field(None, ge=0)
    max_quantity: Optional[int] = Field(None, ge=1)
    is_active: bool = True
    requires_booking: bool = False
    tax_rate: Decimal = Field(default=0, ge=0, le=100, decimal_places=2)


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[ServiceCategory] = None
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    duration_minutes: Optional[int] = Field(None, ge=0)
    max_quantity: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    requires_booking: Optional[bool] = None
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)


class ServiceResponse(ServiceBase):
    id: UUID
    total_bookings: int
    total_revenue: Decimal
    average_rating: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryReport(BaseModel):
    total_products: int
    total_stock_value: Decimal
    low_stock_items: List[ProductResponse]
    out_of_stock_items: List[ProductResponse]
    top_selling_products: List[Dict[str, Any]]
    slow_moving_products: List[Dict[str, Any]]
    expiring_soon: List[Dict[str, Any]]
    stock_valuation: Dict[str, Decimal]


class StockLevelResponse(BaseModel):
    product_id: UUID
    product_name: str
    sku: str
    current_stock: int
    min_stock: int
    max_stock: Optional[int]
    reorder_point: int
    status: StockStatus
    stock_value: Decimal
    location: Optional[str]

    class Config:
        from_attributes = True