from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from typing import Optional, List
from uuid import UUID
from datetime import date

from app.api.deps import (
    CurrentUser,
    SupabaseClient,
    SupabaseService,
    Cache,
    Pagination,
    require_permission
)
from app.schemas.room import (
    RoomTypeCreate,
    RoomTypeUpdate,
    RoomType,
    RoomTypeListResponse,
    RoomCreate,
    RoomUpdate,
    Room,
    RoomWithType,
    RoomListResponse,
    RoomStatus,
    RoomStatusUpdate,
    RoomImageUploadResponse,
    PriceCalculationRequest,
    PriceCalculationResponse
)
from app.services.room_service import RoomService
from app.core.exceptions import BadRequestException, NotFoundException, ConflictException
from datetime import datetime
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Room Type Endpoints

@router.post("/types", response_model=RoomType)
async def create_room_type(
    room_type: RoomTypeCreate,
    current_user: CurrentUser,
    db: SupabaseService,
    cache: Cache,
    _: dict = Depends(require_permission("rooms", "create"))
):
    """Create a new room type"""
    service = RoomService(db, cache)
    return await service.create_room_type(room_type)

@router.get("/types", response_model=RoomTypeListResponse)
async def get_room_types(
    pagination: Pagination,
    db: SupabaseClient,
    cache: Cache
):
    """Get all room types with pagination"""
    service = RoomService(db, cache)
    result = await service.get_room_types(
        page=pagination.page,
        limit=pagination.limit,
        sort_by=pagination.sort_by or "name",
        order=pagination.order
    )
    return result

@router.get("/types/{room_type_id}", response_model=RoomType)
async def get_room_type(
    room_type_id: UUID,
    db: SupabaseClient,
    cache: Cache
):
    """Get a single room type by ID"""
    service = RoomService(db, cache)
    return await service.get_room_type(room_type_id)

@router.put("/types/{room_type_id}", response_model=RoomType)
async def update_room_type(
    room_type_id: UUID,
    room_type: RoomTypeUpdate,
    current_user: CurrentUser,
    db: SupabaseService,
    cache: Cache,
    _: dict = Depends(require_permission("rooms", "edit"))
):
    """Update a room type"""
    service = RoomService(db, cache)
    return await service.update_room_type(room_type_id, room_type)

@router.delete("/types/{room_type_id}")
async def delete_room_type(
    room_type_id: UUID,
    current_user: CurrentUser,
    db: SupabaseService,
    cache: Cache,
    _: dict = Depends(require_permission("rooms", "delete"))
):
    """Soft delete a room type"""
    service = RoomService(db, cache)
    await service.delete_room_type(room_type_id)
    return {"message": "Room type deleted successfully"}

# Room Endpoints

@router.post("/", response_model=Room)
async def create_room(
    room: RoomCreate,
    current_user: CurrentUser,
    db: SupabaseClient,
    cache: Cache,
    _: dict = Depends(require_permission("rooms", "create"))
):
    """Create a new room"""
    service = RoomService(db, cache)
    return await service.create_room(room)

@router.get("/", response_model=RoomListResponse)
async def get_rooms(
    pagination: Pagination,
    db: SupabaseClient,
    cache: Cache,
    status: Optional[RoomStatus] = Query(None),
    floor: Optional[int] = Query(None),
    room_type_id: Optional[UUID] = Query(None),
    view_type: Optional[str] = Query(None),
    available_from: Optional[date] = Query(None),
    available_to: Optional[date] = Query(None)
):
    """List all rooms with advanced filtering"""
    service = RoomService(db, cache)
    
    # If checking availability, filter by available rooms
    if available_from and available_to:
        # This would require a more complex query joining with bookings
        # For now, we'll get all rooms and filter in the service
        pass
    
    result = await service.get_rooms(
        status=status,
        floor=floor,
        room_type_id=room_type_id,
        view_type=view_type,
        page=pagination.page,
        limit=pagination.limit,
        sort_by=pagination.sort_by or "room_number",
        order=pagination.order
    )
    
    return result

@router.get("/{room_id}", response_model=RoomWithType)
async def get_room(
    room_id: UUID,
    db: SupabaseClient
):
    """Get a single room by ID"""
    try:
        response = db.table("rooms").select("*, room_types(*)").eq("id", str(room_id)).single().execute()
        
        if not response.data:
            raise NotFoundException(f"Room {room_id} not found")
        
        room_data = response.data
        room_type_data = room_data.pop('room_types', None)
        room = RoomWithType(**room_data)
        if room_type_data:
            room.room_type = RoomType(**room_type_data)
        
        return room
    except Exception as e:
        logger.error(f"Error getting room: {str(e)}")
        raise

@router.put("/{room_id}", response_model=Room)
async def update_room(
    room_id: UUID,
    room: RoomUpdate,
    current_user: CurrentUser,
    db: SupabaseClient,
    cache: Cache,
    _: dict = Depends(require_permission("rooms", "edit"))
):
    """Update a room"""
    try:
        # Check if room exists
        existing = db.table("rooms").select("id").eq("id", str(room_id)).single().execute()
        if not existing.data:
            raise NotFoundException(f"Room {room_id} not found")
        
        # Update room
        update_data = room.model_dump(exclude_unset=True)
        if update_data:
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            response = db.table("rooms").update(update_data).eq("id", str(room_id)).execute()
            
            if not response.data:
                raise BadRequestException("Failed to update room")
            
            # Clear cache
            await cache.delete_pattern("rooms:*")
            
            return Room(**response.data[0])
        
        return Room(**existing.data)
        
    except Exception as e:
        logger.error(f"Error updating room: {str(e)}")
        raise

