from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

from app.api.deps import (
    CurrentUser,
    SupabaseClient,
    SupabaseService,
    Cache,
    Pagination,
    require_permission,
    AuthenticatedDbDep,
    get_current_active_user,
    get_supabase_service,
    get_supabase
)

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("")
@router.get("/", include_in_schema=False)
async def get_rooms(
    current_user: dict = Depends(get_current_active_user),
    db = Depends(get_supabase_service),
    pagination: Pagination = Depends(),
    status: Optional[str] = Query(None)
):
    """List all rooms - requires room read permission"""
    try:
        # Import the AuthService for permission checking
        from app.api.deps import AuthService
        
        # Debug logging
        logger.info(f"Current user in rooms endpoint: is_super_admin={current_user.get('is_super_admin')}, role={current_user.get('role')}")
        
        # Check API-level permission as requested: "check permission every time user calls api"
        has_permission = await AuthService.check_api_permission(
            current_user, "rooms", "read", db
        )
        
        if not has_permission:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to read rooms"
            )
        
        # Use pooled service client to bypass RLS
        from app.core.database_pool import db_pool
        service_db = db_pool.get_service_client()
        
        # Select all fields needed by frontend, including room_type relationship
        query = service_db.table("rooms").select("""
            *,
            room_type:room_types!rooms_room_type_id_fkey(*)
        """)
        
        if status:
            query = query.eq("status", status)
        
        response = query.limit(pagination.limit).offset(pagination.offset).execute()
        
        logger.info(f"Rooms query returned {len(response.data) if response.data else 0} rooms")
        
        # Get total count for pagination - use same fresh client
        count_response = service_db.table("rooms").select("id", count="exact").execute()
        total = count_response.count or 0
        logger.info(f"Total rooms count: {total}")
        
        return {
            "data": response.data or [],
            "pagination": {
                "page": pagination.page,
                "limit": pagination.limit,
                "total": total,
                "total_pages": (total + pagination.limit - 1) // pagination.limit if total > 0 else 0
            }
        }
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error getting rooms: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Return actual error for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {str(e)}"
        )

