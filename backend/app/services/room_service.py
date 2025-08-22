from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, date
from supabase import Client
from app.schemas.room import (
    RoomTypeCreate, RoomTypeUpdate, RoomType,
    RoomCreate, RoomUpdate, Room, RoomWithType,
    RoomStatus, RoomStatusUpdate, RoomAvailability,
    PriceCalculationRequest, PriceCalculationResponse,
    OccupancyDetails
)
from app.core.exceptions import (
    NotFoundException, ConflictException, BadRequestException
)
from app.core.redis_client import CacheService
import logging

logger = logging.getLogger(__name__)

class RoomService:
    """Service for room management operations"""
    
    def __init__(self, db: Client, cache: CacheService = None):
        self.db = db
        self.cache = cache
    
    # Room Type Operations
    async def create_room_type(self, room_type: RoomTypeCreate) -> RoomType:
        """Create a new room type"""
        try:
            # Check if room type name already exists
            existing = self.db.table("room_types").select("id").eq("name", room_type.name).execute()
            if existing.data:
                raise ConflictException(f"Room type '{room_type.name}' already exists")
            
            # Create room type
            data = room_type.model_dump()
            data['id'] = str(uuid4())
            data['created_at'] = datetime.utcnow().isoformat()
            data['updated_at'] = datetime.utcnow().isoformat()
            
            # Convert Decimal values to float for JSON serialization
            for key, value in data.items():
                if hasattr(value, '__class__') and value.__class__.__name__ == 'Decimal':
                    data[key] = float(value)
                elif isinstance(value, (int, float)) and key in ['base_price', 'weekend_price', 'holiday_price', 
                                                                 'extra_adult_charge', 'extra_child_charge']:
                    data[key] = float(value)
            
            response = self.db.table("room_types").insert(data).execute()
            
            if not response.data:
                raise BadRequestException("Failed to create room type")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("room_types:*")
            
            return RoomType(**response.data[0])
            
        except Exception as e:
            logger.error(f"Error creating room type: {str(e)}")
            raise
    
    async def get_room_types(
        self,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "name",
        order: str = "asc"
    ) -> Dict[str, Any]:
        """Get all room types with pagination"""
        try:
            # Check cache
            cache_key = f"room_types:page:{page}:limit:{limit}:sort:{sort_by}:{order}"
            if self.cache:
                cached = await self.cache.get(cache_key)
                if cached:
                    return cached
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Get total count
            count_response = self.db.table("room_types").select("id", count="exact").eq("is_active", True).execute()
            total = count_response.count or 0
            
            # Get room types
            query = self.db.table("room_types").select("*").eq("is_active", True)
            
            if sort_by:
                query = query.order(sort_by, desc=(order == "desc"))
            
            query = query.limit(limit).offset(offset)
            response = query.execute()
            
            room_types = [RoomType(**rt) for rt in response.data]
            
            result = {
                "data": room_types,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit
                }
            }
            
            # Cache result (convert Pydantic models to dict for caching)
            if self.cache:
                cache_data = {
                    "data": [rt.model_dump() for rt in room_types],
                    "pagination": result["pagination"]
                }
                await self.cache.set(cache_key, cache_data, expire=300)
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting room types: {str(e)}")
            raise
    
    async def get_room_type(self, room_type_id: UUID) -> RoomType:
        """Get a single room type by ID"""
        try:
            response = self.db.table("room_types").select("*").eq("id", str(room_type_id)).single().execute()
            
            if not response.data:
                raise NotFoundException(f"Room type {room_type_id} not found")
            
            return RoomType(**response.data)
            
        except Exception as e:
            logger.error(f"Error getting room type: {str(e)}")
            raise
    
    async def update_room_type(self, room_type_id: UUID, room_type_update: RoomTypeUpdate) -> RoomType:
        """Update a room type"""
        try:
            # Check if room type exists
            existing = await self.get_room_type(room_type_id)
            
            # Update only provided fields
            update_data = room_type_update.model_dump(exclude_unset=True)
            if update_data:
                update_data['updated_at'] = datetime.utcnow().isoformat()
                
                # Convert Decimal values to float for JSON serialization
                for key, value in update_data.items():
                    if hasattr(value, '__class__') and value.__class__.__name__ == 'Decimal':
                        update_data[key] = float(value)
                    elif isinstance(value, (int, float)) and key in ['base_price', 'weekend_price', 'holiday_price', 
                                                                     'extra_adult_charge', 'extra_child_charge']:
                        update_data[key] = float(value)
                
                logger.info(f"Updating room type {room_type_id} with data: {update_data}")
                response = self.db.table("room_types").update(update_data).eq("id", str(room_type_id)).execute()
                
                logger.info(f"Update response: {response}")
                if not response.data:
                    # Check if the room type exists
                    check_response = self.db.table("room_types").select("id").eq("id", str(room_type_id)).execute()
                    if not check_response.data:
                        raise NotFoundException(f"Room type {room_type_id} not found")
                    raise BadRequestException("Failed to update room type - possible RLS policy issue")
                
                # Clear cache
                if self.cache:
                    await self.cache.delete_pattern("room_types:*")
                
                return RoomType(**response.data[0])
            
            return existing
            
        except Exception as e:
            logger.error(f"Error updating room type: {str(e)}")
            raise
    
    async def delete_room_type(self, room_type_id: UUID) -> bool:
        """Soft delete a room type"""
        try:
            # Check if any rooms are using this type
            rooms = self.db.table("rooms").select("id").eq("room_type_id", str(room_type_id)).eq("is_active", True).execute()
            
            if rooms.data:
                raise ConflictException(f"Cannot delete room type. {len(rooms.data)} rooms are using this type")
            
            # Soft delete
            response = self.db.table("room_types").update({"is_active": False, "updated_at": datetime.utcnow().isoformat()}).eq("id", str(room_type_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Room type {room_type_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("room_types:*")
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting room type: {str(e)}")
            raise
    
    # Room Operations
    async def create_room(self, room: RoomCreate) -> Room:
        """Create a new room"""
        try:
            # Check if room number already exists
            existing = self.db.table("rooms").select("id").eq("room_number", room.room_number).execute()
            if existing.data:
                raise ConflictException(f"Room number '{room.room_number}' already exists")
            
            # Verify room type exists
            room_type = await self.get_room_type(room.room_type_id)
            
            # Create room
            data = room.model_dump()
            data['id'] = str(uuid4())
            data['room_type_id'] = str(room.room_type_id)
            data['created_at'] = datetime.utcnow().isoformat()
            data['updated_at'] = datetime.utcnow().isoformat()
            
            response = self.db.table("rooms").insert(data).execute()
            
            if not response.data:
                raise BadRequestException("Failed to create room")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("rooms:*")
            
            return Room(**response.data[0])
            
        except Exception as e:
            logger.error(f"Error creating room: {str(e)}")
            raise
    
    async def get_rooms(
        self,
        status: Optional[RoomStatus] = None,
        floor: Optional[int] = None,
        room_type_id: Optional[UUID] = None,
        view_type: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "room_number",
        order: str = "asc"
    ) -> Dict[str, Any]:
        """Get all rooms with filters and pagination"""
        try:
            # Build cache key
            cache_key = f"rooms:status:{status}:floor:{floor}:type:{room_type_id}:page:{page}:limit:{limit}"
            if self.cache:
                cached = await self.cache.get(cache_key)
                if cached:
                    return cached
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Build query
            query = self.db.table("rooms").select("*, room_types(*)").eq("is_active", True)
            
            if status:
                query = query.eq("status", status)
            if floor is not None:
                query = query.eq("floor", floor)
            if room_type_id:
                query = query.eq("room_type_id", str(room_type_id))
            if view_type:
                query = query.eq("view_type", view_type)
            
            # Get total count
            count_query = query
            count_response = count_query.execute()
            total = len(count_response.data) if count_response.data else 0
            
            # Apply sorting and pagination
            if sort_by:
                query = query.order(sort_by, desc=(order == "desc"))
            
            query = query.limit(limit).offset(offset)
            response = query.execute()
            
            # Format response
            rooms = []
            for room_data in response.data:
                room_type_data = room_data.pop('room_types', None)
                if room_type_data:
                    # Fix amenities format if it's a dict with 'items' key
                    if room_type_data.get('amenities') and isinstance(room_type_data['amenities'], dict):
                        if 'items' in room_type_data['amenities']:
                            room_type_data['amenities'] = room_type_data['amenities']['items']
                    
                    # Add room_type to room_data before creating RoomWithType
                    room_data['room_type'] = room_type_data
                    room = RoomWithType(**room_data)
                    rooms.append(room)
                else:
                    # Skip rooms without room_type data
                    logger.warning(f"Room {room_data.get('id')} has no room_type data")
                    continue
            
            result = {
                "data": rooms,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit
                }
            }
            
            # Cache result - convert to dict for JSON serialization
            if self.cache:
                cache_data = {
                    "data": [room.model_dump() for room in rooms],
                    "pagination": result["pagination"]
                }
                await self.cache.set(cache_key, cache_data, expire=300)
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting rooms: {str(e)}")
            raise
    
    async def update_room_status(self, room_id: UUID, status_update: RoomStatusUpdate) -> Room:
        """Update room status with validation"""
        try:
            # Get current room
            response = self.db.table("rooms").select("*").eq("id", str(room_id)).single().execute()
            
            if not response.data:
                raise NotFoundException(f"Room {room_id} not found")
            
            current_room = Room(**response.data)
            
            # Validate status transition
            if not self._is_valid_status_transition(current_room.status, status_update.status):
                raise BadRequestException(
                    f"Invalid status transition from {current_room.status} to {status_update.status}"
                )
            
            # Update status
            update_data = {
                "status": status_update.status,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if status_update.notes:
                update_data["notes"] = status_update.notes
            
            # Special handling for cleaning status
            if status_update.status == RoomStatus.AVAILABLE and current_room.status == RoomStatus.CLEANING:
                update_data["last_cleaned_at"] = datetime.utcnow().isoformat()
            
            response = self.db.table("rooms").update(update_data).eq("id", str(room_id)).execute()
            
            if not response.data:
                raise BadRequestException("Failed to update room status")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("rooms:*")
                await self.cache.delete_pattern(f"room_availability:{room_id}:*")
            
            return Room(**response.data[0])
            
        except Exception as e:
            logger.error(f"Error updating room status: {str(e)}")
            raise
    
    async def check_room_availability(
        self,
        room_id: UUID,
        check_in_date: date,
        check_out_date: date
    ) -> bool:
        """Check if room is available for given dates"""
        try:
            # Cache key
            cache_key = f"room_availability:{room_id}:{check_in_date}:{check_out_date}"
            if self.cache:
                cached = await self.cache.get(cache_key)
                if cached is not None:
                    return cached
            
            # Check for overlapping bookings
            query = self.db.table("bookings").select("id").eq("room_id", str(room_id))
            query = query.in_("status", ["confirmed", "checked_in"])
            query = query.lt("check_in_date", str(check_out_date))
            query = query.gt("check_out_date", str(check_in_date))
            
            response = query.execute()
            
            is_available = len(response.data) == 0
            
            # Cache result
            if self.cache:
                await self.cache.set(cache_key, is_available, expire=600)  # 10 minutes
            
            return is_available
            
        except Exception as e:
            logger.error(f"Error checking room availability: {str(e)}")
            raise
    
    def _is_valid_status_transition(self, from_status: RoomStatus, to_status: RoomStatus) -> bool:
        """Check if status transition is valid"""
        valid_transitions = {
            RoomStatus.AVAILABLE: [RoomStatus.BOOKED, RoomStatus.OCCUPIED, RoomStatus.MAINTENANCE, RoomStatus.BLOCKED],
            RoomStatus.BOOKED: [RoomStatus.OCCUPIED, RoomStatus.AVAILABLE, RoomStatus.CANCELLED],
            RoomStatus.OCCUPIED: [RoomStatus.CLEANING, RoomStatus.AVAILABLE],
            RoomStatus.CLEANING: [RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE],
            RoomStatus.MAINTENANCE: [RoomStatus.AVAILABLE, RoomStatus.BLOCKED],
            RoomStatus.BLOCKED: [RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE]
        }
        
        return to_status in valid_transitions.get(from_status, [])
    
    async def calculate_room_price(
        self,
        request: PriceCalculationRequest,
        exchange_rate: Optional[float] = None
    ) -> PriceCalculationResponse:
        """Calculate room price based on occupancy and dates"""
        try:
            # Get room type
            room_type = await self.get_room_type(request.room_type_id)
            
            # Calculate nights
            nights = (request.check_out_date.date() - request.check_in_date.date()).days
            if nights <= 0:
                raise BadRequestException("Check-out date must be after check-in date")
            
            # Calculate base price
            base_price_per_night = float(room_type.base_price)
            
            # Calculate extra charges
            extra_adults = max(0, request.occupancy.adults - room_type.min_occupancy)
            extra_children = request.occupancy.children
            
            extra_adult_charge_per_night = extra_adults * float(room_type.extra_adult_charge or 0)
            extra_child_charge_per_night = extra_children * float(room_type.extra_child_charge or 0)
            
            # Calculate weekend surcharge
            weekend_surcharge = 0
            if room_type.weekend_price:
                current_date = request.check_in_date.date()
                while current_date < request.check_out_date.date():
                    # Friday (4) and Saturday (5) are weekends
                    if current_date.weekday() in [4, 5]:
                        weekend_surcharge += float(room_type.weekend_price - room_type.base_price)
                    current_date = current_date.replace(day=current_date.day + 1)
            
            # Calculate total
            total_base = base_price_per_night * nights
            total_extra_adult = extra_adult_charge_per_night * nights
            total_extra_child = extra_child_charge_per_night * nights
            total_price = total_base + total_extra_adult + total_extra_child + weekend_surcharge
            
            # Apply currency conversion if needed
            currency = request.currency
            if currency != "VND" and exchange_rate:
                total_price = total_price * exchange_rate
                total_base = total_base * exchange_rate
                total_extra_adult = total_extra_adult * exchange_rate
                total_extra_child = total_extra_child * exchange_rate
                weekend_surcharge = weekend_surcharge * exchange_rate
            
            return PriceCalculationResponse(
                base_price=total_base,
                extra_adult_charge=total_extra_adult,
                extra_child_charge=total_extra_child,
                weekend_surcharge=weekend_surcharge,
                total_price=total_price,
                currency=currency,
                nights=nights,
                breakdown={
                    "base_price_per_night": base_price_per_night,
                    "extra_adults": extra_adults,
                    "extra_children": extra_children,
                    "weekend_nights": int(weekend_surcharge / (float(room_type.weekend_price or 0) - float(room_type.base_price)) if room_type.weekend_price else 0)
                }
            )
            
        except Exception as e:
            logger.error(f"Error calculating room price: {str(e)}")
            raise
    
    async def get_real_time_room_status(self, room_id: UUID) -> Dict[str, Any]:
        """Get real-time room status including current booking if any"""
        try:
            # Get room details
            room_response = self.db.table("rooms").select("*, room_types(*)").eq("id", str(room_id)).single().execute()
            
            if not room_response.data:
                raise NotFoundException(f"Room {room_id} not found")
            
            room_data = room_response.data
            
            # Get current booking if room is occupied
            current_booking = None
            if room_data['status'] in ['occupied', 'booked']:
                booking_response = self.db.table("bookings").select("*").eq("room_id", str(room_id)).in_("status", ["confirmed", "checked_in"]).execute()
                
                if booking_response.data:
                    current_booking = booking_response.data[0]
            
            # Get last cleaning record
            last_cleaning = None
            if room_data.get('last_cleaned_at'):
                last_cleaning = room_data['last_cleaned_at']
            
            return {
                "room_id": room_id,
                "room_number": room_data['room_number'],
                "current_status": room_data['status'],
                "is_available": room_data['status'] == 'available',
                "current_booking": current_booking,
                "last_cleaned_at": last_cleaning,
                "next_maintenance_date": room_data.get('next_maintenance_date'),
                "updated_at": room_data['updated_at'],
                "room_type": room_data.get('room_types')
            }
            
        except Exception as e:
            logger.error(f"Error getting real-time room status: {str(e)}")
            raise
    
    async def update_room_status_batch(
        self,
        room_ids: List[UUID],
        status: RoomStatus,
        notes: Optional[str] = None
    ) -> List[Room]:
        """Update status for multiple rooms at once"""
        try:
            updated_rooms = []
            
            for room_id in room_ids:
                room = await self.update_room_status(
                    room_id,
                    RoomStatusUpdate(status=status, notes=notes)
                )
                updated_rooms.append(room)
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("rooms:*")
            
            return updated_rooms
            
        except Exception as e:
            logger.error(f"Error updating room status batch: {str(e)}")
            raise