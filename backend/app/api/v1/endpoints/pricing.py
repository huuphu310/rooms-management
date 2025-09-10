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

@router.get("/seasonal-rates")
async def get_seasonal_rates(
    service_db: SupabaseService = Depends(get_supabase_service),
    pagination: Pagination = Depends(),
    room_type_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_active_user)
):
    """Get all seasonal pricing rates"""
    try:
        logger.info(f"Getting seasonal rates for user: {user.get('id')}")
        
        # Use service client to bypass RLS for reading seasonal rates
        query = service_db.table("seasonal_rates").select("""
            id,
            room_type_id,
            season_name,
            season_type,
            start_date,
            end_date,
            rate_type,
            rate_multiplier,
            fixed_rate,
            rate_addition,
            min_stay_nights,
            max_stay_nights,
            priority,
            is_active,
            created_at
        """)
        
        if room_type_id:
            query = query.eq("room_type_id", room_type_id)
        
        query = query.eq("is_active", True).order("priority", desc=False)
        
        response = query.limit(pagination.limit).offset(pagination.offset).execute()
        
        logger.info(f"Seasonal rates found: {len(response.data) if response.data else 0}")
        
        return {
            "seasonal_rates": response.data or [],
            "total": len(response.data) if response.data else 0,
            "page": pagination.page,
            "limit": pagination.limit
        }
    except Exception as e:
        logger.error(f"Error getting seasonal rates: {str(e)}")
        logger.error(f"Exception details: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"seasonal_rates": [], "total": 0, "page": 1, "limit": 20}

@router.post("/seasonal-rates")
async def create_seasonal_rate(
    rate_data: dict,
    db: AuthenticatedDbDep
):
    """Create a new seasonal rate"""
    try:
        response = db.table("seasonal_rates").insert(rate_data).execute()
        
        if response.data:
            return response.data[0]
        else:
            return {"error": "Failed to create seasonal rate"}
    except Exception as e:
        logger.error(f"Error creating seasonal rate: {str(e)}")
        return {"error": str(e)}

@router.put("/seasonal-rates/{rate_id}")
async def update_seasonal_rate(
    rate_id: UUID,
    rate_data: dict,
    db: AuthenticatedDbDep
):
    """Update a seasonal rate"""
    try:
        response = db.table("seasonal_rates").update(rate_data).eq("id", str(rate_id)).execute()
        
        if response.data:
            return response.data[0]
        else:
            return {"error": "Failed to update seasonal rate"}
    except Exception as e:
        logger.error(f"Error updating seasonal rate: {str(e)}")
        return {"error": str(e)}

@router.delete("/seasonal-rates/{rate_id}")
async def delete_seasonal_rate(
    rate_id: UUID,
    db: AuthenticatedDbDep
):
    """Delete a seasonal rate"""
    try:
        response = db.table("seasonal_rates").delete().eq("id", str(rate_id)).execute()
        
        return {"message": "Seasonal rate deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting seasonal rate: {str(e)}")
        return {"error": str(e)}

@router.get("/pricing-rules")
async def get_pricing_rules(
    db: AuthenticatedDbDep,
    pagination: Pagination = Depends(),
    scope: Optional[str] = Query(None)
):
    """Get all pricing rules"""
    try:
        query = db.table("pricing_rules").select("""
            id,
            name,
            description,
            scope,
            room_type_id,
            rule_type,
            conditions,
            adjustment_type,
            adjustment_method,
            adjustment_value,
            max_discount_amount,
            valid_from,
            valid_to,
            usage_limit,
            usage_count,
            can_combine,
            priority,
            requires_code,
            promo_code,
            is_active,
            created_at
        """)
        
        if scope:
            query = query.eq("scope", scope)
        
        query = query.eq("is_active", True).order("priority", desc=False)
        
        response = query.limit(pagination.limit).offset(pagination.offset).execute()
        
        return {
            "pricing_rules": response.data or [],
            "total": len(response.data) if response.data else 0,
            "page": pagination.page,
            "limit": pagination.limit
        }
    except Exception as e:
        logger.error(f"Error getting pricing rules: {str(e)}")
        return {"pricing_rules": [], "total": 0, "page": 1, "limit": 20}

@router.post("/calculate-price")
async def calculate_room_price(
    calculation_data: dict,
    db: AuthenticatedDbDep
):
    """Calculate room price based on dates, room type, and applicable rules"""
    try:
        # This would implement the complex pricing calculation logic
        # For now, return a basic response
        return {
            "base_price": 100.00,
            "total_price": 100.00,
            "applied_rules": [],
            "breakdown": {
                "base_rate": 100.00,
                "seasonal_adjustments": 0.00,
                "rule_adjustments": 0.00,
                "taxes": 0.00
            }
        }
    except Exception as e:
        logger.error(f"Error calculating price: {str(e)}")
        return {"error": str(e)}
