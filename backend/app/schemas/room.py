from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, time
from decimal import Decimal
from uuid import UUID
from enum import Enum

class RoomStatus(str, Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    OCCUPIED = "occupied"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    BLOCKED = "blocked"

class RoomView(str, Enum):
    SEA = "sea"
    MOUNTAIN = "mountain"
    CITY = "city"
    GARDEN = "garden"
    POOL = "pool"
    NONE = "none"

class PricingMode(str, Enum):
    TRADITIONAL = "traditional"  # Per night pricing
    SHIFT = "shift"  # Per shift pricing

# Room Type Schemas
class RoomTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)  # e.g., 'STD', 'DLX', 'STE'
    
    # Pricing
    base_price: Decimal = Field(..., gt=0, decimal_places=2)
    weekend_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    holiday_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    extra_person_charge: Decimal = Field(default=0, ge=0, decimal_places=2)  # Deprecated
    
    # Shift-based Pricing
    pricing_mode: PricingMode = Field(default=PricingMode.TRADITIONAL)
    day_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    night_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    full_day_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Weekend shift pricing overrides
    weekend_day_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    weekend_night_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    weekend_full_day_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Holiday shift pricing overrides
    holiday_day_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    holiday_night_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    holiday_full_day_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Shift time configuration
    day_shift_start_time: Optional[time] = Field(default=time(9, 0))
    day_shift_end_time: Optional[time] = Field(default=time(16, 30))
    night_shift_start_time: Optional[time] = Field(default=time(17, 30))
    night_shift_end_time: Optional[time] = Field(default=time(8, 30))
    
    # Cleaning time configuration
    cleaning_time_minutes: int = Field(default=30, ge=0, le=240, description="Minimum time in minutes required for cleaning between shifts")
    
    # Capacity
    standard_occupancy: int = Field(default=2, ge=1, le=10)  # Keep for backward compatibility
    max_occupancy: int = Field(..., ge=1, le=10)
    min_occupancy: int = Field(default=1, ge=1, le=10)  # Keep for backward compatibility
    max_adults: Optional[int] = Field(None, ge=1, le=10)
    max_children: int = Field(default=0, ge=0, le=10)
    
    # New separate occupancy fields
    standard_adults_occupancy: int = Field(default=2, ge=1, le=10)
    standard_children_occupancy: int = Field(default=0, ge=0, le=10)
    
    extra_adult_charge: Decimal = Field(default=0, ge=0, decimal_places=2)
    extra_child_charge: Decimal = Field(default=0, ge=0, decimal_places=2)
    extra_single_bed_charge: Optional[Decimal] = Field(default=0, ge=0, decimal_places=2)
    extra_double_bed_charge: Optional[Decimal] = Field(default=0, ge=0, decimal_places=2)
    
    # Physical specifications
    size_sqm_from: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    size_sqm_to: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Amenities & Features
    standard_amenities: Optional[List[str]] = None
    bed_configuration: Optional[str] = None  # '1 King' or '2 Queens'
    bathroom_type: Optional[str] = Field(None, max_length=50)  # 'ensuite', 'shared'
    
    # Display & Marketing
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    features: Optional[List[str]] = None
    highlights: Optional[List[str]] = None
    images: Optional[List[Dict[str, str]]] = None
    thumbnail_url: Optional[str] = None
    display_order: int = Field(default=0)
    
    # Policies
    cancellation_policy_id: Optional[UUID] = None
    min_stay_nights: int = Field(default=1, ge=1)
    max_stay_nights: Optional[int] = Field(None, ge=1)
    
    @validator('weekend_price')
    def weekend_price_must_be_gte_base(cls, v, values):
        if v is not None and 'base_price' in values and v < values['base_price']:
            raise ValueError('Weekend price must be greater than or equal to base price')
        return v
    
    @validator('min_occupancy')
    def min_must_be_lte_max(cls, v, values):
        if 'max_occupancy' in values and v > values['max_occupancy']:
            raise ValueError('Minimum occupancy must be less than or equal to maximum occupancy')
        return v
    
    @validator('max_adults')
    def adults_must_be_lte_max_occupancy(cls, v, values):
        if v is not None and 'max_occupancy' in values and v > values['max_occupancy']:
            raise ValueError('Maximum adults must be less than or equal to maximum occupancy')
        return v

class RoomTypeCreate(RoomTypeBase):
    pass

class RoomTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    base_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    weekend_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    holiday_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Shift-based Pricing
    pricing_mode: Optional[PricingMode] = None
    day_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    night_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    full_day_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Weekend shift pricing overrides
    weekend_day_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    weekend_night_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    weekend_full_day_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Holiday shift pricing overrides
    holiday_day_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    holiday_night_shift_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    holiday_full_day_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Shift time configuration
    day_shift_start_time: Optional[time] = None
    day_shift_end_time: Optional[time] = None
    night_shift_start_time: Optional[time] = None
    night_shift_end_time: Optional[time] = None
    
    # Cleaning time configuration
    cleaning_time_minutes: Optional[int] = Field(None, ge=0, le=240, description="Minimum time in minutes required for cleaning between shifts")
    standard_occupancy: Optional[int] = Field(None, ge=1, le=10)  # Keep for backward compatibility
    max_occupancy: Optional[int] = Field(None, ge=1, le=10)
    min_occupancy: Optional[int] = Field(None, ge=1, le=10)  # Keep for backward compatibility
    max_adults: Optional[int] = Field(None, ge=1, le=10)
    max_children: Optional[int] = Field(None, ge=0, le=10)
    
    # New separate occupancy fields
    standard_adults_occupancy: Optional[int] = Field(None, ge=1, le=10)
    standard_children_occupancy: Optional[int] = Field(None, ge=0, le=10)
    
    extra_adult_charge: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    extra_child_charge: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    extra_person_charge: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    extra_single_bed_charge: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    extra_double_bed_charge: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    size_sqm_from: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    size_sqm_to: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    standard_amenities: Optional[List[str]] = None
    bed_configuration: Optional[str] = None
    bathroom_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    features: Optional[List[str]] = None
    highlights: Optional[List[str]] = None
    images: Optional[List[Dict[str, str]]] = None
    thumbnail_url: Optional[str] = None
    display_order: Optional[int] = None
    cancellation_policy_id: Optional[UUID] = None
    min_stay_nights: Optional[int] = Field(None, ge=1)
    max_stay_nights: Optional[int] = Field(None, ge=1)

class RoomType(RoomTypeBase):
    id: UUID
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Room Schemas
class RoomBase(BaseModel):
    room_number: str = Field(..., min_length=1, max_length=20)
    room_type_id: UUID
    
    # Location specifics
    floor: Optional[int] = Field(None, ge=0, le=100)
    building: Optional[str] = Field(None, max_length=50)  # Deprecated - use building_id
    building_id: Optional[UUID] = None  # Foreign key to buildings table
    wing: Optional[str] = Field(None, max_length=50)  # Wing/Section
    zone: Optional[str] = Field(None, max_length=50)  # Zone/Area
    view_type: Optional[RoomView] = RoomView.NONE
    position: Optional[str] = Field(None, max_length=50)  # 'corner', 'center', 'end'
    
    # Physical attributes
    actual_size_sqm: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    ceiling_height_m: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # Room-specific features
    additional_amenities: Optional[List[str]] = None
    missing_amenities: Optional[List[str]] = None
    special_features: Optional[List[str]] = None  # ['Balcony', 'Connecting door']
    connecting_room_id: Optional[UUID] = None
    
    # Accessibility & Preferences
    is_smoking: bool = Field(default=False)
    is_accessible: bool = Field(default=False)  # Wheelchair accessible
    is_pet_friendly: bool = Field(default=False)
    noise_level: Optional[str] = Field(None, max_length=20)  # 'quiet', 'moderate', 'street_facing'
    
    # Override pricing
    custom_base_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    price_modifier: Optional[Decimal] = Field(None, decimal_places=2)  # Percentage modifier
    price_modifier_reason: Optional[str] = None
    
    # Status & Availability
    status: RoomStatus = RoomStatus.AVAILABLE
    status_reason: Optional[str] = None
    status_until: Optional[datetime] = None
    long_term_status: Optional[str] = Field(None, max_length=20)  # 'active', 'renovation', 'out_of_service'
    
    # Maintenance & Quality
    condition_score: Optional[int] = Field(None, ge=1, le=10)
    last_renovated_date: Optional[datetime] = None
    last_deep_cleaned_date: Optional[datetime] = None
    last_inspected_date: Optional[datetime] = None
    next_maintenance_date: Optional[datetime] = None
    maintenance_notes: Optional[str] = None
    
    # Images
    room_images: Optional[List[Dict[str, Any]]] = None
    virtual_tour_url: Optional[str] = None
    
    # Housekeeping
    housekeeping_notes: Optional[str] = None
    cleaning_duration_minutes: int = Field(default=30, ge=0)
    cleaning_duration_hours: int = Field(default=2, ge=0, le=24)  # Duration in hours for cleaning
    cleaning_started_at: Optional[datetime] = None  # When cleaning started after checkout
    cleaning_priority: int = Field(default=5, ge=1, le=10)
    
    # General notes
    notes: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    room_number: Optional[str] = Field(None, min_length=1, max_length=20)
    room_type_id: Optional[UUID] = None
    # Location
    floor: Optional[int] = Field(None, ge=0, le=100)
    building: Optional[str] = Field(None, max_length=50)  # Deprecated - use building_id
    building_id: Optional[UUID] = None  # Foreign key to buildings table
    wing: Optional[str] = Field(None, max_length=50)
    zone: Optional[str] = Field(None, max_length=50)
    view_type: Optional[RoomView] = None
    position: Optional[str] = Field(None, max_length=50)
    # Physical
    actual_size_sqm: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    ceiling_height_m: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    # Features
    additional_amenities: Optional[List[str]] = None
    missing_amenities: Optional[List[str]] = None
    special_features: Optional[List[str]] = None
    connecting_room_id: Optional[UUID] = None
    # Accessibility
    is_smoking: Optional[bool] = None
    is_accessible: Optional[bool] = None
    is_pet_friendly: Optional[bool] = None
    noise_level: Optional[str] = Field(None, max_length=20)
    # Pricing
    custom_base_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    price_modifier: Optional[Decimal] = Field(None, decimal_places=2)
    price_modifier_reason: Optional[str] = None
    # Status
    status: Optional[RoomStatus] = None
    status_reason: Optional[str] = None
    status_until: Optional[datetime] = None
    long_term_status: Optional[str] = Field(None, max_length=20)
    # Maintenance
    condition_score: Optional[int] = Field(None, ge=1, le=10)
    last_renovated_date: Optional[datetime] = None
    last_deep_cleaned_date: Optional[datetime] = None
    last_inspected_date: Optional[datetime] = None
    next_maintenance_date: Optional[datetime] = None
    maintenance_notes: Optional[str] = None
    # Images
    room_images: Optional[List[Dict[str, Any]]] = None
    virtual_tour_url: Optional[str] = None
    # Housekeeping
    housekeeping_notes: Optional[str] = None
    cleaning_duration_minutes: Optional[int] = Field(None, ge=0)
    cleaning_priority: Optional[int] = Field(None, ge=1, le=10)
    
    # General notes
    notes: Optional[str] = None

