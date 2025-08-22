from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from enum import Enum
from uuid import UUID

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    GUARANTEED = "guaranteed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    DEPOSIT_PAID = "deposit_paid"
    PARTIALLY_PAID = "partially_paid"
    FULLY_PAID = "fully_paid"
    REFUNDED = "refunded"

class BookingType(str, Enum):
    INDIVIDUAL = "individual"
    GROUP = "group"
    CORPORATE = "corporate"

class BookingSource(str, Enum):
    DIRECT = "direct"
    WEBSITE = "website"
    PHONE = "phone"
    EMAIL = "email"
    WALK_IN = "walk_in"
    OTA = "ota"

class BookingBase(BaseModel):
    # Booking type
    booking_type: BookingType = BookingType.INDIVIDUAL
    
    # Customer Information
    customer_id: Optional[UUID] = None
    guest_name: str
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_country: Optional[str] = None
    
    # Room Assignment
    room_type_id: UUID
    room_id: Optional[UUID] = None
    room_rate_type: Optional[str] = "standard"
    
    # Dates and Times
    check_in_date: date
    check_out_date: date
    check_in_time: time = Field(default_factory=lambda: time(14, 0))
    check_out_time: time = Field(default_factory=lambda: time(12, 0))
    early_check_in: bool = False
    late_check_out: bool = False
    
    # Guest Count
    adults: int = Field(ge=1, default=1)
    children: int = Field(ge=0, default=0)
    infants: int = Field(ge=0, default=0)
    
    # Pricing
    room_rate: Decimal = Field(decimal_places=2)
    total_room_charge: Optional[Decimal] = Field(None, decimal_places=2)
    extra_person_charge: Decimal = Field(decimal_places=2, default=Decimal("0"))
    extra_bed_charge: Decimal = Field(decimal_places=2, default=Decimal("0"))
    
    # Additional Charges
    service_charges: Decimal = Field(decimal_places=2, default=Decimal("0"))
    tax_amount: Decimal = Field(decimal_places=2, default=Decimal("0"))
    discount_amount: Decimal = Field(decimal_places=2, default=Decimal("0"))
    discount_reason: Optional[str] = None
    commission_amount: Decimal = Field(decimal_places=2, default=Decimal("0"))
    commission_rate: Decimal = Field(decimal_places=2, ge=0, le=100, default=Decimal("0"))
    
    # Deposit
    deposit_required: Decimal = Field(decimal_places=2, default=Decimal("0"))
    deposit_paid: Decimal = Field(decimal_places=2, default=Decimal("0"))
    
    # Source and Channel
    source: BookingSource
    channel: Optional[str] = None
    channel_booking_id: Optional[str] = None
    
    # Special Requests and Notes
    special_requests: Optional[str] = None
    dietary_requirements: Optional[str] = None
    arrival_method: Optional[str] = None
    arrival_details: Optional[str] = None
    purpose_of_visit: Optional[str] = None
    
    # Internal Notes
    internal_notes: Optional[Dict[str, Any]] = None
    
    # Preferences
    preferences: Optional[Dict[str, Any]] = None
    
    # Group Booking Reference
    group_booking_id: Optional[UUID] = None
    is_group_leader: bool = False
    
    # Corporate/Contract
    company_id: Optional[UUID] = None
    corporate_rate_id: Optional[UUID] = None
    billing_instructions: Optional[str] = None

    @validator('check_out_date')
    def validate_dates(cls, v, values):
        if 'check_in_date' in values and v <= values['check_in_date']:
            raise ValueError('Check-out date must be after check-in date')
        return v

    @validator('total_room_charge', always=True)
    def calculate_room_charge(cls, v, values):
        if v is None and 'room_rate' in values and 'check_in_date' in values and 'check_out_date' in values:
            nights = (values['check_out_date'] - values['check_in_date']).days
            return values['room_rate'] * nights
        return v

class BookingCreate(BookingBase):
    """Schema for creating a new booking"""
    pass

class BookingUpdate(BaseModel):
    """Schema for updating an existing booking"""
    # Room Assignment
    room_id: Optional[UUID] = None
    room_rate_type: Optional[str] = None
    
    # Dates and Times
    check_in_date: Optional[date] = None
    check_out_date: Optional[date] = None
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    early_check_in: Optional[bool] = None
    late_check_out: Optional[bool] = None
    
    # Guest Count
    adults: Optional[int] = Field(None, ge=1)
    children: Optional[int] = Field(None, ge=0)
    infants: Optional[int] = Field(None, ge=0)
    
    # Pricing
    room_rate: Optional[Decimal] = Field(None, decimal_places=2)
    extra_person_charge: Optional[Decimal] = Field(None, decimal_places=2)
    extra_bed_charge: Optional[Decimal] = Field(None, decimal_places=2)
    
    # Additional Charges
    service_charges: Optional[Decimal] = Field(None, decimal_places=2)
    tax_amount: Optional[Decimal] = Field(None, decimal_places=2)
    discount_amount: Optional[Decimal] = Field(None, decimal_places=2)
    discount_reason: Optional[str] = None
    
    # Deposit
    deposit_required: Optional[Decimal] = Field(None, decimal_places=2)
    deposit_paid: Optional[Decimal] = Field(None, decimal_places=2)
    
    # Special Requests and Notes
    special_requests: Optional[str] = None
    dietary_requirements: Optional[str] = None
    arrival_method: Optional[str] = None
    arrival_details: Optional[str] = None
    
    # Internal Notes
    internal_notes: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None
    
    # Status
    status: Optional[BookingStatus] = None
    payment_status: Optional[PaymentStatus] = None

