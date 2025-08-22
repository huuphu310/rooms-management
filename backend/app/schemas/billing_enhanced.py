from datetime import datetime, date
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator
from uuid import UUID
from decimal import Decimal


class InvoiceType(str, Enum):
    DEPOSIT = "deposit"
    PARTIAL = "partial"
    FINAL = "final"
    ADDITIONAL = "additional"


class InvoiceStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    E_WALLET = "e_wallet"
    VOUCHER = "voucher"
    DEPOSIT_DEDUCTION = "deposit_deduction"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentCategory(str, Enum):
    DEPOSIT = "deposit"
    PARTIAL = "partial"
    FINAL = "final"
    REFUND = "refund"


class ItemType(str, Enum):
    ROOM = "room"
    SERVICE = "service"
    PRODUCT = "product"
    FEE = "fee"
    CUSTOM = "custom"


class DepositCalculationType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    NIGHTS_BASED = "nights_based"


class QRPaymentStatus(str, Enum):
    PENDING = "pending"
    MATCHED = "matched"
    OVERPAID = "overpaid"
    UNDERPAID = "underpaid"
    FAILED = "failed"
    EXPIRED = "expired"


class ScheduleStatus(str, Enum):
    SCHEDULED = "scheduled"
    INVOICED = "invoiced"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


# Base Models
class InvoiceItemBase(BaseModel):
    item_type: ItemType
    reference_id: Optional[UUID] = None
    description: str = Field(..., min_length=1, max_length=500)
    quantity: Decimal = Field(default=1, gt=0)
    unit: Optional[str] = Field(None, max_length=50)
    unit_price: Decimal = Field(..., ge=0)
    discount_percent: Decimal = Field(default=0, ge=0, le=100)
    discount_amount: Decimal = Field(default=0, ge=0)
    tax_rate: Decimal = Field(default=10, ge=0, le=100)
    tax_amount: Decimal = Field(default=0, ge=0)
    total_amount: Decimal = Field(..., ge=0)
    service_date: Optional[date] = None
    notes: Optional[str] = None
    sort_order: int = Field(default=0)


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit: Optional[str] = Field(None, max_length=50)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    tax_amount: Optional[Decimal] = Field(None, ge=0)
    total_amount: Optional[Decimal] = Field(None, ge=0)
    service_date: Optional[date] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class InvoiceItemResponse(InvoiceItemBase):
    id: UUID
    invoice_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Invoice Models
class InvoiceBase(BaseModel):
    invoice_type: InvoiceType
    currency: str = Field(default="VND", max_length=3)
    subtotal: Decimal = Field(..., ge=0)
    service_charge: Decimal = Field(default=0, ge=0)
    tax_rate: Decimal = Field(default=10, ge=0, le=100)
    tax_amount: Decimal = Field(default=0, ge=0)
    discount_amount: Decimal = Field(default=0, ge=0)
    discount_reason: Optional[str] = None
    total_amount: Decimal = Field(..., ge=0)
    invoice_date: date = Field(default_factory=date.today)
    due_date: date
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_terms: Optional[str] = Field(None, max_length=200)


class InvoiceCreate(InvoiceBase):
    booking_id: UUID
    customer_id: Optional[UUID] = None
    items: List[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    invoice_type: Optional[InvoiceType] = None
    due_date: Optional[date] = None
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    discount_reason: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_terms: Optional[str] = Field(None, max_length=200)


class InvoiceResponse(InvoiceBase):
    id: UUID
    invoice_number: str
    booking_id: UUID
    customer_id: Optional[UUID] = None
    paid_amount: Decimal
    balance_due: Decimal
    status: InvoiceStatus
    paid_date: Optional[datetime] = None
    items: List[InvoiceItemResponse] = []
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Deposit Invoice Creation
class DepositCalculation(BaseModel):
    method: DepositCalculationType
    value: Optional[Decimal] = None  # percentage or fixed amount
    override_amount: Optional[Decimal] = Field(None, ge=0)


class CreateDepositInvoice(BaseModel):
    booking_id: UUID
    deposit_calculation: DepositCalculation
    due_date: date
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


# Partial Invoice Creation
class PartialInvoiceItem(BaseModel):
    description: str = Field(..., min_length=1)
    amount: Decimal = Field(..., ge=0)
    item_type: ItemType = ItemType.CUSTOM


class CreatePartialInvoice(BaseModel):
    booking_id: UUID
    invoice_type: InvoiceType = InvoiceType.PARTIAL
    items: List[PartialInvoiceItem]
    due_date: date
    notes: Optional[str] = None


# Payment Models
class PaymentDetailsBase(BaseModel):
    """Base model for payment method specific details"""
    pass


class BankTransferDetails(PaymentDetailsBase):
    bank_name: str
    account_number: Optional[str] = None
    reference: str


class CreditCardDetails(PaymentDetailsBase):
    card_last_4: str = Field(..., min_length=4, max_length=4)
    card_type: str
    authorization_code: Optional[str] = None
    transaction_id: Optional[str] = None


class EWalletDetails(PaymentDetailsBase):
    wallet_type: str
    wallet_account: str
    transaction_id: str


class PaymentBase(BaseModel):
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="VND", max_length=3)
    payment_method: PaymentMethod
    payment_details: Optional[Dict[str, Any]] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    payment_category: PaymentCategory
    is_deposit: bool = False
    is_refund: bool = False
    refund_reason: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    invoice_id: Optional[UUID] = None
    booking_id: UUID
    original_payment_id: Optional[UUID] = None


