from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DECIMAL, DateTime, JSON, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class RoomType(Base):
    __tablename__ = "room_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(20))  # e.g., 'STD', 'DLX', 'STE'
    
    # Pricing
    base_price = Column(DECIMAL(10, 2), nullable=False)
    weekend_price = Column(DECIMAL(10, 2))
    holiday_price = Column(DECIMAL(10, 2))
    extra_person_charge = Column(DECIMAL(10, 2), default=0)  # Deprecated
    
    # Capacity
    standard_occupancy = Column(Integer, default=2)
    max_occupancy = Column(Integer, nullable=False)
    min_occupancy = Column(Integer, default=1)
    max_adults = Column(Integer)
    max_children = Column(Integer, default=0)
    extra_adult_charge = Column(DECIMAL(10, 2), default=0)
    extra_child_charge = Column(DECIMAL(10, 2), default=0)
    
    # Physical specifications
    size_sqm = Column(DECIMAL(10, 2))  # Deprecated - use size_sqm_from/to
    size_sqm_from = Column(DECIMAL(10, 2))
    size_sqm_to = Column(DECIMAL(10, 2))
    
    # Amenities & Features
    standard_amenities = Column(JSON)
    bed_configuration = Column(String(100))  # '1 King' or '2 Queens'
    bathroom_type = Column(String(50))  # 'ensuite', 'shared'
    
    # Display & Marketing
    description = Column(String)
    short_description = Column(String(500))
    features = Column(JSON)
    highlights = Column(JSON)
    images = Column(JSON)
    thumbnail_url = Column(String)
    display_order = Column(Integer, default=0)
    
    # Policies
    cancellation_policy_id = Column(UUID(as_uuid=True))
    min_stay_nights = Column(Integer, default=1)
    max_stay_nights = Column(Integer)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    rooms = relationship("Room", back_populates="room_type", cascade="all, delete-orphan")
    seasonal_rates = relationship("SeasonalRate", back_populates="room_type", cascade="all, delete-orphan")
    pricing_rules = relationship("PricingRule", back_populates="room_type", cascade="all, delete-orphan")
    room_type_amenities = relationship("RoomTypeAmenity", back_populates="room_type", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint('max_occupancy >= 1 AND max_occupancy <= 10', name='valid_max_occupancy'),
        CheckConstraint('min_occupancy >= 1 AND min_occupancy <= max_occupancy', name='valid_min_occupancy'),
        CheckConstraint('min_stay_nights >= 1', name='valid_min_stay'),
    )

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_number = Column(String(20), unique=True, nullable=False)
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id"), nullable=False)
    
    # Location specifics
    floor = Column(Integer)
    building = Column(String(50))  # For multi-building properties
    wing = Column(String(50))  # Wing/Section
    zone = Column(String(50))  # Zone/Area
    view_type = Column(String(20), default='none')  # 'sea', 'mountain', 'city', 'garden', 'pool', 'none'
    position = Column(String(50))  # 'corner', 'center', 'end'
    
    # Physical attributes
    actual_size_sqm = Column(DECIMAL(10, 2))
    ceiling_height_m = Column(DECIMAL(10, 2))
    
    # Room-specific features
    additional_amenities = Column(JSON)
    missing_amenities = Column(JSON)
    special_features = Column(JSON)  # ['Balcony', 'Connecting door']
    connecting_room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"))
    
    # Accessibility & Preferences
    is_smoking = Column(Boolean, default=False)
    is_accessible = Column(Boolean, default=False)  # Wheelchair accessible
    is_pet_friendly = Column(Boolean, default=False)
    noise_level = Column(String(20))  # 'quiet', 'moderate', 'street_facing'
    
    # Override pricing
    custom_base_price = Column(DECIMAL(10, 2))
    price_modifier = Column(DECIMAL(10, 2))  # Percentage modifier
    price_modifier_reason = Column(String)
    
    # Status & Availability
    status = Column(String(20), default='available')  # 'available', 'booked', 'occupied', 'cleaning', 'maintenance', 'blocked'
    status_reason = Column(String)
    status_until = Column(DateTime)
    long_term_status = Column(String(20))  # 'active', 'renovation', 'out_of_service'
    
    # Maintenance & Quality
    condition_score = Column(Integer)  # 1-10
    last_renovated_date = Column(DateTime)
    last_deep_cleaned_date = Column(DateTime)
    last_inspected_date = Column(DateTime)
    next_maintenance_date = Column(DateTime)
    maintenance_notes = Column(String)
    
    # Images
    room_images = Column(JSON)
    virtual_tour_url = Column(String)
    
    # Housekeeping
    housekeeping_notes = Column(String)
    cleaning_duration_minutes = Column(Integer, default=30)
    cleaning_priority = Column(Integer, default=5)  # 1-10
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    room_type = relationship("RoomType", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room", cascade="all, delete-orphan")
    pricing_rules = relationship("PricingRule", back_populates="room", cascade="all, delete-orphan")
    room_amenities = relationship("RoomAmenity", back_populates="room", cascade="all, delete-orphan")
    connecting_room = relationship("Room", remote_side=[id], backref="connected_rooms")
    
    __table_args__ = (
        CheckConstraint('floor >= 0 AND floor <= 100', name='valid_floor'),
        CheckConstraint('condition_score >= 1 AND condition_score <= 10', name='valid_condition_score'),
        CheckConstraint('cleaning_priority >= 1 AND cleaning_priority <= 10', name='valid_cleaning_priority'),
        CheckConstraint("status IN ('available', 'booked', 'occupied', 'cleaning', 'maintenance', 'blocked')", 
                       name='valid_status'),
        CheckConstraint("view_type IN ('sea', 'mountain', 'city', 'garden', 'pool', 'none')", 
                       name='valid_view_type'),
    )