class Booking(BookingBase):
    """Complete booking schema with all fields"""
    id: UUID
    booking_code: str
    
    # Status
    status: BookingStatus = BookingStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    confirmation_sent: bool = False
    confirmation_sent_at: Optional[datetime] = None
    
    # Calculated fields
    nights: int
    total_guests: int
    subtotal: Decimal
    total_amount: Decimal
    total_paid: Decimal = Field(decimal_places=2, default=Decimal("0"))
    balance_due: Decimal
    
    # Actual check-in/out
    actual_check_in: Optional[datetime] = None
    actual_check_out: Optional[datetime] = None
    
    # Cancellation
    is_cancelled: bool = False
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[UUID] = None
    cancellation_reason: Optional[str] = None
    cancellation_charge: Decimal = Field(decimal_places=2, default=Decimal("0"))
    refund_amount: Decimal = Field(decimal_places=2, default=Decimal("0"))
    refund_status: Optional[str] = None
    
    # Metadata
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    booking_date: datetime

    class Config:
        from_attributes = True

class CheckInRequest(BaseModel):
    """Request schema for check-in"""
    room_id: UUID
    actual_check_in: Optional[datetime] = None
    early_check_in: bool = False
    notes: Optional[str] = None

class CheckOutRequest(BaseModel):
    """Request schema for check-out"""
    actual_check_out: Optional[datetime] = None
    late_check_out: bool = False
    extra_charges: Optional[Decimal] = Field(None, decimal_places=2)
    payment_method: Optional[str] = None
    payment_amount: Decimal = Field(decimal_places=2)
    notes: Optional[str] = None

class BookingCancellation(BaseModel):
    """Request schema for booking cancellation"""
    reason: str
    cancellation_charge: Optional[Decimal] = Field(None, decimal_places=2)
    refund_amount: Optional[Decimal] = Field(None, decimal_places=2)

class BookingAvailabilityRequest(BaseModel):
    """Request to check room availability"""
    check_in_date: date
    check_out_date: date
    room_type_id: Optional[UUID] = None
    adults: int = Field(ge=1, default=1)
    children: int = Field(ge=0, default=0)

class RoomAvailability(BaseModel):
    """Room availability information"""
    room_type_id: UUID
    room_type_name: str
    available_rooms: int
    total_rooms: int
    base_rate: Decimal
    rate_with_seasonal: Decimal
    can_book: bool

class BookingAvailabilityResponse(BaseModel):
    """Response for availability check"""
    available: bool
    room_types: List[RoomAvailability]
    total_nights: int
    check_in_date: date
    check_out_date: date

class BookingListResponse(BaseModel):
    """Response for booking list with pagination"""
    data: List[Booking]
    pagination: Dict[str, Any]

class BookingPayment(BaseModel):
    """Schema for recording booking payment"""
    booking_id: UUID
    amount: Decimal = Field(decimal_places=2)
    payment_method: str
    payment_reference: Optional[str] = None
    notes: Optional[str] = None

class BookingStatusUpdate(BaseModel):
    """Schema for updating booking status"""
    status: BookingStatus
    notes: Optional[str] = None

class BookingConfirmation(BaseModel):
    """Schema for sending booking confirmation"""
    send_email: bool = True
    send_sms: bool = False
    custom_message: Optional[str] = None

class BookingModification(BaseModel):
    """Schema for modifying booking dates or room"""
    check_in_date: Optional[date] = None
    check_out_date: Optional[date] = None
    room_type_id: Optional[UUID] = None
    room_id: Optional[UUID] = None
    reason: str
    recalculate_rates: bool = True

class GroupBookingCreate(BaseModel):
    """Schema for creating group booking"""
    group_name: str
    organizer_name: str
    organizer_email: str
    organizer_phone: str
    bookings: List[BookingCreate]
    group_discount: Optional[Decimal] = Field(None, decimal_places=2)
    special_arrangements: Optional[str] = None

class BookingStatistics(BaseModel):
    """Booking statistics for dashboard"""
    total_bookings: int
    confirmed_bookings: int
    pending_bookings: int
    checked_in: int
    revenue_today: Decimal
    revenue_month: Decimal
    occupancy_rate: float
    average_stay_length: float