class PaymentUpdate(BaseModel):
    payment_status: Optional[PaymentStatus] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: UUID
    payment_code: str
    invoice_id: Optional[UUID] = None
    booking_id: UUID
    payment_date: datetime
    payment_status: PaymentStatus
    original_payment_id: Optional[UUID] = None
    received_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Payment Processing
class ProcessPaymentItem(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    payment_details: Optional[Dict[str, Any]] = None


class ProcessPayment(BaseModel):
    invoice_id: UUID
    booking_id: UUID
    payments: List[ProcessPaymentItem]
    send_receipt: bool = True


class RecordDepositPayment(BaseModel):
    booking_id: UUID
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_number: Optional[str] = None
    payment_details: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


# Payment Schedules
class PaymentScheduleBase(BaseModel):
    description: str = Field(..., max_length=200)
    amount: Decimal = Field(..., gt=0)
    due_date: date
    notes: Optional[str] = None


class PaymentScheduleCreate(PaymentScheduleBase):
    booking_id: UUID
    schedule_number: int


class PaymentScheduleUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=200)
    amount: Optional[Decimal] = Field(None, gt=0)
    due_date: Optional[date] = None
    notes: Optional[str] = None


class PaymentScheduleResponse(PaymentScheduleBase):
    id: UUID
    booking_id: UUID
    schedule_number: int
    status: ScheduleStatus
    invoice_id: Optional[UUID] = None
    paid_date: Optional[datetime] = None
    reminder_sent: bool
    reminder_sent_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Schedule Configuration
class ScheduleConfig(BaseModel):
    deposit_percentage: Decimal = Field(default=30, ge=0, le=100)
    installments: int = Field(default=2, ge=1, le=5)
    final_payment_on_checkout: bool = True


class CustomScheduleItem(BaseModel):
    description: str
    percentage: Decimal = Field(..., ge=0, le=100)
    days_from_booking: Optional[int] = None
    days_before_checkin: Optional[int] = None
    on_checkout: bool = False


class CreatePaymentSchedule(BaseModel):
    booking_id: UUID
    auto_generate: bool = True
    schedule_config: Optional[ScheduleConfig] = None
    custom_schedule: List[CustomScheduleItem] = []


# QR Code Payment Models
class QRPaymentBase(BaseModel):
    expected_amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="VND", max_length=3)
    bank_account: str
    bank_name: str
    account_holder: str


class QRPaymentCreate(QRPaymentBase):
    invoice_id: UUID
    booking_id: UUID
    expiry_minutes: int = Field(default=30, ge=5, le=120)


class QRPaymentResponse(QRPaymentBase):
    id: UUID
    qr_code_id: str
    qr_code_url: Optional[str] = None
    invoice_id: UUID
    booking_id: UUID
    received_amount: Optional[Decimal] = None
    amount_difference: Optional[Decimal] = None
    bank_transaction_id: Optional[str] = None
    transaction_content: Optional[str] = None
    matched_code: Optional[str] = None
    sender_account: Optional[str] = None
    sender_name: Optional[str] = None
    status: QRPaymentStatus
    qr_generated_at: datetime
    payment_received_at: Optional[datetime] = None
    expires_at: datetime
    webhook_payload: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GenerateQRCode(BaseModel):
    invoice_id: UUID
    booking_id: UUID
    amount: Decimal = Field(..., gt=0)
    expiry_minutes: int = Field(default=30, ge=5, le=120)


class QRPaymentInfo(BaseModel):
    bank: str
    account_number: str
    account_holder: str
    amount: Decimal
    transfer_content: str
    qr_code_id: str


class QRCodeResponse(BaseModel):
    qr_payment_id: UUID
    qr_code_url: str
    qr_code_data: str
    payment_info: QRPaymentInfo
    expires_at: datetime


