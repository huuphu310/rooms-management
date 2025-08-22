from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from uuid import UUID
from datetime import date, timedelta

from app.api.deps import (
    CurrentUser,
    get_cache,
    require_permission,
    get_supabase
)
from app.schemas.pricing import (
    SeasonalRateCreate,
    SeasonalRateUpdate,
    SeasonalRate,
    SeasonalRateListResponse,
    PricingRuleCreate,
    PricingRuleUpdate,
    PricingRule,
    PricingRuleListResponse,
    AmenityCreate,
    AmenityUpdate,
    Amenity,
    AmenityListResponse,
    RoomTypeAmenity,
    RoomAmenity
)
from app.services.pricing_service import PricingService
from app.core.exceptions import BadRequestException, NotFoundException
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class PriceCalculationRequest(BaseModel):
    room_type_id: str
    check_in_date: date
    check_out_date: date
    adults: int = Field(ge=1)
    children: Optional[int] = Field(default=0, ge=0)
    promo_code: Optional[str] = None


class PriceCalculationResponse(BaseModel):
    base_price: float
    nights: int
    room_total: float
    seasonal_adjustment: float = 0
    extra_person_charge: float = 0
    applicable_rules: List[dict] = []
    subtotal: float
    discount_amount: float = 0
    tax_amount: float = 0
    total_amount: float
    breakdown_by_night: Optional[List[dict]] = None


@router.post("/calculate", response_model=PriceCalculationResponse)
async def calculate_price(
    request: PriceCalculationRequest,
    db = Depends(get_supabase),
    cache = Depends(get_cache)
):
    """Calculate price for a booking based on room type, dates, and occupancy"""
    try:
        # Validate dates
        if request.check_out_date <= request.check_in_date:
            raise BadRequestException("Check-out date must be after check-in date")
        
        # Get room type details
        room_type_response = db.table("room_types").select("*").eq(
            "id", request.room_type_id
        ).single().execute()
        
        if not room_type_response.data:
            raise NotFoundException("Room type not found")
        
        room_type = room_type_response.data
        
        # Calculate nights
        nights = (request.check_out_date - request.check_in_date).days
        
        # Get base price
        base_price = float(room_type.get('base_price', 0))
        
        # Calculate room total (base price * nights)
        room_total = base_price * nights
        
        # Calculate extra person charges
        total_guests = request.adults + request.children
        standard_occupancy = room_type.get('standard_occupancy', 2)
        extra_person_charge = 0
        
        if total_guests > standard_occupancy:
            extra_persons = total_guests - standard_occupancy
            extra_adult_charge = float(room_type.get('extra_adult_charge', 0))
            extra_child_charge = float(room_type.get('extra_child_charge', 0))
            
            # Assume extra adults first, then children
            extra_adults = min(extra_persons, max(0, request.adults - standard_occupancy))
            extra_children = extra_persons - extra_adults
            
            if extra_adults > 0:
                extra_person_charge += extra_adults * extra_adult_charge * nights
            if extra_children > 0:
                extra_person_charge += extra_children * extra_child_charge * nights
        
        # Check for seasonal rates
        seasonal_adjustment = 0
        seasonal_rates_response = db.table("seasonal_rates").select("*").eq(
            "room_type_id", request.room_type_id
        ).gte("end_date", str(request.check_in_date)).lte(
            "start_date", str(request.check_out_date)
        ).eq("is_active", True).execute()
        
        if seasonal_rates_response.data:
            for rate in seasonal_rates_response.data:
                rate_type = rate.get('rate_type')
                if rate_type == 'multiplier':
                    multiplier = float(rate.get('rate_multiplier', 1.0))
                    seasonal_adjustment += room_total * (multiplier - 1)
                elif rate_type == 'fixed':
                    fixed_rate = float(rate.get('fixed_rate', 0))
                    seasonal_adjustment += (fixed_rate - base_price) * nights
                elif rate_type == 'addition':
                    addition = float(rate.get('rate_addition', 0))
                    seasonal_adjustment += addition * nights
        
        # Calculate subtotal
        subtotal = room_total + seasonal_adjustment + extra_person_charge
        
        # Apply pricing rules (discounts/surcharges)
        applicable_rules = []
        discount_amount = 0
        
        # Check for early bird, last minute, long stay rules
        pricing_rules_response = db.table("pricing_rules").select("*").eq(
            "is_active", True
        ).execute()
        
        if pricing_rules_response.data:
            booking_days_advance = (request.check_in_date - date.today()).days
            
            for rule in pricing_rules_response.data:
                # Check if rule applies to this room type
                if rule.get('scope') == 'room_type' and rule.get('room_type_id') != request.room_type_id:
                    continue
                
                rule_type = rule.get('rule_type')
                conditions = rule.get('conditions', {})
                applies = False
                
                if rule_type == 'early_bird':
                    min_days = conditions.get('min_days_advance', 0)
                    if booking_days_advance >= min_days:
                        applies = True
                
                elif rule_type == 'last_minute':
                    max_days = conditions.get('max_days_advance', 7)
                    if 0 <= booking_days_advance <= max_days:
                        applies = True
                
                elif rule_type == 'long_stay':
                    min_nights = conditions.get('min_nights', 3)
                    if nights >= min_nights:
                        applies = True
                
                if applies:
                    adjustment_method = rule.get('adjustment_method')
                    adjustment_value = float(rule.get('adjustment_value', 0))
                    
                    if adjustment_method == 'percentage':
                        discount = subtotal * (adjustment_value / 100)
                    else:  # fixed_amount
                        discount = adjustment_value
                    
                    # Apply max discount limit if set
                    max_discount = rule.get('max_discount_amount')
                    if max_discount:
                        discount = min(discount, float(max_discount))
                    
                    if rule.get('adjustment_type') == 'discount':
                        discount_amount += discount
                    else:  # surcharge
                        discount_amount -= discount
                    
                    applicable_rules.append({
                        'rule_name': rule.get('name'),
                        'adjustment_type': rule.get('adjustment_type'),
                        'adjustment_value': discount
                    })
        
        # Calculate tax (10% VAT)
        tax_rate = 0.10
        tax_amount = (subtotal - discount_amount) * tax_rate
        
        # Calculate total
        total_amount = subtotal - discount_amount + tax_amount
        
        # Create breakdown by night
        breakdown_by_night = []
        current_date = request.check_in_date
        for i in range(nights):
            breakdown_by_night.append({
                'date': str(current_date),
                'base_rate': base_price,
                'adjusted_rate': base_price + (seasonal_adjustment / nights if nights > 0 else 0),
                'applied_rates': []
            })
            current_date = current_date + timedelta(days=1)
        
        return PriceCalculationResponse(
            base_price=base_price,
            nights=nights,
            room_total=room_total,
            seasonal_adjustment=seasonal_adjustment,
            extra_person_charge=extra_person_charge,
            applicable_rules=applicable_rules,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            breakdown_by_night=breakdown_by_night
        )
        
    except (BadRequestException, NotFoundException):
        raise
    except Exception as e:
        logger.error(f"Error calculating price: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate price: {str(e)}"
        )