@router.post("/{room_id}/status", response_model=Room)
async def update_room_status(
    room_id: UUID,
    status_update: RoomStatusUpdate,
    current_user: CurrentUser,
    db: SupabaseClient,
    cache: Cache,
    _: dict = Depends(require_permission("rooms", "edit"))
):
    """Update room status with validation"""
    service = RoomService(db, cache)
    return await service.update_room_status(room_id, status_update)

@router.post("/{room_id}/images", response_model=RoomImageUploadResponse)
async def upload_room_images(
    room_id: UUID,
    current_user: CurrentUser,
    db: SupabaseClient,
    files: List[UploadFile] = File(...),
    _: dict = Depends(require_permission("rooms", "edit"))
):
    """Upload room images to Cloudflare R2"""
    # TODO: Implement image upload to R2
    # This is a placeholder implementation
    return RoomImageUploadResponse(
        images=[
            {
                "original": f"https://r2.url/rooms/{room_id}/image.jpg",
                "thumbnail": f"https://r2.url/rooms/{room_id}/thumb.jpg"
            }
        ]
    )

@router.get("/{room_id}/availability")
async def check_room_availability(
    room_id: UUID,
    db: SupabaseClient,
    cache: Cache,
    check_in: date = Query(...),
    check_out: date = Query(...)
):
    """Check if room is available for given dates"""
    if check_in >= check_out:
        raise BadRequestException("Check-out date must be after check-in date")
    
    service = RoomService(db, cache)
    is_available = await service.check_room_availability(room_id, check_in, check_out)
    
    return {
        "room_id": room_id,
        "check_in": check_in,
        "check_out": check_out,
        "is_available": is_available
    }

@router.delete("/{room_id}")
async def delete_room(
    room_id: UUID,
    current_user: CurrentUser,
    db: SupabaseClient,
    cache: Cache,
    _: dict = Depends(require_permission("rooms", "delete"))
):
    """Soft delete a room"""
    try:
        # Check if room has active bookings
        bookings = db.table("bookings").select("id").eq("room_id", str(room_id)).in_("status", ["confirmed", "checked_in"]).execute()
        
        if bookings.data:
            raise ConflictException(f"Cannot delete room. {len(bookings.data)} active bookings exist")
        
        # Soft delete
        response = db.table("rooms").update({"is_active": False, "updated_at": datetime.utcnow().isoformat()}).eq("id", str(room_id)).execute()
        
        if not response.data:
            raise NotFoundException(f"Room {room_id} not found")
        
        # Clear cache
        await cache.delete_pattern("rooms:*")
        
        return {"message": "Room deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting room: {str(e)}")
        raise

# Price calculation endpoint
@router.post("/calculate-price", response_model=PriceCalculationResponse)
async def calculate_room_price(
    request: PriceCalculationRequest,
    db: SupabaseClient,
    cache: Cache
):
    """Calculate room price based on occupancy and dates"""
    from app.services.currency_service import CurrencyService
    
    room_service = RoomService(db, cache)
    currency_service = CurrencyService(db, cache)
    
    # Calculate price in base currency (VND)
    price_response = await room_service.calculate_room_price(request, None)
    
    # Convert to requested currency if different
    if request.currency and request.currency != "VND":
        converted_total = await currency_service.convert_currency(
            price_response.total_price,
            "VND",
            request.currency
        )
        price_response.total_price = converted_total
        price_response.currency = request.currency
        
        # Convert individual components
        price_response.base_total = await currency_service.convert_currency(
            price_response.base_total, "VND", request.currency
        )
        price_response.extra_charges = await currency_service.convert_currency(
            price_response.extra_charges, "VND", request.currency
        )
        price_response.weekend_surcharge = await currency_service.convert_currency(
            price_response.weekend_surcharge, "VND", request.currency
        )
    
    return price_response

# Real-time status endpoint
@router.get("/{room_id}/real-time-status")
async def get_real_time_room_status(
    room_id: UUID,
    db: SupabaseClient,
    cache: Cache
):
    """Get real-time room status including current booking"""
    service = RoomService(db, cache)
    return await service.get_real_time_room_status(room_id)

# Batch status update
@router.post("/batch-status-update")
async def update_room_status_batch(
    room_ids: List[UUID],
    status: RoomStatus,
    notes: Optional[str] = None,
    current_user: CurrentUser = None,
    db: SupabaseClient = None,
    cache: Cache = None,
    _: dict = Depends(require_permission("rooms", "update"))
):
    """Update status for multiple rooms at once"""
    service = RoomService(db, cache)
    updated_rooms = await service.update_room_status_batch(room_ids, status, notes)
    return {"updated_rooms": updated_rooms, "count": len(updated_rooms)}