class QRStatusResponse(BaseModel):
    qr_payment_id: UUID
    status: QRPaymentStatus
    payment_details: Dict[str, Any]
    transaction: Optional[Dict[str, Any]] = None
    invoice_status: InvoiceStatus


# SEAPay Webhook Models
class SEAPayWebhookData(BaseModel):
    transaction_id: str
    account_number: str
    amount: Decimal
    content: str
    sender_account: Optional[str] = None
    sender_name: Optional[str] = None
    transaction_date: datetime
    bank_code: str


class SEAPayWebhook(BaseModel):
    id: str
    event: str
    data: SEAPayWebhookData
    signature: str


# Refund Models
class RefundApproval(BaseModel):
    approved_by: str
    approval_code: str


class ProcessRefund(BaseModel):
    refund_amount: Decimal = Field(..., gt=0)
    refund_reason: str = Field(..., min_length=1)
    refund_method: str = Field(default="original")
    approval: Optional[RefundApproval] = None


# Deposit Rules
class DepositRuleBase(BaseModel):
    name: str = Field(..., max_length=100)
    room_type_id: Optional[UUID] = None
    calculation_type: DepositCalculationType
    percentage_value: Optional[Decimal] = Field(None, ge=0, le=100)
    fixed_amount: Optional[Decimal] = Field(None, ge=0)
    nights_count: Optional[int] = Field(None, ge=1)
    min_stay_nights: Optional[int] = Field(None, ge=1)
    max_stay_nights: Optional[int] = None
    booking_window_days: Optional[int] = None
    priority: int = Field(default=0)
    is_active: bool = True
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class DepositRuleCreate(DepositRuleBase):
    pass


class DepositRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    calculation_type: Optional[DepositCalculationType] = None
    percentage_value: Optional[Decimal] = Field(None, ge=0, le=100)
    fixed_amount: Optional[Decimal] = Field(None, ge=0)
    nights_count: Optional[int] = Field(None, ge=1)
    min_stay_nights: Optional[int] = Field(None, ge=1)
    max_stay_nights: Optional[int] = None
    booking_window_days: Optional[int] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class DepositRuleResponse(DepositRuleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Payment Summary Models
class PaymentSummary(BaseModel):
    total_booking_amount: Decimal
    total_invoiced: Decimal
    total_paid: Decimal
    total_pending: Decimal
    total_remaining: Decimal
    payment_progress_percentage: float
    is_fully_paid: bool


class BookingInfo(BaseModel):
    id: UUID
    booking_code: str
    total_amount: Decimal
    status: str


class BookingPaymentSummary(BaseModel):
    booking: BookingInfo
    payment_summary: PaymentSummary
    invoices: List[InvoiceResponse]
    payments: List[PaymentResponse]
    payment_schedule: List[PaymentScheduleResponse]


# Reports Models
class RevenueByMethod(BaseModel):
    cash: Decimal
    bank_transfer: Decimal
    credit_card: Decimal
    e_wallet: Decimal
    other: Decimal


class RevenueByType(BaseModel):
    deposit: Decimal
    partial: Decimal
    final: Decimal
    additional: Decimal


class OutstandingBooking(BaseModel):
    booking_code: str
    customer_name: str
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    days_overdue: int


class RevenueSummary(BaseModel):
    total_invoiced: Decimal
    total_collected: Decimal
    total_pending: Decimal
    total_overdue: Decimal
    collection_rate: float


class RevenueReport(BaseModel):
    period: Dict[str, str]
    summary: RevenueSummary
    by_payment_method: RevenueByMethod
    by_invoice_type: RevenueByType
    outstanding_bookings: List[OutstandingBooking]


# Search Parameters
class InvoiceSearchParams(BaseModel):
    booking_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    invoice_type: Optional[InvoiceType] = None
    status: Optional[InvoiceStatus] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    order: str = Field(default="desc", pattern="^(asc|desc)$")


class PaymentSearchParams(BaseModel):
    booking_id: Optional[UUID] = None
    invoice_id: Optional[UUID] = None
    payment_method: Optional[PaymentMethod] = None
    payment_category: Optional[PaymentCategory] = None
    status: Optional[PaymentStatus] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="payment_date")
    order: str = Field(default="desc", pattern="^(asc|desc)$")


# Dashboard Models
class TodaySummary(BaseModel):
    total_collected: Decimal
    pending_payments: Decimal
    overdue_amount: Decimal
    invoices_generated: int


class PaymentTrend(BaseModel):
    last_7_days: List[Dict[str, Any]]
    last_30_days: List[Dict[str, Any]]


class TopPending(BaseModel):
    booking: str
    amount: Decimal
    days_overdue: int


class BillingDashboard(BaseModel):
    today_summary: TodaySummary
    payment_trend: PaymentTrend
    top_pending: List[TopPending]