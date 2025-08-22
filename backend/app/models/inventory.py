from sqlalchemy import Column, String, Text, DateTime, Integer, Float, Boolean, ForeignKey, Numeric, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class ProductCategoryEnum(str, enum.Enum):
    BEVERAGE = "beverage"
    FOOD = "food"
    AMENITIES = "amenities"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    OFFICE = "office"
    OTHER = "other"


class StockStatusEnum(str, enum.Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"


class UnitTypeEnum(str, enum.Enum):
    PIECE = "piece"
    BOX = "box"
    BOTTLE = "bottle"
    KILOGRAM = "kg"
    GRAM = "g"
    LITER = "liter"
    MILLILITER = "ml"
    PACK = "pack"
    SET = "set"


class MovementTypeEnum(str, enum.Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    DAMAGE = "damage"
    RETURN = "return"
    CONSUMPTION = "consumption"


class PurchaseOrderStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    RECEIVED = "received"
    PARTIAL = "partial"
    CANCELLED = "cancelled"


class ServiceCategoryEnum(str, enum.Enum):
    HOUSEKEEPING = "housekeeping"
    LAUNDRY = "laundry"
    TRANSPORT = "transport"
    TOUR = "tour"
    SPA = "spa"
    RESTAURANT = "restaurant"
    OTHER = "other"


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    sku = Column(String(100), nullable=False, unique=True, index=True)
    barcode = Column(String(100), nullable=True, unique=True, index=True)
    category = Column(SQLEnum(ProductCategoryEnum), nullable=False, index=True)
    unit = Column(SQLEnum(UnitTypeEnum), nullable=False)
    description = Column(Text, nullable=True)
    cost_price = Column(Numeric(10, 2), nullable=False, default=0)
    selling_price = Column(Numeric(10, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)
    min_stock = Column(Integer, nullable=False, default=0)
    max_stock = Column(Integer, nullable=True)
    reorder_point = Column(Integer, nullable=False, default=0)
    reorder_quantity = Column(Integer, nullable=False, default=0)
    current_stock = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    is_sellable = Column(Boolean, default=True)
    image_url = Column(String(500), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey('suppliers.id'), nullable=True)
    last_restock_date = Column(DateTime(timezone=True), nullable=True)
    last_sale_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product")

    @property
    def stock_value(self):
        return self.current_stock * self.cost_price

    @property
    def status(self):
        if self.current_stock == 0:
            return StockStatusEnum.OUT_OF_STOCK
        elif self.current_stock <= self.min_stock:
            return StockStatusEnum.LOW_STOCK
        else:
            return StockStatusEnum.IN_STOCK


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False)
    movement_type = Column(SQLEnum(MovementTypeEnum), nullable=False)
    quantity = Column(Integer, nullable=False)
    stock_before = Column(Integer, nullable=False)
    stock_after = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=True)
    total_value = Column(Numeric(10, 2), nullable=True)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(Text, nullable=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey('stock_locations.id'), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="stock_movements")
    location = relationship("StockLocation", back_populates="movements")


class StockLocation(Base):
    __tablename__ = "stock_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    movements = relationship("StockMovement", back_populates="location")
    stock_levels = relationship("StockLevel", back_populates="location")


class StockLevel(Base):
    __tablename__ = "stock_levels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False)
    location_id = Column(UUID(as_uuid=True), ForeignKey('stock_locations.id'), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Product")
    location = relationship("StockLocation", back_populates="stock_levels")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=False)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    tax_id = Column(String(50), nullable=True)
    payment_terms = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    products = relationship("Product", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(50), nullable=False, unique=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey('suppliers.id'), nullable=False)
    status = Column(SQLEnum(PurchaseOrderStatusEnum), default=PurchaseOrderStatusEnum.DRAFT)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    tax_total = Column(Numeric(10, 2), nullable=False, default=0)
    total_amount = Column(Numeric(10, 2), nullable=False, default=0)
    expected_delivery = Column(DateTime(timezone=True), nullable=True)
    received_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey('purchase_orders.id'), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, nullable=False, default=0)
    unit_price = Column(Numeric(10, 2), nullable=False)
    tax_amount = Column(Numeric(10, 2), nullable=True, default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")


class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    category = Column(SQLEnum(ServiceCategoryEnum), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False, default=0)
    duration_minutes = Column(Integer, nullable=True)
    max_quantity = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    requires_booking = Column(Boolean, default=False)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)
    total_bookings = Column(Integer, nullable=False, default=0)
    total_revenue = Column(Numeric(12, 2), nullable=False, default=0)
    average_rating = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())