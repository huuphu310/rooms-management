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
from fastapi import HTTPException

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

@router.post("/calculate")
async def calculate_price(
    request: dict,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_active_user)
):
    """Calculate room price for a booking request"""
    try:
        from datetime import datetime
        
        # Extract request data
        room_type_id = request.get("room_type_id")
        check_in_date = request.get("check_in_date")
        check_out_date = request.get("check_out_date")
        adults = request.get("adults", 1)
        children = request.get("children", 0)
        
        # Get room type information
        room_type_result = db.table("room_types").select("*").eq("id", room_type_id).execute()
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        room_type = room_type_result.data[0]
        
        # Parse dates
        check_in = datetime.strptime(check_in_date, "%Y-%m-%d").date()
        check_out = datetime.strptime(check_out_date, "%Y-%m-%d").date()
        nights = (check_out - check_in).days
        
        if nights <= 0:
            raise HTTPException(status_code=400, detail="Check-out date must be after check-in date")
        
        # Calculate base price
        base_price = float(room_type.get("base_price", 0))
        
        # Check for weekend/holiday pricing
        is_weekend = check_in.weekday() >= 5  # Saturday = 5, Sunday = 6
        
        if is_weekend and room_type.get("weekend_price"):
            room_rate = float(room_type["weekend_price"])
        else:
            room_rate = base_price
        
        # Calculate extra charges for additional guests
        standard_occupancy = room_type.get("standard_occupancy", 2)
        extra_adults = max(0, adults - standard_occupancy)
        extra_adult_charge = float(room_type.get("extra_adult_charge", 0)) * extra_adults
        extra_child_charge = float(room_type.get("extra_child_charge", 0)) * children
        
        # Calculate totals
        subtotal = (room_rate * nights) + (extra_adult_charge * nights) + (extra_child_charge * nights)
        tax_rate = 0.10  # 10% tax
        tax_amount = subtotal * tax_rate
        total_price = subtotal + tax_amount
        
        # Calculate deposit (30% of total)
        deposit_amount = total_price * 0.30
        
        return {
            "room_rate": room_rate,
            "nights": nights,
            "subtotal": subtotal,
            "extra_adult_charge": extra_adult_charge * nights,
            "extra_child_charge": extra_child_charge * nights,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "total_price": total_price,
            "deposit_amount": deposit_amount,
            "currency": "VND"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating price: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating price: {str(e)}")
