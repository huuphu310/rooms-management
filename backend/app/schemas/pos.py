from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field, validator

# Enums
class TransactionType(str, Enum):
    IMMEDIATE = "immediate"
    ROOM_CHARGE = "room_charge"
    TEMP_BILL = "temp_bill"

class CustomerType(str, Enum):
    WALK_IN = "walk_in"
    GUEST = "guest"
    STAFF = "staff"
    EXTERNAL = "external"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    COMPLETED = "completed"
    VOID = "void"

class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    ROOM_CHARGE = "room_charge"
    QR_CODE = "qr_code"

class TransactionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    VOID = "void"
    REFUNDED = "refunded"

class ShiftStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    SUSPENDED = "suspended"
    RECONCILED = "reconciled"

class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    VOUCHER = "voucher"

class ReceiptTemplateType(str, Enum):
    SALE = "sale"
    REFUND = "refund"
    SHIFT_REPORT = "shift_report"
    QR_PAYMENT = "qr_payment"

# Product Modifier Schemas
class ProductModifierBase(BaseModel):
    product_id: UUID
    modifier_group: str
    modifier_name: str
    price_adjustment: Decimal = Decimal("0.00")
    is_default: bool = False
    is_required: bool = False
    sort_order: int = 0

class ProductModifierCreate(ProductModifierBase):
    pass

class ProductModifierUpdate(BaseModel):
    modifier_group: Optional[str] = None
    modifier_name: Optional[str] = None
    price_adjustment: Optional[Decimal] = None
    is_default: Optional[bool] = None
    is_required: Optional[bool] = None
    sort_order: Optional[int] = None

