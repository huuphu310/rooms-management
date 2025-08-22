from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DECIMAL, Date, DateTime, JSON, CheckConstraint, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class SeasonalRate(Base):
    __tablename__ = "seasonal_rates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id", ondelete="CASCADE"), nullable=False)
    season_name = Column(String(100), nullable=False)
    season_type = Column(String(20), nullable=False)  # 'high', 'low', 'special_event'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Pricing adjustments
    rate_type = Column(String(20), nullable=False)  # 'multiplier', 'fixed', 'addition'
    rate_multiplier = Column(DECIMAL(10, 2))
    fixed_rate = Column(DECIMAL(10, 2))
    rate_addition = Column(DECIMAL(10, 2))
    
    # Constraints
    min_stay_nights = Column(Integer, default=1)
    max_stay_nights = Column(Integer)
    booking_window_start = Column(Date)
    booking_window_end = Column(Date)
    
    # Days of week applicable (binary for Mon-Sun)
    applicable_days = Column(String(7), default="1111111")
    
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    room_type = relationship("RoomType", back_populates="seasonal_rates")
    
    __table_args__ = (
        CheckConstraint('end_date >= start_date', name='end_after_start'),
        CheckConstraint('rate_multiplier IS NOT NULL OR fixed_rate IS NOT NULL OR rate_addition IS NOT NULL', 
                       name='at_least_one_rate'),
        CheckConstraint("season_type IN ('high', 'low', 'special_event')", name='valid_season_type'),
        CheckConstraint("rate_type IN ('multiplier', 'fixed', 'addition')", name='valid_rate_type'),
        CheckConstraint('min_stay_nights >= 1', name='min_stay_positive'),
    )

class PricingRule(Base):
    __tablename__ = "pricing_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(String)
    scope = Column(String(20), nullable=False)  # 'global', 'room_type', 'room'
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id", ondelete="CASCADE"))
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"))
    
    rule_type = Column(String(30), nullable=False)
    conditions = Column(JSON, nullable=False)
    
    # Discount/Surcharge
    adjustment_type = Column(String(20), nullable=False)  # 'discount', 'surcharge'
    adjustment_method = Column(String(20), nullable=False)  # 'percentage', 'fixed_amount'
    adjustment_value = Column(DECIMAL(10, 2), nullable=False)
    max_discount_amount = Column(DECIMAL(10, 2))
    
    # Validity
    valid_from = Column(Date)
    valid_to = Column(Date)
    usage_limit = Column(Integer)
    usage_count = Column(Integer, default=0)
    usage_per_customer = Column(Integer)
    
    # Stacking rules
    can_combine = Column(Boolean, default=False)
    exclude_rules = Column(ARRAY(UUID(as_uuid=True)))
    priority = Column(Integer, default=0)
    
    # Status
    requires_code = Column(Boolean, default=False)
    promo_code = Column(String(50))
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True))
    
    # Relationships
    room_type = relationship("RoomType", back_populates="pricing_rules")
    room = relationship("Room", back_populates="pricing_rules")
    
    __table_args__ = (
        CheckConstraint("scope IN ('global', 'room_type', 'room')", name='valid_scope'),
        CheckConstraint("rule_type IN ('early_bird', 'last_minute', 'long_stay', 'occupancy_based', 'group_booking')", 
                       name='valid_rule_type'),
        CheckConstraint("adjustment_type IN ('discount', 'surcharge')", name='valid_adjustment_type'),
        CheckConstraint("adjustment_method IN ('percentage', 'fixed_amount')", name='valid_adjustment_method'),
        CheckConstraint("(scope != 'room_type') OR (room_type_id IS NOT NULL)", name='valid_scope_room_type'),
        CheckConstraint("(scope != 'room') OR (room_id IS NOT NULL)", name='valid_scope_room'),
    )

class Amenity(Base):
    __tablename__ = "amenities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50))  # 'basic', 'comfort', 'entertainment', 'business'
    icon = Column(String(50))
    description = Column(String)
    is_premium = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    room_type_amenities = relationship("RoomTypeAmenity", back_populates="amenity", cascade="all, delete-orphan")
    room_amenities = relationship("RoomAmenity", back_populates="amenity", cascade="all, delete-orphan")

class RoomTypeAmenity(Base):
    __tablename__ = "room_type_amenities"
    
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id", ondelete="CASCADE"), primary_key=True)
    amenity_id = Column(UUID(as_uuid=True), ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True)
    is_standard = Column(Boolean, default=True)
    is_paid = Column(Boolean, default=False)
    charge_amount = Column(DECIMAL(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    room_type = relationship("RoomType", back_populates="room_type_amenities")
    amenity = relationship("Amenity", back_populates="room_type_amenities")

class RoomAmenity(Base):
    __tablename__ = "room_amenities"
    
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True)
    amenity_id = Column(UUID(as_uuid=True), ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True)
    is_available = Column(Boolean, default=True)
    is_working = Column(Boolean, default=True)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    room = relationship("Room", back_populates="room_amenities")
    amenity = relationship("Amenity", back_populates="room_amenities")