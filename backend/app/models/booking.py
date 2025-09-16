from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, String, Integer, Numeric, Date, Time, DateTime, Boolean, JSON, ForeignKey, Enum as SQLEnum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum
import uuid

class BookingStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class ShiftType(enum.Enum):
    DAY_SHIFT = "day_shift"        # 9:00 AM - 4:30 PM (7.5 hours)
    NIGHT_SHIFT = "night_shift"    # 5:30 PM - 8:30 AM next day (15 hours)
    FULL_DAY = "full_day"          # Traditional 24-hour stay
    TRADITIONAL = "traditional"     # Backward compatibility for existing bookings

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    booking_code = Column(String(20), unique=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False)
    
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    check_in_time = Column(Time)
    check_out_time = Column(Time)
    
    actual_check_in = Column(DateTime(timezone=True))
    actual_check_out = Column(DateTime(timezone=True))
    
    adults = Column(Integer, nullable=False, default=1)
    children = Column(Integer, default=0)
    total_nights = Column(Integer)  # Generated column in DB
    
    room_rate = Column(Numeric(10, 2), nullable=False)
    total_room_charge = Column(Numeric(10, 2), nullable=False)
    extra_charges = Column(Numeric(10, 2), default=0)
    discounts = Column(Numeric(10, 2), default=0)
    taxes = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    deposit_amount = Column(Numeric(10, 2), default=0)
    paid_amount = Column(Numeric(10, 2), default=0)
    
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING)
    source = Column(String(50))
    commission_rate = Column(Numeric(5, 2), default=0)
    
    special_requests = Column(String)
    internal_notes = Column(JSON)
    
    # Shift-based booking information
    shift_type = Column(SQLEnum(ShiftType), default=ShiftType.TRADITIONAL)
    shift_date = Column(Date)  # The specific date for this shift (for day shifts)
    total_shifts = Column(Integer, default=1)  # Number of shifts booked (for multi-shift bookings)
    
    # Currency information
    selected_currency = Column(String(3), default="VND")
    exchange_rate = Column(Numeric(10, 4), default=1.0000)
    
    cancellation_reason = Column(String)
    cancelled_at = Column(DateTime(timezone=True))
    cancelled_by = Column(UUID(as_uuid=True))
    
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    
    # Relationships
    customer = relationship("Customer", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")