@router.get("/types")
async def get_room_types(
    user: dict = Depends(get_current_active_user),
    db = Depends(get_supabase_service),  # Keep param name for permission check
    pagination: Pagination = Depends()
):
    """Get all room types - requires room read permission"""
    try:
        logger.info(f"Getting room types for user: {user.get('id')}")
        
        # Import the AuthService for permission checking
        from app.api.deps import AuthService
        
        # Check API-level permission as requested: "check permission every time user calls api"
        has_permission = await AuthService.check_api_permission(
            user, "rooms", "read", db
        )
        
        if not has_permission:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to read room types"
            )
        
        # Use pooled service client to bypass RLS
        from app.core.database_pool import db_pool
        service_db = db_pool.get_service_client()
        
        # Use fresh service client for reading room types - return all fields
        response = service_db.table("room_types").select("*").limit(pagination.limit).offset(pagination.offset).execute()
        
        logger.info(f"Room types found: {len(response.data) if response.data else 0}")
        
        # Get total count for pagination
        count_response = service_db.table("room_types").select("id", count="exact").execute()
        total = count_response.count or 0
        
        return {
            "data": response.data or [],
            "pagination": {
                "page": pagination.page,
                "limit": pagination.limit,
                "total": total,
                "total_pages": (total + pagination.limit - 1) // pagination.limit if total > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"Error getting room types: {str(e)}")
        logger.error(f"Exception details: {type(e).__name__}: {e}")
        return {
            "data": [],
            "pagination": {
                "page": 1,
                "limit": 20,
                "total": 0,
                "total_pages": 0
            }
        }

@router.put("/types/{room_type_id}")
async def update_room_type(
    room_type_id: UUID,
    room_type_update: dict,  # Accept dict instead of schema to handle amenities field
    current_user: dict = Depends(get_current_active_user),
    db = Depends(get_supabase_service)
):
    """Update a room type - requires room update permission"""
    try:
        from app.api.deps import AuthService
        from app.services.room_service import RoomService
        from app.schemas.room import RoomTypeUpdate, RoomType
        from decimal import Decimal
        import json
        from fastapi.encoders import jsonable_encoder
        
        logger.info(f"Updating room type {room_type_id} with data: {room_type_update}")
        
        # Check permission
        has_permission = await AuthService.check_api_permission(
            current_user, "rooms", "update", db
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update room types"
            )
        
        # Handle amenities field - ensure it's an array
        if 'amenities' in room_type_update:
            if isinstance(room_type_update['amenities'], str):
                # If it's a JSON string, parse it
                try:
                    room_type_update['amenities'] = json.loads(room_type_update['amenities'])
                except:
                    room_type_update['amenities'] = []
            elif not isinstance(room_type_update['amenities'], list):
                # If it's not a list, make it an empty list
                room_type_update['amenities'] = []
        
        # Convert price fields to Decimal if they exist
        price_fields = [
            'base_price', 'weekend_price', 'holiday_price',
            'day_shift_price', 'night_shift_price', 'full_day_price',
            'weekend_day_shift_price', 'weekend_night_shift_price', 'weekend_full_day_price',
            'holiday_day_shift_price', 'holiday_night_shift_price', 'holiday_full_day_price',
            'extra_adult_charge', 'extra_child_charge', 'extra_person_charge',
            'extra_single_bed_charge', 'extra_double_bed_charge',
            'size_sqm_from', 'size_sqm_to'
        ]
        
        for field in price_fields:
            if field in room_type_update and room_type_update[field] is not None:
                try:
                    room_type_update[field] = Decimal(str(room_type_update[field]))
                except:
                    logger.warning(f"Could not convert {field} to Decimal: {room_type_update[field]}")
        
        # Create the update schema
        update_schema = RoomTypeUpdate(**room_type_update)
        
        # Use the room service to update
        room_service = RoomService(db)
        updated_room_type = await room_service.update_room_type(room_type_id, update_schema)
        
        logger.info(f"Room type {room_type_id} updated successfully")
        
        # Use FastAPI's jsonable_encoder to handle all special types (time, Decimal, UUID, etc.)
        return jsonable_encoder(updated_room_type)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating room type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating room type: {str(e)}"
        )

@router.get("/{room_id}")
async def get_room(
    room_id: UUID,
    db: AuthenticatedDbDep
):
    """Get a single room by ID - simplified test endpoint"""
    try:
        response = db.table("rooms").select("*").eq("id", str(room_id)).single().execute()
        
        if not response.data:
            return {"error": "Room not found"}
        
        return response.data
    except Exception as e:
        logger.error(f"Error getting room: {str(e)}")
        return {"error": str(e)}

@router.post("/{room_id}/mark-cleaned")
async def mark_room_cleaned(
    room_id: UUID,
    current_user: dict = Depends(get_current_active_user),
    db = Depends(get_supabase_service)
):
    """Mark a room as cleaned and change status from cleaning to available"""
    try:
        from app.api.deps import AuthService
        from app.core.database_pool import db_pool
        
        # Check permission
        has_permission = await AuthService.check_api_permission(
            current_user, "rooms", "update", db
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update room status"
            )
        
        # Use pooled service client to bypass RLS
        service_db = db_pool.get_service_client()
        
        # First check if room exists and is in cleaning status
        room_response = service_db.table("rooms").select("*").eq("id", str(room_id)).single().execute()
        
        if not room_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        room = room_response.data
        
        # Check if room is in cleaning status
        if room.get('status') != 'cleaning':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room is not in cleaning status. Current status: {room.get('status')}"
            )
        
        # Update room status to available
        update_response = service_db.table("rooms").update({
            'status': 'available',
            'status_reason': 'Cleaning completed',
            'cleaning_started_at': None,  # Clear cleaning start time
            'updated_at': datetime.now().isoformat()
        }).eq("id", str(room_id)).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update room status"
            )
        
        logger.info(f"Room {room_id} marked as cleaned by user {current_user.get('id')}")
        
        return {
            "success": True,
            "message": f"Room {room.get('room_number')} has been marked as cleaned and is now available",
            "room": update_response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking room as cleaned: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating room status: {str(e)}"
        )
