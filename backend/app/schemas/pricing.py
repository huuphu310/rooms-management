from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from enum import Enum

class SeasonType(str, Enum):
    HIGH = "high"
    LOW = "low"
    SPECIAL_EVENT = "special_event"

class RateType(str, Enum):
    MULTIPLIER = "multiplier"
    FIXED = "fixed"
    ADDITION = "addition"

class RuleType(str, Enum):
    EARLY_BIRD = "early_bird"
    LAST_MINUTE = "last_minute"
    LONG_STAY = "long_stay"
    OCCUPANCY_BASED = "occupancy_based"
    GROUP_BOOKING = "group_booking"

class AdjustmentType(str, Enum):
    DISCOUNT = "discount"
    SURCHARGE = "surcharge"

class AdjustmentMethod(str, Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"

# Seasonal Pricing
class SeasonalRateBase(BaseModel):
    room_type_id: UUID
    season_name: str = Field(..., max_length=100)
    season_type: SeasonType
    start_date: date
    end_date: date
    
    # Pricing adjustments
    rate_type: RateType
    rate_multiplier: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    fixed_rate: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    rate_addition: Optional[Decimal] = Field(None, decimal_places=2)
    
    # Constraints
    min_stay_nights: int = Field(default=1, ge=1)
    max_stay_nights: Optional[int] = Field(None, ge=1)
    booking_window_start: Optional[date] = None
    booking_window_end: Optional[date] = None
    
    # Days of week applicable (binary for Mon-Sun)
    applicable_days: str = Field(default="1111111", max_length=7)
    
    priority: int = Field(default=0)
    is_active: bool = Field(default=True)
    
    @validator('end_date')
    def end_after_start(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v
    
    @validator('rate_multiplier', 'fixed_rate', 'rate_addition')
    def at_least_one_rate(cls, v, values):
        if not v and not values.get('rate_multiplier') and not values.get('fixed_rate') and not values.get('rate_addition'):
            raise ValueError('At least one rate value must be provided')
        return v
    
    @validator('applicable_days')
    def validate_days(cls, v):
        if len(v) != 7 or not all(c in '01' for c in v):
            raise ValueError('Applicable days must be 7 characters of 0 or 1')
        return v

class SeasonalRateCreate(SeasonalRateBase):
    pass

class SeasonalRateUpdate(BaseModel):
    season_name: Optional[str] = Field(None, max_length=100)
    season_type: Optional[SeasonType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rate_type: Optional[RateType] = None
    rate_multiplier: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    fixed_rate: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    rate_addition: Optional[Decimal] = Field(None, decimal_places=2)
    min_stay_nights: Optional[int] = Field(None, ge=1)
    max_stay_nights: Optional[int] = Field(None, ge=1)
    booking_window_start: Optional[date] = None
    booking_window_end: Optional[date] = None
    applicable_days: Optional[str] = Field(None, max_length=7)
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class SeasonalRate(SeasonalRateBase):
    id: UUID
    created_at: datetime
    created_by: Optional[UUID] = None

# Dynamic Pricing Rules
class PricingRuleBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    scope: str = Field(..., max_length=20)  # 'global', 'room_type', 'room'
    room_type_id: Optional[UUID] = None
    room_id: Optional[UUID] = None
    
    rule_type: RuleType
    
    # Conditions (JSON for flexibility)
    conditions: Dict[str, Any]
    """
    Example conditions:
    {
        "booking_advance_days": {"min": 30, "max": 90},
        "stay_nights": {"min": 3, "max": 7},
        "occupancy_percentage": {"min": 80},
        "guest_count": {"min": 5},
        "applicable_days": ["mon", "tue", "wed", "thu"],
        "applicable_months": [1, 2, 11, 12],
        "customer_type": ["returning", "vip"],
        "booking_source": ["direct", "website"]
    }
    """
    
    # Discount/Surcharge
    adjustment_type: AdjustmentType
    adjustment_method: AdjustmentMethod
    adjustment_value: Decimal = Field(..., decimal_places=2)
    max_discount_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Validity
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    usage_limit: Optional[int] = Field(None, ge=0)
    usage_count: int = Field(default=0, ge=0)
    usage_per_customer: Optional[int] = Field(None, ge=1)
    
    # Stacking rules
    can_combine: bool = Field(default=False)
    exclude_rules: Optional[List[UUID]] = None
    priority: int = Field(default=0)
    
    # Status
    requires_code: bool = Field(default=False)
    promo_code: Optional[str] = Field(None, max_length=50)
    is_active: bool = Field(default=True)
    
    @validator('room_type_id', 'room_id')
    def validate_scope(cls, v, values):
        scope = values.get('scope')
        if scope == 'room_type' and not values.get('room_type_id'):
            raise ValueError('room_type_id is required for room_type scope')
        if scope == 'room' and not values.get('room_id'):
            raise ValueError('room_id is required for room scope')
        return v
    
    @validator('valid_to')
    def valid_to_after_from(cls, v, values):
        if v and 'valid_from' in values and values['valid_from'] and v < values['valid_from']:
            raise ValueError('Valid to date must be after valid from date')
        return v

class PricingRuleCreate(PricingRuleBase):
    pass

class PricingRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    adjustment_type: Optional[AdjustmentType] = None
    adjustment_method: Optional[AdjustmentMethod] = None
    adjustment_value: Optional[Decimal] = Field(None, decimal_places=2)
    max_discount_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    usage_limit: Optional[int] = Field(None, ge=0)
    usage_per_customer: Optional[int] = Field(None, ge=1)
    can_combine: Optional[bool] = None
    exclude_rules: Optional[List[UUID]] = None
    priority: Optional[int] = None
    requires_code: Optional[bool] = None
    promo_code: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

class PricingRule(PricingRuleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None

# Amenities
class AmenityBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    category: Optional[str] = Field(None, max_length=50)  # 'basic', 'comfort', 'entertainment', 'business'
    icon: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    is_premium: bool = Field(default=False)
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True)

class AmenityCreate(AmenityBase):
    pass

class AmenityUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    is_premium: Optional[bool] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class Amenity(AmenityBase):
    id: UUID

# Room Type Amenities
class RoomTypeAmenity(BaseModel):
    room_type_id: UUID
    amenity_id: UUID
    is_standard: bool = Field(default=True)
    is_paid: bool = Field(default=False)
    charge_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)

# Room Amenities
class RoomAmenity(BaseModel):
    room_id: UUID
    amenity_id: UUID
    is_available: bool = Field(default=True)
    is_working: bool = Field(default=True)
    notes: Optional[str] = None

# Response models
class SeasonalRateListResponse(BaseModel):
    data: List[SeasonalRate]
    pagination: Dict[str, Any]

class PricingRuleListResponse(BaseModel):
    data: List[PricingRule]
    pagination: Dict[str, Any]

class AmenityListResponse(BaseModel):
    data: List[Amenity]
    pagination: Dict[str, Any]