class RoomStatusUpdate(BaseModel):
    status: RoomStatus
    notes: Optional[str] = None
    estimated_ready_time: Optional[datetime] = None

class Room(RoomBase):
    id: UUID
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    room_type: Optional[RoomType] = None
    building_name: Optional[str] = None  # Populated from JOIN with buildings table
    building_code: Optional[str] = None  # Populated from JOIN with buildings table
    
    model_config = ConfigDict(from_attributes=True)

class RoomWithType(Room):
    room_type: RoomType

class RoomAvailability(BaseModel):
    room_id: UUID
    room_number: str
    is_available: bool
    current_status: RoomStatus
    next_available_date: Optional[datetime] = None

# Response models
class RoomTypeListResponse(BaseModel):
    data: List[RoomType]
    pagination: Dict[str, Any]

class RoomListResponse(BaseModel):
    data: List[RoomWithType]
    pagination: Dict[str, Any]

class RoomImageUploadResponse(BaseModel):
    images: List[Dict[str, str]]

# Pricing calculation schemas
class OccupancyDetails(BaseModel):
    adults: int = Field(..., ge=0)
    children: int = Field(..., ge=0)
    
    @validator('adults')
    def adults_must_be_positive(cls, v):
        if v < 1:
            raise ValueError('At least one adult is required')
        return v

class PriceCalculationRequest(BaseModel):
    room_type_id: UUID
    check_in_date: datetime
    check_out_date: datetime
    occupancy: OccupancyDetails
    currency: Optional[str] = "VND"  # VND or USD
    # Shift-based pricing fields
    shift_type: Optional[str] = None  # 'day_shift', 'night_shift', 'full_day', 'traditional'
    shift_date: Optional[datetime] = None  # For shift bookings
    total_shifts: Optional[int] = Field(None, ge=1)
    
class PriceCalculationResponse(BaseModel):
    base_price: Decimal
    extra_adult_charge: Decimal
    extra_child_charge: Decimal
    weekend_surcharge: Decimal
    total_price: Decimal
    currency: str
    nights: int
    breakdown: Dict[str, Any]
    # Shift-based pricing response fields
    pricing_mode: Optional[str] = None  # 'traditional' or 'shift'
    shift_type: Optional[str] = None
    shift_price: Optional[Decimal] = None
    total_shifts: Optional[int] = None

# Multi-language support
class Language(str, Enum):
    EN = "en"
    VI = "vi"

class CurrencyConfig(BaseModel):
    base_currency: str = "VND"
    exchange_rates: Dict[str, Decimal]  # e.g., {"USD": 0.000041, "EUR": 0.000038}
    last_updated: datetime