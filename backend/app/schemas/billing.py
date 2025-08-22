from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from uuid import UUID
from decimal import Decimal


class PaymentMethod(str, Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    MOBILE_PAYMENT = "mobile_payment"
    VOUCHER = "voucher"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    PARTIAL = "partial"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class InvoiceItemBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    discount_amount: Decimal = Field(default=0, ge=0, decimal_places=2)
    tax_rate: Decimal = Field(default=0, ge=0, le=100, decimal_places=2)
    notes: Optional[str] = None


class InvoiceItemCreate(InvoiceItemBase):
    product_id: Optional[UUID] = None
    service_id: Optional[UUID] = None


class InvoiceItemResponse(InvoiceItemBase):
    id: UUID
    invoice_id: UUID
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    customer_id: UUID
    booking_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = Field(None, max_length=255)


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate]


class InvoiceUpdate(BaseModel):
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    status: Optional[InvoiceStatus] = None


class InvoiceResponse(InvoiceBase):
    id: UUID
    invoice_number: str
    status: InvoiceStatus
    items: List[InvoiceItemResponse]
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    issue_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentBase(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_method: PaymentMethod
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    id: UUID
    payment_date: datetime
    processed_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class RefundBase(BaseModel):
    payment_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    reason: str = Field(..., min_length=1)
    notes: Optional[str] = None


class RefundCreate(RefundBase):
    pass


class RefundResponse(RefundBase):
    id: UUID
    refund_date: datetime
    processed_by: UUID
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class BillingReport(BaseModel):
    total_invoices: int
    total_revenue: Decimal
    total_outstanding: Decimal
    overdue_amount: Decimal
    payments_today: Decimal
    payments_this_month: Decimal
    top_customers: List[dict]
    payment_method_breakdown: dict