from datetime import date, datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, validator
from uuid import UUID
import re


class CustomerType(str, Enum):
    INDIVIDUAL = "individual"
    COMPANY = "company"
    CORPORATE = "corporate"  # Added to fix validation error
    GROUP = "group"


class CustomerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLACKLISTED = "blacklisted"
    VIP = "vip"


class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: str = Field(..., min_length=10, max_length=20)
    id_number: Optional[str] = Field(None, max_length=50)
    id_type: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    customer_type: CustomerType = CustomerType.INDIVIDUAL
    company_name: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    preferences: Optional[dict] = {}
    loyalty_points: int = Field(default=0, ge=0)
    is_active: bool = True

    @validator('phone')
    def validate_phone(cls, v):
        phone_pattern = re.compile(r'^\+?[0-9\s\-\(\)]+$')
        if not phone_pattern.match(v):
            raise ValueError('Invalid phone number format')
        return v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

    @validator('email')
    def validate_email_format(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower() if v else None

    @validator('date_of_birth')
    def validate_age(cls, v):
        if v:
            today = date.today()
            age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
            if age < 0:
                raise ValueError('Date of birth cannot be in the future')
            if age < 18:
                raise ValueError('Customer must be at least 18 years old')
            if age > 120:
                raise ValueError('Invalid date of birth')
        return v


class CustomerCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    id_number: Optional[str] = Field(None, max_length=50)
    id_type: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    customer_type: CustomerType = CustomerType.INDIVIDUAL
    company_name: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    preferences: Optional[dict] = {}
    loyalty_points: int = Field(default=0, ge=0)
    is_active: bool = True
    
    @validator('phone')
    def validate_phone(cls, v):
        if v:
            phone_pattern = re.compile(r'^\+?[0-9\s\-\(\)]+$')
            if not phone_pattern.match(v):
                raise ValueError('Invalid phone number format')
            return v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        return v
    
    @validator('email')
    def validate_email_format(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower() if v else None
    
    @validator('phone', 'email')
    def validate_contact(cls, v, values):
        # Ensure at least one contact method is provided
        if 'phone' in values and 'email' in values:
            if not values.get('phone') and not values.get('email') and not v:
                raise ValueError('Either phone or email must be provided')
        return v


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    id_number: Optional[str] = Field(None, max_length=50)
    id_type: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    customer_type: Optional[CustomerType] = None
    company_name: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    preferences: Optional[dict] = None
    is_active: Optional[bool] = None


class CustomerInDB(CustomerBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    total_bookings: int = 0
    total_spent: float = 0
    last_visit: Optional[datetime] = None
    average_rating: Optional[float] = None
    is_returning: bool = False

    class Config:
        from_attributes = True


class CustomerResponse(BaseModel):
    id: UUID
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    id_number: Optional[str] = None
    id_type: Optional[str] = None
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    customer_type: CustomerType = CustomerType.INDIVIDUAL
    company_name: Optional[str] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    preferences: Optional[dict] = {}
    loyalty_points: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    total_bookings: int = 0
    total_spent: float = 0
    last_visit: Optional[datetime] = None
    average_rating: Optional[float] = None
    is_returning: bool = False
    
    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    data: List[CustomerResponse]
    total: int
    page: int
    limit: int


class CustomerSearchParams(BaseModel):
    query: Optional[str] = None
    customer_type: Optional[CustomerType] = None
    is_active: Optional[bool] = None
    min_loyalty_points: Optional[int] = None
    max_loyalty_points: Optional[int] = None
    has_bookings: Optional[bool] = None
    is_vip: Optional[bool] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    order: str = Field(default="desc")


class CustomerStatistics(BaseModel):
    customer_id: UUID
    total_bookings: int
    total_spent: float
    average_booking_value: float
    last_visit: Optional[datetime]
    most_booked_room_type: Optional[str]
    loyalty_points: int
    member_since: datetime
    days_since_last_visit: Optional[int]


class DuplicateCheckResponse(BaseModel):
    has_duplicates: bool
    duplicates: List[CustomerResponse] = []
    similarity_scores: Optional[dict] = None