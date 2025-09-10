from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class BuildingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)  # e.g., 'A', 'B', 'MAIN'
    description: Optional[str] = None
    address: Optional[str] = Field(None, max_length=500)
    
    # Physical details
    total_floors: int = Field(..., ge=1, le=100)
    total_rooms: Optional[int] = Field(None, ge=0)
    
    # Features
    has_elevator: bool = Field(default=False)
    has_parking: bool = Field(default=False)
    has_pool: bool = Field(default=False)
    has_gym: bool = Field(default=False)
    has_restaurant: bool = Field(default=False)
    
    # Display
    display_order: int = Field(default=0)
    is_main_building: bool = Field(default=False)
    
    # Contact
    reception_phone: Optional[str] = Field(None, max_length=20)
    manager_name: Optional[str] = Field(None, max_length=100)
    manager_phone: Optional[str] = Field(None, max_length=20)
    
    # Notes
    notes: Optional[str] = None

class BuildingCreate(BuildingBase):
    pass

class BuildingUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    address: Optional[str] = Field(None, max_length=500)
    total_floors: Optional[int] = Field(None, ge=1, le=100)
    total_rooms: Optional[int] = Field(None, ge=0)
    has_elevator: Optional[bool] = None
    has_parking: Optional[bool] = None
    has_pool: Optional[bool] = None
    has_gym: Optional[bool] = None
    has_restaurant: Optional[bool] = None
    display_order: Optional[int] = None
    is_main_building: Optional[bool] = None
    reception_phone: Optional[str] = Field(None, max_length=20)
    manager_name: Optional[str] = Field(None, max_length=100)
    manager_phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None

class Building(BuildingBase):
    id: UUID
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    # Computed fields (will be populated from room counts)
    available_rooms: Optional[int] = None
    occupied_rooms: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class BuildingListResponse(BaseModel):
    data: List[Building]
    pagination: Optional[dict] = None