class ProductModifierResponse(ProductModifierBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Category Schemas
class POSCategoryBase(BaseModel):
    category_name: str
    parent_id: Optional[UUID] = None
    display_order: int = 0
    icon: Optional[str] = None
    color: Optional[str] = None
    is_featured: bool = False
    is_active: bool = True

class POSCategoryCreate(POSCategoryBase):
    pass

class POSCategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    parent_id: Optional[UUID] = None
    display_order: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

class POSCategoryResponse(POSCategoryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Transaction Item Schemas
class TransactionItemBase(BaseModel):
    product_id: Optional[UUID] = None
    product_code: Optional[str] = None
    product_name: str
    category: Optional[str] = None
    quantity: Decimal
    unit: Optional[str] = None
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("10.00")
    tax_amount: Decimal = Decimal("0.00")
    total_amount: Decimal
    notes: Optional[str] = None
    modifiers: Optional[Dict[str, Any]] = None
    sort_order: int = 0

class TransactionItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal
    unit_price: Decimal
    modifiers: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

class TransactionItemResponse(TransactionItemBase):
    id: UUID
    transaction_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Transaction Schemas
class TransactionBase(BaseModel):
    transaction_type: TransactionType
    customer_type: CustomerType
    booking_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    room_number: Optional[str] = None
    subtotal: Decimal
    discount_amount: Decimal = Decimal("0.00")
    discount_type: Optional[DiscountType] = None
    discount_reason: Optional[str] = None
    tax_rate: Decimal = Decimal("10.00")
    tax_amount: Decimal
    service_charge: Decimal = Decimal("0.00")
    total_amount: Decimal

class CreateTransactionRequest(BaseModel):
    customer_type: CustomerType = CustomerType.WALK_IN
    booking_id: Optional[UUID] = None
    room_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[TransactionItemCreate]
    discount: Optional[Dict[str, Any]] = None
    service_charge: Optional[Decimal] = Decimal("0.00")

class TransactionUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    discount_amount: Optional[Decimal] = None
    discount_type: Optional[DiscountType] = None
    discount_reason: Optional[str] = None
    service_charge: Optional[Decimal] = None

class TransactionResponse(TransactionBase):
    id: UUID
    transaction_code: str
    shift_id: Optional[UUID] = None
    terminal_id: Optional[str] = None
    cashier_id: UUID
    payment_status: PaymentStatus
    payment_method: Optional[PaymentMethod] = None
    qr_code_id: Optional[str] = None
    qr_code_url: Optional[str] = None
    qr_generated_at: Optional[datetime] = None
    qr_paid_at: Optional[datetime] = None
    receipt_number: Optional[str] = None
    receipt_printed: bool = False
    receipt_printed_at: Optional[datetime] = None
    receipt_print_count: int = 0
    status: TransactionStatus
    void_reason: Optional[str] = None
    void_by: Optional[UUID] = None
    void_at: Optional[datetime] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    updated_at: datetime
    items: List[TransactionItemResponse] = []

    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    payment_method: PaymentMethod
    amount: Decimal
    payment_details: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class ProcessPaymentRequest(BaseModel):
    payment_method: PaymentMethod
    amount: Optional[Decimal] = None  # If None, use full transaction amount
    customer_info: Optional[Dict[str, str]] = None
    print_temp_bill: bool = False
    payment_details: Optional[Dict[str, Any]] = None

class PaymentResponse(PaymentBase):
    id: UUID
    transaction_id: UUID
    payment_code: str
    qr_payment_id: Optional[UUID] = None
    bank_transaction_id: Optional[str] = None
    status: str
    processed_by: Optional[UUID] = None
    processed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# QR Payment Response
class QRPaymentInitResponse(BaseModel):
    status: str
    transaction_id: UUID
    qr_code_id: str
    qr_code_url: str
    amount: Decimal
    monitor_endpoint: str
    expires_at: datetime

class PaymentStatusResponse(BaseModel):
    transaction_id: UUID
    payment_status: PaymentStatus
    payment_received: Optional[Dict[str, Any]] = None
    action: Optional[str] = None

# Shift Schemas
class ShiftBase(BaseModel):
    terminal_id: Optional[str] = None
    opening_cash: Decimal = Decimal("0.00")
    opening_notes: Optional[str] = None

class OpenShiftRequest(ShiftBase):
    pass

class CloseShiftRequest(BaseModel):
    actual_cash: Decimal
    closing_notes: Optional[str] = None
    cash_deposits: Optional[List[Dict[str, Any]]] = None
    discrepancy_reason: Optional[str] = None

class ShiftResponse(BaseModel):
    id: UUID
    shift_code: str
    terminal_id: Optional[str] = None
    shift_date: date
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opened_by: UUID
    closed_by: Optional[UUID] = None
    opening_cash: Decimal
    opening_notes: Optional[str] = None
    expected_cash: Optional[Decimal] = None
    actual_cash: Optional[Decimal] = None
    cash_difference: Optional[Decimal] = None
    total_sales: Decimal
    total_refunds: Decimal
    total_discounts: Decimal
    total_tax: Decimal
    net_sales: Decimal
    cash_sales: Decimal
    card_sales: Decimal
    transfer_sales: Decimal
    room_charge_sales: Decimal
    transaction_count: int
    void_count: int
    refund_count: int
    status: ShiftStatus
    closing_notes: Optional[str] = None
    discrepancy_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Shift Summary
class ShiftSummaryResponse(BaseModel):
    shift_code: str
    duration: str
    total_transactions: int
    sales_summary: Dict[str, Decimal]
    payment_breakdown: Dict[str, Dict[str, Any]]
    cash_reconciliation: Dict[str, Any]
    top_items: List[Dict[str, Any]]
    cashier_performance: Optional[Dict[str, Any]] = None

# Receipt Schemas
class PrintReceiptRequest(BaseModel):
    receipt_type: str = "final"  # "final", "temp", "duplicate"
    printer_id: Optional[str] = None
    include_qr: bool = False
    template_id: Optional[UUID] = None

class ReceiptResponse(BaseModel):
    transaction_id: UUID
    receipt_number: str
    receipt_type: str
    formatted_receipt: str
    printer_status: str
    printed_at: datetime

# Receipt Template Schemas
class ReceiptTemplateBase(BaseModel):
    template_name: str
    template_type: ReceiptTemplateType
    header_template: str
    body_template: Optional[str] = None
    footer_template: str
    formatting: Optional[Dict[str, Any]] = None
    is_active: bool = True
    is_default: bool = False

class ReceiptTemplateCreate(ReceiptTemplateBase):
    pass

class ReceiptTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    header_template: Optional[str] = None
    body_template: Optional[str] = None
    footer_template: Optional[str] = None
    formatting: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class ReceiptTemplateResponse(ReceiptTemplateBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Void Transaction Request
class VoidTransactionRequest(BaseModel):
    void_reason: str
    supervisor_pin: Optional[str] = None

# Reports
class DailySummaryRequest(BaseModel):
    date: date
    terminal_id: Optional[str] = None
    cashier_id: Optional[UUID] = None

class DailySummaryResponse(BaseModel):
    date: date
    summary: Dict[str, Any]
    by_hour: List[Dict[str, Any]]
    by_category: Dict[str, Decimal]
    by_payment: Dict[str, Decimal]
    top_products: List[Dict[str, Any]]
    shift_details: List[Dict[str, Any]]

class ProductSalesReport(BaseModel):
    period: Dict[str, date]
    products: List[Dict[str, Any]]
    total_revenue: Decimal
    total_quantity: int
    average_price: Decimal

# Batch Operations
class BatchTransactionRequest(BaseModel):
    transactions: List[CreateTransactionRequest]
    process_payment: bool = False
    payment_method: Optional[PaymentMethod] = None

class BatchTransactionResponse(BaseModel):
    successful: List[TransactionResponse]
    failed: List[Dict[str, Any]]
    summary: Dict[str, Any]

# Product Quick Access
class QuickProductResponse(BaseModel):
    id: UUID
    name: str
    code: str
    price: Decimal
    category: str
    image_url: Optional[str] = None
    modifiers: List[ProductModifierResponse] = []
    is_available: bool
    stock_quantity: Optional[int] = None

# Search
class SearchTransactionRequest(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    transaction_code: Optional[str] = None
    receipt_number: Optional[str] = None
    customer_name: Optional[str] = None
    room_number: Optional[str] = None
    cashier_id: Optional[UUID] = None
    status: Optional[TransactionStatus] = None
    payment_method: Optional[PaymentMethod] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None

# Thermal Printer
class PrinterStatusResponse(BaseModel):
    printer_id: str
    status: str  # "online", "offline", "error", "out_of_paper"
    model: Optional[str] = None
    paper_status: Optional[str] = None
    error_message: Optional[str] = None

class PrintTestRequest(BaseModel):
    printer_id: str
    test_type: str = "alignment"  # "alignment", "barcode", "qr_code", "full"