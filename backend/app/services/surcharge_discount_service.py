from typing import List, Optional, Dict, Any
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from supabase import Client
from app.core.exceptions import NotFoundException, BadRequestException
import logging

logger = logging.getLogger(__name__)

class SurchargeDiscountService:
    """Service for managing surcharge and discount policies"""
    
    def __init__(self, db: Client):
        self.db = db
    
    async def create_surcharge_policy(self, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new surcharge policy"""
        try:
            result = self.db.table("surcharge_policies").insert(policy_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating surcharge policy: {str(e)}")
            raise BadRequestException(f"Failed to create surcharge policy: {str(e)}")
    
    async def create_discount_policy(self, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new discount policy"""
        try:
            result = self.db.table("discount_policies").insert(policy_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating discount policy: {str(e)}")
            raise BadRequestException(f"Failed to create discount policy: {str(e)}")
    
    async def get_applicable_surcharges(
        self, 
        check_in_date: date,
        check_out_date: date,
        room_type_id: Optional[UUID] = None,
        occupancy: int = 1
    ) -> List[Dict[str, Any]]:
        """Get all applicable surcharge policies for a booking"""
        try:
            # Get all active surcharge policies
            policies_result = self.db.table("surcharge_policies").select("*").eq("is_active", True).execute()
            
            applicable = []
            for policy in policies_result.data:
                # Check date range
                if policy.get('date_from') and check_out_date < datetime.fromisoformat(policy['date_from']).date():
                    continue
                if policy.get('date_to') and check_in_date > datetime.fromisoformat(policy['date_to']).date():
                    continue
                
                # Check room type
                if policy.get('room_types') and room_type_id:
                    if str(room_type_id) not in policy['room_types']:
                        continue
                
                # Check occupancy
                if policy.get('min_occupancy') and occupancy < policy['min_occupancy']:
                    continue
                if policy.get('max_occupancy') and occupancy > policy['max_occupancy']:
                    continue
                
                # Check days of week for weekend surcharges
                if policy.get('days_of_week'):
                    # Calculate which days of the stay match
                    current = check_in_date
                    matches_day = False
                    while current < check_out_date:
                        if current.weekday() in policy['days_of_week']:
                            matches_day = True
                            break
                        current = date(current.year, current.month, current.day + 1)
                    
                    if not matches_day:
                        continue
                
                applicable.append(policy)
            
            # Sort by priority
            applicable.sort(key=lambda x: x.get('priority', 0), reverse=True)
            
            return applicable
            
        except Exception as e:
            logger.error(f"Error getting applicable surcharges: {str(e)}")
            return []
    
    async def get_applicable_discounts(
        self,
        check_in_date: date,
        check_out_date: date,
        room_type_id: Optional[UUID] = None,
        nights: int = 1,
        subtotal: Decimal = Decimal(0),
        promo_code: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all applicable discount policies for a booking"""
        try:
            # Build query
            query = self.db.table("discount_policies").select("*").eq("is_active", True)
            
            # Filter by promo code if provided
            if promo_code:
                query = query.eq("code", promo_code)
            
            policies_result = query.execute()
            
            applicable = []
            for policy in policies_result.data:
                # Check validity dates
                if policy.get('valid_from') and check_out_date < datetime.fromisoformat(policy['valid_from']).date():
                    continue
                if policy.get('valid_to') and check_in_date > datetime.fromisoformat(policy['valid_to']).date():
                    continue
                
                # Check room type
                if policy.get('room_types') and room_type_id:
                    if str(room_type_id) not in policy['room_types']:
                        continue
                
                # Check nights
                if policy.get('min_nights') and nights < policy['min_nights']:
                    continue
                if policy.get('max_nights') and nights > policy['max_nights']:
                    continue
                
                # Check minimum amount
                if policy.get('min_amount') and subtotal < Decimal(str(policy['min_amount'])):
                    continue
                
                # Check usage limits
                if policy.get('max_uses'):
                    if policy.get('uses_count', 0) >= policy['max_uses']:
                        continue
                
                applicable.append(policy)
            
            # Sort by priority
            applicable.sort(key=lambda x: x.get('priority', 0), reverse=True)
            
            return applicable
            
        except Exception as e:
            logger.error(f"Error getting applicable discounts: {str(e)}")
            return []
    
    async def calculate_surcharge(
        self,
        policy: Dict[str, Any],
        base_amount: Decimal,
        nights: int = 1
    ) -> Decimal:
        """Calculate surcharge amount based on policy"""
        try:
            calculation_type = policy['calculation_type']
            value = Decimal(str(policy['value']))
            
            if calculation_type == 'percentage':
                return (base_amount * value) / Decimal(100)
            elif calculation_type == 'fixed':
                # Fixed amount per night or total
                if policy.get('surcharge_type') in ['seasonal', 'weekend', 'holiday']:
                    return value * nights  # Per night
                else:
                    return value  # One-time charge
            else:
                return Decimal(0)
                
        except Exception as e:
            logger.error(f"Error calculating surcharge: {str(e)}")
            return Decimal(0)
    
    async def calculate_discount(
        self,
        policy: Dict[str, Any],
        base_amount: Decimal
    ) -> Decimal:
        """Calculate discount amount based on policy"""
        try:
            calculation_type = policy['calculation_type']
            value = Decimal(str(policy['value']))
            
            if calculation_type == 'percentage':
                discount = (base_amount * value) / Decimal(100)
                # Apply max discount cap if specified
                if policy.get('max_discount'):
                    max_discount = Decimal(str(policy['max_discount']))
                    discount = min(discount, max_discount)
                return discount
            elif calculation_type == 'fixed':
                return min(value, base_amount)  # Can't discount more than the total
            else:
                return Decimal(0)
                
        except Exception as e:
            logger.error(f"Error calculating discount: {str(e)}")
            return Decimal(0)
    
    async def apply_surcharges_to_booking(
        self,
        folio_id: UUID,
        booking_data: Dict[str, Any],
        user_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        """Apply all applicable surcharges to a booking's folio"""
        try:
            from app.services.folio_service import FolioService
            folio_service = FolioService(self.db)
            
            check_in = datetime.fromisoformat(booking_data['check_in_date']).date()
            check_out = datetime.fromisoformat(booking_data['check_out_date']).date()
            nights = (check_out - check_in).days
            room_charges = Decimal(str(booking_data.get('room_charges', 0)))
            
            # Get applicable surcharges
            surcharges = await self.get_applicable_surcharges(
                check_in_date=check_in,
                check_out_date=check_out,
                room_type_id=UUID(booking_data['room_type_id']) if booking_data.get('room_type_id') else None,
                occupancy=booking_data.get('adults', 1)
            )
            
            posted_charges = []
            for surcharge in surcharges:
                amount = await self.calculate_surcharge(surcharge, room_charges, nights)
                
                if amount > 0:
                    # Post to folio
                    posting = await folio_service.post_charge(
                        folio_id=folio_id,
                        posting_type='surcharge',
                        description=surcharge['name'],
                        amount=amount,
                        surcharge_type=surcharge['surcharge_type'],
                        reference=str(surcharge['id']),
                        user_id=user_id
                    )
                    posted_charges.append(posting)
            
            return posted_charges
            
        except Exception as e:
            logger.error(f"Error applying surcharges: {str(e)}")
            return []
    
    async def apply_discount_to_booking(
        self,
        folio_id: UUID,
        booking_data: Dict[str, Any],
        promo_code: Optional[str] = None,
        user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Apply best applicable discount to a booking's folio"""
        try:
            from app.services.folio_service import FolioService
            folio_service = FolioService(self.db)
            
            check_in = datetime.fromisoformat(booking_data['check_in_date']).date()
            check_out = datetime.fromisoformat(booking_data['check_out_date']).date()
            nights = (check_out - check_in).days
            subtotal = Decimal(str(booking_data.get('room_charges', 0)))
            
            # Get applicable discounts
            discounts = await self.get_applicable_discounts(
                check_in_date=check_in,
                check_out_date=check_out,
                room_type_id=UUID(booking_data['room_type_id']) if booking_data.get('room_type_id') else None,
                nights=nights,
                subtotal=subtotal,
                promo_code=promo_code
            )
            
            if not discounts:
                return None
            
            # Apply the best discount (first in priority order)
            best_discount = discounts[0]
            amount = await self.calculate_discount(best_discount, subtotal)
            
            if amount > 0:
                # Increment usage count
                self.db.table("discount_policies").update({
                    'uses_count': best_discount.get('uses_count', 0) + 1
                }).eq("id", str(best_discount['id'])).execute()
                
                # Post to folio (negative amount for discount)
                posting = await folio_service.post_charge(
                    folio_id=folio_id,
                    posting_type='discount',
                    description=best_discount['name'],
                    amount=-amount,  # Negative for discount
                    discount_type=best_discount['discount_type'],
                    reference=str(best_discount['id']),
                    user_id=user_id
                )
                return posting
            
            return None
            
        except Exception as e:
            logger.error(f"Error applying discount: {str(e)}")
            return None
    
    async def update_surcharge_policy(
        self,
        policy_id: UUID,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a surcharge policy"""
        try:
            update_data['updated_at'] = datetime.now().isoformat()
            result = self.db.table("surcharge_policies").update(update_data).eq("id", str(policy_id)).execute()
            
            if not result.data:
                raise NotFoundException(f"Surcharge policy {policy_id} not found")
            
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Error updating surcharge policy: {str(e)}")
            raise
    
    async def update_discount_policy(
        self,
        policy_id: UUID,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a discount policy"""
        try:
            update_data['updated_at'] = datetime.now().isoformat()
            result = self.db.table("discount_policies").update(update_data).eq("id", str(policy_id)).execute()
            
            if not result.data:
                raise NotFoundException(f"Discount policy {policy_id} not found")
            
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Error updating discount policy: {str(e)}")
            raise
    
    async def delete_surcharge_policy(self, policy_id: UUID) -> bool:
        """Delete (deactivate) a surcharge policy"""
        try:
            result = self.db.table("surcharge_policies").update({
                'is_active': False,
                'updated_at': datetime.now().isoformat()
            }).eq("id", str(policy_id)).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Error deleting surcharge policy: {str(e)}")
            raise
    
    async def delete_discount_policy(self, policy_id: UUID) -> bool:
        """Delete (deactivate) a discount policy"""
        try:
            result = self.db.table("discount_policies").update({
                'is_active': False,
                'updated_at': datetime.now().isoformat()
            }).eq("id", str(policy_id)).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Error deleting discount policy: {str(e)}")
            raise