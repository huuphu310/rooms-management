from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime
from supabase import Client
from app.core.redis_client import CacheService
from app.schemas.pricing import (
    SeasonalRateCreate,
    SeasonalRateUpdate,
    SeasonalRate,
    PricingRuleCreate,
    PricingRuleUpdate,
    PricingRule,
    AmenityCreate,
    AmenityUpdate,
    Amenity
)
from app.core.exceptions import NotFoundException, BadRequestException
import logging

logger = logging.getLogger(__name__)

class PricingService:
    def __init__(self, db: Client, cache: CacheService = None):
        self.db = db
        self.cache = cache

    # Seasonal Rates
    async def get_seasonal_rates(
        self,
        room_type_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get seasonal rates with filters"""
        try:
            query = self.db.table("seasonal_rates").select("*")
            
            if room_type_id:
                query = query.eq("room_type_id", str(room_type_id))
            if is_active is not None:
                query = query.eq("is_active", is_active)
            if start_date:
                query = query.gte("end_date", start_date.isoformat())
            if end_date:
                query = query.lte("start_date", end_date.isoformat())
            
            # Get total count
            count_response = query.execute()
            total = len(count_response.data) if count_response.data else 0
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.limit(limit).offset(offset)
            query = query.order("priority", desc=True).order("start_date")
            
            response = query.execute()
            
            rates = [SeasonalRate(**rate) for rate in response.data]
            
            return {
                "data": rates,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit
                }
            }
        except Exception as e:
            logger.error(f"Error getting seasonal rates: {str(e)}")
            raise

    async def get_seasonal_rate(self, rate_id: UUID) -> SeasonalRate:
        """Get a specific seasonal rate"""
        try:
            response = self.db.table("seasonal_rates").select("*").eq("id", str(rate_id)).single().execute()
            if not response.data:
                raise NotFoundException(f"Seasonal rate {rate_id} not found")
            return SeasonalRate(**response.data)
        except Exception as e:
            logger.error(f"Error getting seasonal rate: {str(e)}")
            raise

    async def create_seasonal_rate(self, rate_data: SeasonalRateCreate, user_id: UUID) -> SeasonalRate:
        """Create a new seasonal rate"""
        try:
            from decimal import Decimal
            
            data = rate_data.model_dump()
            # Convert non-serializable types for JSON serialization
            if "room_type_id" in data and data["room_type_id"]:
                data["room_type_id"] = str(data["room_type_id"])
            if "start_date" in data and data["start_date"]:
                data["start_date"] = str(data["start_date"])
            if "end_date" in data and data["end_date"]:
                data["end_date"] = str(data["end_date"])
            # Convert Decimal fields to float
            if "rate_multiplier" in data and isinstance(data["rate_multiplier"], Decimal):
                data["rate_multiplier"] = float(data["rate_multiplier"])
            if "fixed_rate" in data and isinstance(data["fixed_rate"], Decimal):
                data["fixed_rate"] = float(data["fixed_rate"])
            if user_id:
                data["created_by"] = str(user_id)
            
            response = self.db.table("seasonal_rates").insert(data).execute()
            if not response.data:
                raise BadRequestException("Failed to create seasonal rate")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("seasonal_rates:*")
            
            return SeasonalRate(**response.data[0])
        except Exception as e:
            logger.error(f"Error creating seasonal rate: {str(e)}")
            raise

    async def update_seasonal_rate(self, rate_id: UUID, rate_data: SeasonalRateUpdate) -> SeasonalRate:
        """Update a seasonal rate"""
        try:
            data = rate_data.model_dump(exclude_unset=True)
            data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.db.table("seasonal_rates").update(data).eq("id", str(rate_id)).execute()
            if not response.data:
                raise NotFoundException(f"Seasonal rate {rate_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("seasonal_rates:*")
            
            return SeasonalRate(**response.data[0])
        except Exception as e:
            logger.error(f"Error updating seasonal rate: {str(e)}")
            raise

    async def delete_seasonal_rate(self, rate_id: UUID):
        """Delete a seasonal rate"""
        try:
            response = self.db.table("seasonal_rates").delete().eq("id", str(rate_id)).execute()
            if not response.data:
                raise NotFoundException(f"Seasonal rate {rate_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("seasonal_rates:*")
        except Exception as e:
            logger.error(f"Error deleting seasonal rate: {str(e)}")
            raise

    # Pricing Rules
    async def get_pricing_rules(
        self,
        scope: Optional[str] = None,
        room_type_id: Optional[UUID] = None,
        room_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get pricing rules with filters"""
        try:
            query = self.db.table("pricing_rules").select("*")
            
            if scope:
                query = query.eq("scope", scope)
            if room_type_id:
                query = query.eq("room_type_id", str(room_type_id))
            if room_id:
                query = query.eq("room_id", str(room_id))
            if is_active is not None:
                query = query.eq("is_active", is_active)
            
            # Get total count
            count_response = query.execute()
            total = len(count_response.data) if count_response.data else 0
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.limit(limit).offset(offset)
            query = query.order("priority", desc=True).order("created_at", desc=True)
            
            response = query.execute()
            
            rules = [PricingRule(**rule) for rule in response.data]
            
            return {
                "data": rules,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit
                }
            }
        except Exception as e:
            logger.error(f"Error getting pricing rules: {str(e)}")
            raise

    async def get_pricing_rule(self, rule_id: UUID) -> PricingRule:
        """Get a specific pricing rule"""
        try:
            response = self.db.table("pricing_rules").select("*").eq("id", str(rule_id)).single().execute()
            if not response.data:
                raise NotFoundException(f"Pricing rule {rule_id} not found")
            return PricingRule(**response.data)
        except Exception as e:
            logger.error(f"Error getting pricing rule: {str(e)}")
            raise

    async def create_pricing_rule(self, rule_data: PricingRuleCreate, user_id: UUID) -> PricingRule:
        """Create a new pricing rule"""
        try:
            data = rule_data.model_dump()
            # Convert UUIDs to strings for JSON serialization
            if "room_type_id" in data and data["room_type_id"]:
                data["room_type_id"] = str(data["room_type_id"])
            if "room_id" in data and data["room_id"]:
                data["room_id"] = str(data["room_id"])
            if user_id:
                data["created_by"] = str(user_id)
            
            response = self.db.table("pricing_rules").insert(data).execute()
            if not response.data:
                raise BadRequestException("Failed to create pricing rule")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("pricing_rules:*")
            
            return PricingRule(**response.data[0])
        except Exception as e:
            logger.error(f"Error creating pricing rule: {str(e)}")
            raise

    async def update_pricing_rule(self, rule_id: UUID, rule_data: PricingRuleUpdate) -> PricingRule:
        """Update a pricing rule"""
        try:
            data = rule_data.model_dump(exclude_unset=True)
            data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.db.table("pricing_rules").update(data).eq("id", str(rule_id)).execute()
            if not response.data:
                raise NotFoundException(f"Pricing rule {rule_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("pricing_rules:*")
            
            return PricingRule(**response.data[0])
        except Exception as e:
            logger.error(f"Error updating pricing rule: {str(e)}")
            raise

    async def delete_pricing_rule(self, rule_id: UUID):
        """Delete a pricing rule"""
        try:
            response = self.db.table("pricing_rules").delete().eq("id", str(rule_id)).execute()
            if not response.data:
                raise NotFoundException(f"Pricing rule {rule_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("pricing_rules:*")
        except Exception as e:
            logger.error(f"Error deleting pricing rule: {str(e)}")
            raise

    # Amenities
    async def get_amenities(
        self,
        category: Optional[str] = None,
        is_premium: Optional[bool] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get amenities with filters"""
        try:
            query = self.db.table("amenities").select("*")
            
            if category:
                query = query.eq("category", category)
            if is_premium is not None:
                query = query.eq("is_premium", is_premium)
            if is_active is not None:
                query = query.eq("is_active", is_active)
            
            # Get total count
            count_response = query.execute()
            total = len(count_response.data) if count_response.data else 0
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.limit(limit).offset(offset)
            query = query.order("display_order").order("name")
            
            response = query.execute()
            
            amenities = [Amenity(**amenity) for amenity in response.data]
            
            return {
                "data": amenities,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit
                }
            }
        except Exception as e:
            logger.error(f"Error getting amenities: {str(e)}")
            raise

    async def get_amenity(self, amenity_id: UUID) -> Amenity:
        """Get a specific amenity"""
        try:
            response = self.db.table("amenities").select("*").eq("id", str(amenity_id)).single().execute()
            if not response.data:
                raise NotFoundException(f"Amenity {amenity_id} not found")
            return Amenity(**response.data)
        except Exception as e:
            logger.error(f"Error getting amenity: {str(e)}")
            raise

    async def create_amenity(self, amenity_data: AmenityCreate) -> Amenity:
        """Create a new amenity"""
        try:
            data = amenity_data.model_dump()
            
            response = self.db.table("amenities").insert(data).execute()
            if not response.data:
                raise BadRequestException("Failed to create amenity")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("amenities:*")
            
            return Amenity(**response.data[0])
        except Exception as e:
            logger.error(f"Error creating amenity: {str(e)}")
            raise

    async def update_amenity(self, amenity_id: UUID, amenity_data: AmenityUpdate) -> Amenity:
        """Update an amenity"""
        try:
            data = amenity_data.model_dump(exclude_unset=True)
            data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.db.table("amenities").update(data).eq("id", str(amenity_id)).execute()
            if not response.data:
                raise NotFoundException(f"Amenity {amenity_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("amenities:*")
            
            return Amenity(**response.data[0])
        except Exception as e:
            logger.error(f"Error updating amenity: {str(e)}")
            raise

    async def delete_amenity(self, amenity_id: UUID):
        """Delete an amenity"""
        try:
            response = self.db.table("amenities").delete().eq("id", str(amenity_id)).execute()
            if not response.data:
                raise NotFoundException(f"Amenity {amenity_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("amenities:*")
        except Exception as e:
            logger.error(f"Error deleting amenity: {str(e)}")
            raise

    # Room Type Amenities
    async def assign_amenities_to_room_type(
        self,
        room_type_id: UUID,
        amenity_ids: List[UUID],
        is_standard: bool = True,
        is_paid: bool = False,
        charge_amount: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Assign amenities to a room type"""
        try:
            # First, remove existing amenities for this room type
            self.db.table("room_type_amenities").delete().eq("room_type_id", str(room_type_id)).execute()
            
            # Then, add new amenities
            data = []
            for amenity_id in amenity_ids:
                data.append({
                    "room_type_id": str(room_type_id),
                    "amenity_id": str(amenity_id),
                    "is_standard": is_standard,
                    "is_paid": is_paid,
                    "charge_amount": charge_amount
                })
            
            response = self.db.table("room_type_amenities").insert(data).execute()
            if not response.data:
                raise BadRequestException("Failed to assign amenities")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern(f"room_type_amenities:{room_type_id}:*")
            
            return response.data
        except Exception as e:
            logger.error(f"Error assigning amenities to room type: {str(e)}")
            raise

    async def get_room_type_amenities(self, room_type_id: UUID) -> List[Dict[str, Any]]:
        """Get amenities for a room type"""
        try:
            response = self.db.table("room_type_amenities").select(
                "*, amenities(*)"
            ).eq("room_type_id", str(room_type_id)).execute()
            
            return response.data
        except Exception as e:
            logger.error(f"Error getting room type amenities: {str(e)}")
            raise

    async def remove_amenity_from_room_type(self, room_type_id: UUID, amenity_id: UUID):
        """Remove an amenity from a room type"""
        try:
            response = self.db.table("room_type_amenities").delete().eq(
                "room_type_id", str(room_type_id)
            ).eq("amenity_id", str(amenity_id)).execute()
            
            if not response.data:
                raise NotFoundException("Room type amenity association not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern(f"room_type_amenities:{room_type_id}:*")
        except Exception as e:
            logger.error(f"Error removing amenity from room type: {str(e)}")
            raise