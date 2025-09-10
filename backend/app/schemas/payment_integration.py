"""
Payment Integration Schemas for SeaPay Integration
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, validator
from enum import Enum

# ================================================================
# Enums
# ================================================================

class BankAccountStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class QRCodeStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class WebhookStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    FAILED = "failed"

class TransactionVerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    DUPLICATE = "duplicate"

class TransferType(str, Enum):
    IN = "in"
    OUT = "out"

class WebhookDeliveryStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"

# ================================================================
# Bank Account Schemas
# ================================================================

class BankAccountBase(BaseModel):
    bank_code: str = Field(..., max_length=10, description="Bank code (e.g., VCB)")
    bank_name: str = Field(..., max_length=100, description="Full bank name")
    account_number: str = Field(..., max_length=50, description="Bank account number")
    account_name: str = Field(..., max_length=200, description="Account holder name")
    is_seapay_integrated: bool = Field(False, description="Whether account is integrated with SeaPay")
    is_default: bool = Field(False, description="Whether this is the default account")

class BankAccountCreate(BankAccountBase):
    api_key: Optional[str] = Field(None, description="SeaPay API key")
    webhook_url: Optional[str] = Field(None, description="Webhook URL for notifications")

class BankAccountUpdate(BaseModel):
    bank_code: Optional[str] = Field(None, max_length=10)
    bank_name: Optional[str] = Field(None, max_length=100)
    account_number: Optional[str] = Field(None, max_length=50)
    account_name: Optional[str] = Field(None, max_length=200)
    is_seapay_integrated: Optional[bool] = None
    is_default: Optional[bool] = None
    status: Optional[BankAccountStatus] = None
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None

class BankAccountResponse(BankAccountBase):
    id: UUID
    account_id: str = Field(..., description="External account ID")
    status: BankAccountStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BankAccountListResponse(BaseModel):
    success: bool = True
    data: List[BankAccountResponse]
    pagination: Dict[str, int]

# ================================================================
# QR Code Schemas
# ================================================================

class QRCodeGenerateRequest(BaseModel):
    account_id: Optional[str] = Field(None, description="Bank account ID, uses default if not specified")
    amount: Decimal = Field(..., gt=0, description="Payment amount in VND")
    invoice_code: str = Field(..., max_length=50, description="Invoice or order code")
    expiry_hours: int = Field(24, ge=1, le=168, description="QR code expiry in hours (max 1 week)")
    description: Optional[str] = Field(None, description="Payment description")
    invoice_id: Optional[UUID] = Field(None, description="Related invoice ID")
    booking_id: Optional[UUID] = Field(None, description="Related booking ID")

class QRCodeResponse(BaseModel):
    success: bool = True
    qr_code_id: str = Field(..., description="QR code identifier")
    qr_image_url: str = Field(..., description="URL to QR code image")
    payment_content: str = Field(..., description="Payment transfer message")
    random_code: str = Field(..., description="6-digit verification code")
    amount: Decimal
    bank_account: str = Field(..., description="Bank account number")
    bank_code: str = Field(..., description="Bank code")
    expires_at: datetime
    status: QRCodeStatus

class QRCodeStatusResponse(BaseModel):
    success: bool = True
    qr_code_id: str
    status: QRCodeStatus
    payment_confirmed_at: Optional[datetime] = None
    transaction_id: Optional[str] = None
    expires_at: datetime

# ================================================================
# Webhook Schemas
# ================================================================

class WebhookConfigRequest(BaseModel):
    webhook_url: str = Field(..., description="URL to receive webhook notifications")
    api_key: str = Field(..., description="API key for authentication")
    retry_attempts: int = Field(3, ge=0, le=10, description="Number of retry attempts")
    timeout_seconds: int = Field(30, ge=5, le=120, description="Request timeout in seconds")

class WebhookConfigResponse(BaseModel):
    success: bool = True
    webhook_id: str
    status: WebhookStatus
    created_at: datetime

class WebhookPayload(BaseModel):
    """Incoming webhook payload from SeaPay"""
    id: str = Field(..., description="Transaction ID")
    transferAmount: Decimal = Field(..., description="Transfer amount")
    accumulated: Optional[Decimal] = Field(None, description="Account balance after transfer")
    accountNumber: str = Field(..., description="Bank account number")
    gateway: str = Field(..., description="Bank code")
    content: str = Field(..., description="Transfer message content")
    transactionDate: str = Field(..., description="Transaction date string")
    transferType: TransferType = Field(..., description="Transfer direction")
    code: Optional[str] = None
    subAccount: Optional[str] = None
    referenceCode: Optional[str] = Field(None, description="Bank reference code")
    description: Optional[str] = Field(None, description="Additional description")

    @validator('transactionDate')
    def parse_transaction_date(cls, v):
        """Validate and parse transaction date"""
        try:
            # Expected format: "2023-03-25 14:02:37"
            datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
            return v
        except ValueError:
            raise ValueError(f"Invalid transaction date format: {v}")

# ================================================================
# Payment Verification Schemas
# ================================================================

class PaymentVerificationRequest(BaseModel):
    transaction_id: str = Field(..., description="Transaction ID from webhook")
    qr_code_id: Optional[str] = Field(None, description="QR code ID to verify against")
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    message: str = Field(..., description="Bank transfer message")

class PaymentVerificationResponse(BaseModel):
    success: bool = True
    verified: bool = Field(..., description="Whether payment is verified")
    transaction_id: str
    qr_code_id: Optional[str] = None
    invoice_code: Optional[str] = Field(None, description="Extracted invoice code")
    random_code: Optional[str] = Field(None, description="Extracted random code")
    amount_matched: bool = Field(..., description="Whether amount matches")
    content_matched: bool = Field(..., description="Whether content matches expected format")
    verified_at: Optional[datetime] = None

# ================================================================
# Transaction Schemas
# ================================================================

class PaymentTransactionBase(BaseModel):
    transaction_id: str
    amount: Decimal
    account_number: str
    gateway: str
    content: str
    transaction_date: datetime
    transfer_type: TransferType = TransferType.IN
    reference_code: Optional[str] = None
    description: Optional[str] = None

class PaymentTransactionCreate(PaymentTransactionBase):
    bank_account_id: UUID
    accumulated: Optional[Decimal] = None
    
class PaymentTransactionResponse(PaymentTransactionBase):
    id: UUID
    qr_code_id: Optional[UUID] = None
    bank_account_id: UUID
    accumulated: Optional[Decimal] = None
    parsed_invoice_code: Optional[str] = None
    parsed_random_code: Optional[str] = None
    verification_status: TransactionVerificationStatus
    verification_notes: Optional[str] = None
    processed_at: Optional[datetime] = None
    payment_record_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ================================================================
# API Response Schemas
# ================================================================

class PaymentIntegrationError(BaseModel):
    success: bool = False
    error: Dict[str, Any] = Field(..., description="Error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class APIKeyResponse(BaseModel):
    success: bool = True
    api_key: str
    created_at: datetime
    expires_at: Optional[datetime] = None

class APIKeyGenerateRequest(BaseModel):
    regenerate: bool = Field(True, description="Whether to regenerate existing key")
    old_api_key: Optional[str] = Field(None, description="Current API key for validation")
    expires_at: Optional[datetime] = Field(None, description="Expiry date, null for no expiry")

# ================================================================
# Search and Filter Schemas
# ================================================================

class BankAccountSearchParams(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)
    is_seapay_integrated: Optional[bool] = None
    status: Optional[BankAccountStatus] = None

class QRCodeSearchParams(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)
    status: Optional[QRCodeStatus] = None
    invoice_code: Optional[str] = None
    booking_id: Optional[UUID] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None

class TransactionSearchParams(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(50, ge=1, le=200)
    verification_status: Optional[TransactionVerificationStatus] = None
    gateway: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    processed: Optional[bool] = None  # Filter by whether processed_at is set

# ================================================================
# Utility Schemas
# ================================================================

class ParsedPaymentContent(BaseModel):
    """Result of parsing payment content from bank transfer message"""
    invoice_code: Optional[str] = None
    random_code: Optional[str] = None
    is_valid: bool = Field(False, description="Whether parsing was successful")
    raw_content: str = Field(..., description="Original message content")

class PaymentMatchingResult(BaseModel):
    """Result of matching payment to QR code"""
    matched: bool = Field(False, description="Whether payment matches QR code")
    qr_code_id: Optional[UUID] = None
    invoice_code: Optional[str] = None
    random_code: Optional[str] = None
    amount_matches: bool = Field(False)
    content_matches: bool = Field(False)
    expiry_valid: bool = Field(False)
    reason: Optional[str] = Field(None, description="Reason if not matched")

# ================================================================
# Bank Configuration
# ================================================================

class SupportedBank(BaseModel):
    """Bank information from banks.json"""
    code: str = Field(..., description="Bank code for API calls")
    bin: str = Field(..., description="Bank identification number") 
    short_name: str = Field(..., description="Display name")
    supported: bool = Field(..., description="Whether currently supported")

class BankListResponse(BaseModel):
    success: bool = True
    data: List[SupportedBank]