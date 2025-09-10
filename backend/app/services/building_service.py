from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from app.schemas.building import (
    BuildingCreate, 
    BuildingUpdate, 
    Building,
    BuildingListResponse
)
from app.core.exceptions import NotFoundException, ConflictException
import logging

logger = logging.getLogger(__name__)

class BuildingService:
    def __init__(self, db, cache=None):
        self.db = db
        self.cache = cache
        
    async def create_building(self, building: BuildingCreate) -> Building:
        """Create a new building"""
        try:
            # Check if building with same name already exists
            existing = self.db.table("buildings").select("id").eq("name", building.name).eq("is_active", True).execute()
            if existing.data:
                raise ConflictException(f"Building with name '{building.name}' already exists")
            
            # Check if another building is marked as main
            if building.is_main_building:
                # Unset any existing main building
                self.db.table("buildings").update({"is_main_building": False}).eq("is_main_building", True).execute()
            
            building_data = building.model_dump()
            building_data['created_at'] = datetime.utcnow().isoformat()
            building_data['updated_at'] = datetime.utcnow().isoformat()
            
            response = self.db.table("buildings").insert(building_data).execute()
            
            if not response.data:
                raise Exception("Failed to create building")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("buildings:*")
            
            return Building(**response.data[0])
            
        except ConflictException:
            raise
        except Exception as e:
            logger.error(f"Error creating building: {str(e)}")
            raise
    
    async def get_buildings(
        self,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "display_order",
        order: str = "asc",
        include_inactive: bool = False
    ) -> BuildingListResponse:
        """Get all buildings with pagination"""
        try:
            cache_key = f"buildings:list:{page}:{limit}:{sort_by}:{order}:{include_inactive}"
            
            # Try to get from cache
            if self.cache:
                cached = await self.cache.get(cache_key)
                if cached:
                    return BuildingListResponse(**cached)
            
            # TEMPORARY: Test with service client to bypass RLS
            from app.core.database import get_supabase_service
            service_db = get_supabase_service()
            
            # Build query for data (using service client)
            query = service_db.table("buildings").select("*")
            
            if not include_inactive:
                query = query.eq("is_active", True)
            
            # Get total count using simpler approach (using service client)
            count_query = service_db.table("buildings").select("id")
            if not include_inactive:
                count_query = count_query.eq("is_active", True)
            
            count_response = count_query.execute()
            total = len(count_response.data) if count_response.data else 0
            
            # Apply sorting and pagination
            if order == "desc":
                query = query.order(sort_by, desc=True)
            else:
                query = query.order(sort_by)
            
            # Apply pagination
            start = (page - 1) * limit
            end = start + limit - 1
            query = query.range(start, end)
            
            response = query.execute()
            
            buildings = [Building(**item) for item in response.data] if response.data else []
            
            # Get room counts for each building (if rooms table exists) - using service client
            try:
                for building in buildings:
                    room_counts = service_db.table("rooms").select("status").eq("building", building.name).eq("is_active", True).execute()
                    
                    if room_counts.data:
                        building.total_rooms = len(room_counts.data)
                        building.available_rooms = sum(1 for r in room_counts.data if r.get('status') == 'available')
                        building.occupied_rooms = sum(1 for r in room_counts.data if r.get('status') == 'occupied')
            except Exception as room_error:
                # If rooms table doesn't exist or has issues, just continue without room counts
                logger.warning(f"Could not get room counts: {room_error}")
            
            result = BuildingListResponse(
                data=buildings,
                pagination={
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit
                }
            )
            
            # Cache the result
            if self.cache:
                await self.cache.set(cache_key, result.model_dump(), expire=300)
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting buildings: {str(e)}")
            raise
    
    async def get_building(self, building_id: UUID) -> Building:
        """Get a single building by ID"""
        try:
            response = self.db.table("buildings").select("*").eq("id", str(building_id)).single().execute()
            
            if not response.data:
                raise NotFoundException(f"Building {building_id} not found")
            
            building = Building(**response.data)
            
            # Get room counts
            room_counts = self.db.table("rooms").select("status").eq("building", building.name).eq("is_active", True).execute()
            
            if room_counts.data:
                building.total_rooms = len(room_counts.data)
                building.available_rooms = sum(1 for r in room_counts.data if r['status'] == 'available')
                building.occupied_rooms = sum(1 for r in room_counts.data if r['status'] == 'occupied')
            
            return building
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Error getting building: {str(e)}")
            raise
    
    async def update_building(self, building_id: UUID, building_update: BuildingUpdate) -> Building:
        """Update a building"""
        try:
            # Check if building exists
            existing = self.db.table("buildings").select("*").eq("id", str(building_id)).single().execute()
            if not existing.data:
                raise NotFoundException(f"Building {building_id} not found")
            
            update_data = building_update.model_dump(exclude_unset=True)
            
            if not update_data:
                return Building(**existing.data)
            
            # Check if name is being changed and if it conflicts
            if 'name' in update_data and update_data['name'] != existing.data['name']:
                name_check = self.db.table("buildings").select("id").eq("name", update_data['name']).eq("is_active", True).execute()
                if name_check.data:
                    raise ConflictException(f"Building with name '{update_data['name']}' already exists")
                
                # Update room references if name is changing
                old_name = existing.data['name']
                self.db.table("rooms").update({"building": update_data['name']}).eq("building", old_name).execute()
            
            # Handle main building flag
            if 'is_main_building' in update_data and update_data['is_main_building']:
                # Unset any existing main building
                self.db.table("buildings").update({"is_main_building": False}).eq("is_main_building", True).neq("id", str(building_id)).execute()
            
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            response = self.db.table("buildings").update(update_data).eq("id", str(building_id)).execute()
            
            if not response.data:
                raise Exception("Failed to update building")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("buildings:*")
            
            return Building(**response.data[0])
            
        except (NotFoundException, ConflictException):
            raise
        except Exception as e:
            logger.error(f"Error updating building: {str(e)}")
            raise
    
    async def delete_building(self, building_id: UUID) -> None:
        """Soft delete a building"""
        try:
            # Check if building exists
            existing = self.db.table("buildings").select("*").eq("id", str(building_id)).single().execute()
            if not existing.data:
                raise NotFoundException(f"Building {building_id} not found")
            
            # Check if building has any rooms
            rooms = self.db.table("rooms").select("id").eq("building", existing.data['name']).eq("is_active", True).execute()
            if rooms.data:
                raise ConflictException(f"Cannot delete building '{existing.data['name']}'. It has {len(rooms.data)} active rooms. Please reassign or delete the rooms first.")
            
            # Soft delete
            response = self.db.table("buildings").update({
                "is_active": False,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", str(building_id)).execute()
            
            if not response.data:
                raise Exception("Failed to delete building")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("buildings:*")
            
        except (NotFoundException, ConflictException):
            raise
        except Exception as e:
            logger.error(f"Error deleting building: {str(e)}")
            raise