# Seasonal Rates Endpoints
@router.get("/seasonal-rates", response_model=SeasonalRateListResponse)
async def get_seasonal_rates(
    room_type_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_supabase),
    cache = Depends(get_cache)
):
    """Get all seasonal rates with optional filters"""
    service = PricingService(db, cache)
    return await service.get_seasonal_rates(
        room_type_id=room_type_id,
        is_active=is_active,
        start_date=start_date,
        end_date=end_date,
        page=page,
        limit=limit
    )

@router.get("/seasonal-rates/{rate_id}", response_model=SeasonalRate)
async def get_seasonal_rate(
    rate_id: UUID,
    db = Depends(get_supabase),
    cache = Depends(get_cache)
):
    """Get a specific seasonal rate"""
    service = PricingService(db, cache)
    return await service.get_seasonal_rate(rate_id)

@router.post("/seasonal-rates", response_model=SeasonalRate)
async def create_seasonal_rate(
    rate_data: SeasonalRateCreate,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("pricing", "create"))
):
    """Create a new seasonal rate"""
    service = PricingService(db, cache)
    return await service.create_seasonal_rate(rate_data, current_user['id'] if current_user else None)

@router.put("/seasonal-rates/{rate_id}", response_model=SeasonalRate)
async def update_seasonal_rate(
    rate_id: UUID,
    rate_data: SeasonalRateUpdate,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("pricing", "update"))
):
    """Update a seasonal rate"""
    service = PricingService(db, cache)
    return await service.update_seasonal_rate(rate_id, rate_data)

@router.delete("/seasonal-rates/{rate_id}")
async def delete_seasonal_rate(
    rate_id: UUID,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("pricing", "delete"))
):
    """Delete a seasonal rate"""
    service = PricingService(db, cache)
    await service.delete_seasonal_rate(rate_id)
    return {"message": "Seasonal rate deleted successfully"}

