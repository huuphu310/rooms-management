"""Enhanced Customer Schema based on documentation"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, validator
from uuid import UUID
import re


class CustomerType(str, Enum):
    INDIVIDUAL = "individual"
    CORPORATE = "corporate"
    TRAVEL_AGENT = "travel_agent"
    GOVERNMENT = "government"


class CustomerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLACKLISTED = "blacklisted"
    SUSPENDED = "suspended"


class VIPStatus(str, Enum):
    NONE = "none"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


class Title(str, Enum):
    MR = "Mr"
    MRS = "Mrs"
    MS = "Ms"
    DR = "Dr"
    PROF = "Prof"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class IDType(str, Enum):
    PASSPORT = "passport"
    NATIONAL_ID = "national_id"
    DRIVER_LICENSE = "driver_license"


class CustomerSource(str, Enum):
    WALK_IN = "walk_in"
    WEBSITE = "website"
    PHONE = "phone"
    EMAIL = "email"
    REFERRAL = "referral"
    OTA = "ota"
    CORPORATE = "corporate"
    SOCIAL_MEDIA = "social_media"


class AddressBase(BaseModel):
    """Address information"""
    line1: Optional[str] = Field(None, max_length=200)
    line2: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    state_province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)


class EmergencyContact(BaseModel):
    """Emergency contact information"""
    name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    relationship: Optional[str] = Field(None, max_length=50)


class CustomerPreferences(BaseModel):
    """Customer preferences and requirements"""
    room_preferences: List[str] = Field(default_factory=list)  # ['high_floor', 'quiet', 'near_elevator']
    bed_preference: Optional[str] = None  # 'king', 'twin', 'double'
    pillow_preference: Optional[str] = None  # 'soft', 'firm', 'memory_foam'
    dietary_restrictions: List[str] = Field(default_factory=list)  # ['vegetarian', 'vegan', 'gluten_free']
    allergies: List[str] = Field(default_factory=list)
    newspaper_preference: Optional[str] = None
    wake_up_call: Optional[str] = None  # Preferred time
    temperature_preference: Optional[int] = None  # Preferred room temperature
    special_requirements: Optional[str] = None


class CustomerBase(BaseModel):
    """Base customer information"""
    # Personal Information
    title: Optional[Title] = None
    first_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=200)
    display_name: Optional[str] = Field(None, max_length=200)
    
    # Birth and Gender
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    
    # Nationality and Language
    nationality: Optional[str] = Field(None, max_length=100)
    passport_country: Optional[str] = Field(None, max_length=100)
    languages_spoken: List[str] = Field(default_factory=list)
    language_preference: str = Field(default="en", max_length=10)  # Use database field name
    
    # Contact Information
    email: Optional[EmailStr] = None
    email_verified: bool = False
    alternative_email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    phone_verified: bool = False
    alternative_phone: Optional[str] = Field(None, max_length=20)
    whatsapp_number: Optional[str] = Field(None, max_length=20)
    wechat_id: Optional[str] = Field(None, max_length=100)
    
    # Address
    address: Optional[AddressBase] = None
    
    # Emergency Contact
    emergency_contact: Optional[EmergencyContact] = None
    
    # Identification
    id_type: Optional[IDType] = None
    id_number: Optional[str] = Field(None, max_length=100)
    id_issue_date: Optional[date] = None
    id_expiry_date: Optional[date] = None
    id_issuing_country: Optional[str] = Field(None, max_length=100)
    
    # Customer Categories
    customer_type: CustomerType = CustomerType.INDIVIDUAL
    customer_source: Optional[CustomerSource] = None
    vip_level: int = Field(default=0, ge=0, le=5)  # Use database field name (0=none, 1=bronze, 2=silver, 3=gold, 4=platinum, 5=diamond)
    
    # Company Information (for corporate customers)
    company_name: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = Field(None, max_length=20)
    
    # Tax Information
    tax_id: Optional[str] = Field(None, max_length=50)
    tax_id_type: Optional[str] = Field(None, max_length=50)
    billing_address: Optional[str] = None
    
    # Preferences
    preferences: Optional[CustomerPreferences] = None
    
    # Marketing and Privacy
    marketing_consent: bool = False
    privacy_preferences: Dict[str, bool] = Field(default_factory=lambda: {
        'email_marketing': False,
        'sms_marketing': False,
        'phone_marketing': False,
        'data_sharing': False
    })
    
    # Notes and Status
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_blacklisted: bool = False
    blacklist_reason: Optional[str] = None
    is_active: bool = True  # Use database field name instead of status enum
    
    @validator('phone', 'alternative_phone', 'whatsapp_number')
    def validate_phone(cls, v):
        if v:
            phone_pattern = re.compile(r'^\+?[0-9\s\-\(\)]+$')
            if not phone_pattern.match(v):
                raise ValueError('Invalid phone number format')
            return v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        return v
    
    @validator('date_of_birth')
    def validate_age(cls, v):
        if v:
            today = date.today()
            age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
            if age < 0:
                raise ValueError('Date of birth cannot be in the future')
            if age > 120:
                raise ValueError('Invalid date of birth')
        return v
    
    @validator('phone', 'email')
    def validate_contact(cls, v, values):
        # Ensure at least one contact method is provided
        if 'phone' in values and 'email' in values:
            if not values.get('phone') and not values.get('email') and not v:
                raise ValueError('Either phone or email must be provided')
        return v


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer"""
    pass


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer"""
    # Personal Information
    title: Optional[Title] = None
    first_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    full_name: Optional[str] = Field(None, max_length=200)
    display_name: Optional[str] = Field(None, max_length=200)
    
    # Birth and Gender
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    
    # Nationality and Language
    nationality: Optional[str] = Field(None, max_length=100)
    passport_country: Optional[str] = Field(None, max_length=100)
    languages_spoken: Optional[List[str]] = None
    language_preference: Optional[str] = Field(None, max_length=10)
    
    # Contact Information
    email: Optional[EmailStr] = None
    email_verified: Optional[bool] = None
    alternative_email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    phone_verified: Optional[bool] = None
    alternative_phone: Optional[str] = Field(None, max_length=20)
    whatsapp_number: Optional[str] = Field(None, max_length=20)
    wechat_id: Optional[str] = Field(None, max_length=100)
    
    # Address
    address: Optional[AddressBase] = None
    
    # Emergency Contact
    emergency_contact: Optional[EmergencyContact] = None
    
    # Identification
    id_type: Optional[IDType] = None
    id_number: Optional[str] = Field(None, max_length=100)
    id_issue_date: Optional[date] = None
    id_expiry_date: Optional[date] = None
    id_issuing_country: Optional[str] = Field(None, max_length=100)
    
    # Customer Categories
    customer_type: Optional[CustomerType] = None
    customer_source: Optional[CustomerSource] = None
    vip_level: Optional[int] = Field(None, ge=0, le=5)
    
    # Company Information
    company_name: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = Field(None, max_length=20)
    
    # Tax Information
    tax_id: Optional[str] = Field(None, max_length=50)
    tax_id_type: Optional[str] = Field(None, max_length=50)
    billing_address: Optional[str] = None
    
    # Preferences
    preferences: Optional[CustomerPreferences] = None
    
    # Marketing and Privacy
    marketing_consent: Optional[bool] = None
    privacy_preferences: Optional[Dict[str, bool]] = None
    
    # Notes and Status
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_blacklisted: Optional[bool] = None
    blacklist_reason: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerStatistics(BaseModel):
    """Customer statistics and analytics"""
    total_stays: int = 0
    total_nights: int = 0
    total_spent: float = 0.0
    average_spend_per_stay: float = 0.0
    last_stay_date: Optional[datetime] = None
    first_stay_date: Optional[datetime] = None
    days_since_last_stay: Optional[int] = None
    lifetime_value: float = 0.0
    booking_frequency: float = 0.0  # Bookings per year
    cancellation_rate: float = 0.0
    no_show_rate: float = 0.0
    average_lead_time: int = 0  # Days between booking and check-in
    favorite_room_type: Optional[str] = None
    loyalty_points: int = 0
    loyalty_tier: Optional[str] = None
    profile_completeness: int = 0  # Percentage


class CustomerResponse(CustomerBase):
    """Customer response with all information"""
    id: UUID
    customer_code: str
    age: Optional[int] = None
    statistics: Optional[CustomerStatistics] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    last_modified_by: Optional[UUID] = None
    
    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    """Response for customer list with pagination"""
    data: List[CustomerResponse]
    pagination: Dict[str, Any]


class CustomerSearchParams(BaseModel):
    """Parameters for searching customers"""
    search: Optional[str] = None  # Search in name, email, phone, company
    customer_type: Optional[CustomerType] = None
    vip_status: Optional[VIPStatus] = None
    status: Optional[CustomerStatus] = None
    has_stayed: Optional[bool] = None
    is_blacklisted: Optional[bool] = None
    tags: Optional[List[str]] = None
    min_lifetime_value: Optional[float] = None
    max_lifetime_value: Optional[float] = None
    country: Optional[str] = None
    city: Optional[str] = None
    created_after: Optional[date] = None
    created_before: Optional[date] = None
    last_stay_after: Optional[date] = None
    last_stay_before: Optional[date] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    order: str = Field(default="desc")


class DuplicateCheckResponse(BaseModel):
    """Response for duplicate customer check"""
    has_duplicates: bool
    duplicates: List[CustomerResponse] = []
    similarity_scores: Optional[Dict[str, float]] = None
    suggested_action: Optional[str] = None  # 'merge', 'create_new', 'update_existing'


class CustomerMergeRequest(BaseModel):
    """Request to merge customer profiles"""
    primary_customer_id: UUID
    customer_ids_to_merge: List[UUID]
    merge_preferences: Dict[str, str] = Field(default_factory=dict)  # Field mapping for conflicts