from sqlalchemy import Column, String, Text, Date, DateTime, Integer, Float, Boolean, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class CustomerTypeEnum(str, enum.Enum):
    INDIVIDUAL = "individual"
    COMPANY = "company"
    GROUP = "group"


class CustomerStatusEnum(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLACKLISTED = "blacklisted"
    VIP = "vip"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(20), nullable=False, index=True)
    id_number = Column(String(50), nullable=True, unique=True, index=True)
    id_type = Column(String(50), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    nationality = Column(String(100), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    customer_type = Column(SQLEnum(CustomerTypeEnum), default=CustomerTypeEnum.INDIVIDUAL)
    company_name = Column(String(255), nullable=True, index=True)
    tax_id = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    preferences = Column(JSON, default={})
    loyalty_points = Column(Integer, default=0)
    status = Column(SQLEnum(CustomerStatusEnum), default=CustomerStatusEnum.ACTIVE, index=True)
    
    total_bookings = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    last_visit = Column(DateTime(timezone=True), nullable=True)
    average_rating = Column(Float, nullable=True)
    is_returning = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Customer {self.full_name} ({self.email})>"