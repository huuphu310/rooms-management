from fastapi import APIRouter, Depends, Query
from typing import Optional
from uuid import UUID

from app.api.deps import (
    CurrentUser,
    SupabaseService,
    Cache,
    require_permission,
    RequestContextDep,
    get_current_active_user,
    get_current_user_optional,
    get_request_context,
    get_supabase_service,
    get_cache
)
from app.schemas.building import (
    BuildingCreate,
    BuildingUpdate,
    Building,
    BuildingListResponse
)
from app.dal.buildings import BuildingsDAL
from app.core.context import RequestContext
from app.core.exceptions import BadRequestException, NotFoundException, ConflictException
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=Building)
async def create_building(
    building: BuildingCreate,
    ctx: RequestContextDep,
    db: SupabaseService = Depends(get_supabase_service),
    _: dict = Depends(require_permission("rooms", "create"))
):
    """Create a new building using Backend-Only Gateway approach"""
    dal = BuildingsDAL(db)
    return await dal.create_building(ctx, building)

@router.get("", response_model=BuildingListResponse)
@router.get("/", response_model=BuildingListResponse, include_in_schema=False)
async def get_buildings(
    db: SupabaseService = Depends(get_supabase_service),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("display_order", regex="^(name|code|display_order|total_floors|created_at)$"),
    order: str = Query("asc", regex="^(asc|desc)$"),
    include_inactive: bool = Query(False),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get all buildings with pagination - public endpoint"""
    # Buildings can be viewed without authentication (for room selection)
    # But if user is authenticated, we can use their context
    
    if current_user:
        logger.info(f"Buildings endpoint reached with authenticated user: {current_user.get('id')}")
        ctx = await get_request_context(current_user)
        dal = BuildingsDAL(db)
        result = await dal.list_buildings(
            ctx=ctx,
            page=page,
            limit=limit,
            sort_by=sort_by,
            order=order,
            include_inactive=include_inactive
        )
    else:
        logger.info("Buildings endpoint reached without authentication - public access")
        # For public access, create a minimal context or use service directly
        from app.services.building_service import BuildingService
        service = BuildingService(db)
        result = await service.get_buildings(
            page=page,
            limit=limit,
            sort_by=sort_by,
            order=order,
            include_inactive=include_inactive
        )
        result = result.model_dump()
    
    logger.info("get_buildings completed successfully")
    return BuildingListResponse(**result)

@router.get("/{building_id}", response_model=Building)
async def get_building(
    building_id: UUID,
    ctx: RequestContextDep,
    db: SupabaseService = Depends(get_supabase_service)
):
    """Get a single building by ID using Backend-Only Gateway approach"""
    dal = BuildingsDAL(db)
    building = await dal.get_building(ctx, building_id)
    if not building:
        raise NotFoundException(f"Building {building_id} not found")
    return building

@router.put("/{building_id}", response_model=Building)
async def update_building(
    building_id: UUID,
    building: BuildingUpdate,
    ctx: RequestContextDep,
    db: SupabaseService = Depends(get_supabase_service),
    _: dict = Depends(require_permission("rooms", "edit"))
):
    """Update a building using Backend-Only Gateway approach"""
    dal = BuildingsDAL(db)
    updated_building = await dal.update_building(ctx, building_id, building)
    if not updated_building:
        raise NotFoundException(f"Building {building_id} not found")
    return updated_building

@router.delete("/{building_id}")
async def delete_building(
    building_id: UUID,
    ctx: RequestContextDep,
    db: SupabaseService = Depends(get_supabase_service),
    _: dict = Depends(require_permission("rooms", "delete"))
):
    """Soft delete a building using Backend-Only Gateway approach"""
    dal = BuildingsDAL(db)
    deleted = await dal.delete_building(ctx, building_id)
    if not deleted:
        raise NotFoundException(f"Building {building_id} not found")
    return {"message": "Building deleted successfully"}