# Pricing Rules Endpoints
@router.get("/rules", response_model=PricingRuleListResponse)
async def get_pricing_rules(
    scope: Optional[str] = None,
    room_type_id: Optional[UUID] = None,
    room_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_supabase),
    cache = Depends(get_cache)
):
    """Get all pricing rules with optional filters"""
    service = PricingService(db, cache)
    return await service.get_pricing_rules(
        scope=scope,
        room_type_id=room_type_id,
        room_id=room_id,
        is_active=is_active,
        page=page,
        limit=limit
    )

@router.get("/rules/{rule_id}", response_model=PricingRule)
async def get_pricing_rule(
    rule_id: UUID,
    db = Depends(get_supabase),
    cache = Depends(get_cache)
):
    """Get a specific pricing rule"""
    service = PricingService(db, cache)
    return await service.get_pricing_rule(rule_id)

@router.post("/rules", response_model=PricingRule)
async def create_pricing_rule(
    rule_data: PricingRuleCreate,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("pricing", "create"))
):
    """Create a new pricing rule"""
    service = PricingService(db, cache)
    return await service.create_pricing_rule(rule_data, current_user['id'] if current_user else None)

@router.put("/rules/{rule_id}", response_model=PricingRule)
async def update_pricing_rule(
    rule_id: UUID,
    rule_data: PricingRuleUpdate,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("pricing", "update"))
):
    """Update a pricing rule"""
    service = PricingService(db, cache)
    return await service.update_pricing_rule(rule_id, rule_data)

@router.delete("/rules/{rule_id}")
async def delete_pricing_rule(
    rule_id: UUID,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("pricing", "delete"))
):
    """Delete a pricing rule"""
    service = PricingService(db, cache)
    await service.delete_pricing_rule(rule_id)
    return {"message": "Pricing rule deleted successfully"}

# Amenities Endpoints
@router.get("/amenities", response_model=AmenityListResponse)
async def get_amenities(
    category: Optional[str] = None,
    is_premium: Optional[bool] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_supabase),
    cache = Depends(get_cache)
):
    """Get all amenities with optional filters"""
    service = PricingService(db, cache)
    return await service.get_amenities(
        category=category,
        is_premium=is_premium,
        is_active=is_active,
        page=page,
        limit=limit
    )

@router.get("/amenities/{amenity_id}", response_model=Amenity)
async def get_amenity(
    amenity_id: UUID,
    db = Depends(get_supabase),
    cache = Depends(get_cache)
):
    """Get a specific amenity"""
    service = PricingService(db, cache)
    return await service.get_amenity(amenity_id)

@router.post("/amenities", response_model=Amenity)
async def create_amenity(
    amenity_data: AmenityCreate,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("amenities", "create"))
):
    """Create a new amenity"""
    service = PricingService(db, cache)
    return await service.create_amenity(amenity_data)

@router.put("/amenities/{amenity_id}", response_model=Amenity)
async def update_amenity(
    amenity_id: UUID,
    amenity_data: AmenityUpdate,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("amenities", "update"))
):
    """Update an amenity"""
    service = PricingService(db, cache)
    return await service.update_amenity(amenity_id, amenity_data)

@router.delete("/amenities/{amenity_id}")
async def delete_amenity(
    amenity_id: UUID,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("amenities", "delete"))
):
    """Delete an amenity"""
    service = PricingService(db, cache)
    await service.delete_amenity(amenity_id)
    return {"message": "Amenity deleted successfully"}

# Room Type Amenities
@router.post("/room-types/{room_type_id}/amenities")
async def assign_amenities_to_room_type(
    room_type_id: UUID,
    amenity_ids: List[UUID],
    is_standard: bool = True,
    is_paid: bool = False,
    charge_amount: Optional[float] = None,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("rooms", "update"))
):
    """Assign amenities to a room type"""
    service = PricingService(db, cache)
    return await service.assign_amenities_to_room_type(
        room_type_id=room_type_id,
        amenity_ids=amenity_ids,
        is_standard=is_standard,
        is_paid=is_paid,
        charge_amount=charge_amount
    )

@router.get("/room-types/{room_type_id}/amenities")
async def get_room_type_amenities(
    room_type_id: UUID,
    db = Depends(get_supabase),
    cache = Depends(get_cache)
):
    """Get amenities for a room type"""
    service = PricingService(db, cache)
    return await service.get_room_type_amenities(room_type_id)

@router.delete("/room-types/{room_type_id}/amenities/{amenity_id}")
async def remove_amenity_from_room_type(
    room_type_id: UUID,
    amenity_id: UUID,
    db = Depends(get_supabase),
    cache = Depends(get_cache),
    current_user: dict = Depends(require_permission("rooms", "update"))
):
    """Remove an amenity from a room type"""
    service = PricingService(db, cache)
    await service.remove_amenity_from_room_type(room_type_id, amenity_id)
    return {"message": "Amenity removed from room type successfully"}