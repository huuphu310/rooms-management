from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from uuid import UUID
from datetime import date

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
        
        # IMPORTANT: Create fresh service client to bypass RLS
        from supabase import create_client
        from app.core.config import settings
        service_db = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY
        )
        
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
        
        # Create fresh service client to bypass RLS
        from supabase import create_client
        from app.core.config import settings
        service_db = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY
        )
        
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
