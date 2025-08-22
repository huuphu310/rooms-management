"""Enhanced Customer Service based on documentation"""
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
import uuid
import logging
from decimal import Decimal
import re
from collections import defaultdict

from supabase import Client
from app.core.redis_client import CacheService
from app.schemas.customer_enhanced import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerSearchParams,
    CustomerStatistics,
    DuplicateCheckResponse,
    CustomerMergeRequest,
    CustomerType,
    VIPStatus,
    CustomerStatus,
    CustomerSource
)
from app.core.exceptions import (
    NotFoundException, 
    BadRequestException, 
    ConflictException
)

logger = logging.getLogger(__name__)


class CustomerServiceEnhanced:
    def __init__(self, db: Client, cache: CacheService = None):
        self.db = db
        self.cache = cache
    
    def generate_customer_code(self) -> str:
        """Generate unique customer code in format C20240001"""
        year = datetime.now().year
        
        # Get the last customer code for this year
        response = self.db.table("customers").select("customer_code").like(
            "customer_code", f"C{year}%"
        ).order("customer_code", desc=True).limit(1).execute()
        
        if response.data:
            last_code = response.data[0]["customer_code"]
            last_number = int(last_code[-4:])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"C{year}{new_number:04d}"
    
    def calculate_profile_completeness(self, customer_data: dict) -> int:
        """Calculate customer profile completeness percentage"""
        required_fields = ['full_name', 'email', 'phone']
        important_fields = [
            'date_of_birth', 'nationality', 'id_type', 'id_number',
            'address', 'emergency_contact', 'preferences'
        ]
        optional_fields = [
            'company_name', 'languages_spoken', 'alternative_email',
            'alternative_phone', 'whatsapp_number'
        ]
        
        score = 0
        total_weight = 100
        
        # Required fields (60% weight)
        for field in required_fields:
            if customer_data.get(field):
                score += 20
        
        # Important fields (30% weight)
        for field in important_fields:
            if customer_data.get(field):
                score += 30 / len(important_fields)
        
        # Optional fields (10% weight)
        for field in optional_fields:
            if customer_data.get(field):
                score += 10 / len(optional_fields)
        
        return min(int(score), 100)
    
    def calculate_vip_status(self, statistics: CustomerStatistics) -> VIPStatus:
        """Calculate VIP status based on customer statistics"""
        # Define thresholds
        thresholds = {
            VIPStatus.DIAMOND: {
                'total_stays': 50,
                'lifetime_value': 50000000,  # 50M VND
                'loyalty_points': 10000
            },
            VIPStatus.PLATINUM: {
                'total_stays': 30,
                'lifetime_value': 30000000,  # 30M VND
                'loyalty_points': 5000
            },
            VIPStatus.GOLD: {
                'total_stays': 15,
                'lifetime_value': 15000000,  # 15M VND
                'loyalty_points': 2500
            },
            VIPStatus.SILVER: {
                'total_stays': 5,
                'lifetime_value': 5000000,  # 5M VND
                'loyalty_points': 1000
            }
        }
        
        # Check from highest to lowest tier
        for status, requirements in thresholds.items():
            if (statistics.total_stays >= requirements['total_stays'] or
                statistics.lifetime_value >= requirements['lifetime_value'] or
                statistics.loyalty_points >= requirements['loyalty_points']):
                return status
        
        return VIPStatus.NONE
    
    async def check_duplicates(
        self, 
        email: Optional[str] = None,
        phone: Optional[str] = None,
        id_number: Optional[str] = None
    ) -> DuplicateCheckResponse:
        """Check for duplicate customers"""
        duplicates = []
        
        if email:
            response = self.db.table("customers").select("*").or_(
                f"email.eq.{email},alternative_email.eq.{email}"
            ).execute()
            duplicates.extend(response.data or [])
        
        if phone:
            # Normalize phone number
            normalized_phone = re.sub(r'[^\d+]', '', phone)
            response = self.db.table("customers").select("*").or_(
                f"phone.ilike.%{normalized_phone[-9:]}%,alternative_phone.ilike.%{normalized_phone[-9:]}%,whatsapp_number.ilike.%{normalized_phone[-9:]}%"
            ).execute()
            duplicates.extend(response.data or [])
        
        if id_number:
            response = self.db.table("customers").select("*").or_(
                f"id_number.eq.{id_number},secondary_id_number.eq.{id_number}"
            ).execute()
            duplicates.extend(response.data or [])
        
        # Remove duplicates from list
        unique_duplicates = {d['id']: d for d in duplicates}.values()
        
        # Debug logging
        logger.error(f"Found {len(unique_duplicates)} unique duplicates")
        for i, dup in enumerate(unique_duplicates):
            logger.error(f"Duplicate {i}: {type(dup)} - {dup}")
        
        if unique_duplicates:
            # Calculate similarity scores
            similarity_scores = {}
            for dup in unique_duplicates:
                score = 0
                if email and dup.get('email') == email:
                    score += 40
                if phone and normalized_phone[-9:] in (dup.get('phone', '') or ''):
                    score += 30
                if id_number and dup.get('id_number') == id_number:
                    score += 30
                similarity_scores[dup['id']] = score
            
            # Determine suggested action
            if len(unique_duplicates) == 1 and max(similarity_scores.values()) >= 70:
                suggested_action = 'update_existing'
            elif max(similarity_scores.values()) >= 50:
                suggested_action = 'merge'
            else:
                suggested_action = 'create_new'
            
            # Convert database records to CustomerResponse objects
            duplicate_customers = []
            for d in unique_duplicates:
                try:
                    # Add missing fields with defaults to match schema
                    customer_data = d.copy()
                    
                    # Ensure required fields exist
                    if not customer_data.get('customer_code'):
                        customer_data['customer_code'] = f"CUST{customer_data.get('id', '')[:8]}"
                    
                    # Handle datetime fields
                    for field in ['created_at', 'updated_at']:
                        if field in customer_data and isinstance(customer_data[field], str):
                            try:
                                customer_data[field] = datetime.fromisoformat(customer_data[field])
                            except (ValueError, TypeError):
                                customer_data[field] = datetime.now()
                        elif field not in customer_data:
                            customer_data[field] = datetime.now()
                    
                    # Ensure required string fields exist
                    if not customer_data.get('full_name'):
                        customer_data['full_name'] = 'Unknown Customer'
                    
                    # Set default values for optional fields that might be missing
                    customer_data.setdefault('language_preference', 'en')
                    customer_data.setdefault('vip_level', 0)
                    customer_data.setdefault('is_active', True)
                    customer_data.setdefault('languages_spoken', [])
                    customer_data.setdefault('tags', [])
                    customer_data.setdefault('is_blacklisted', False)
                    customer_data.setdefault('marketing_consent', False)
                    customer_data.setdefault('privacy_preferences', {
                        'email_marketing': False,
                        'sms_marketing': False,
                        'phone_marketing': False,
                        'data_sharing': False
                    })
                    
                    duplicate_customers.append(CustomerResponse(**customer_data))
                    
                except Exception as e:
                    logger.error(f"Error creating CustomerResponse for duplicate: {e}")
                    # Skip this duplicate if it can't be processed
                    continue
            
            return DuplicateCheckResponse(
                has_duplicates=len(duplicate_customers) > 0,
                duplicates=duplicate_customers,
                similarity_scores=similarity_scores,
                suggested_action=suggested_action
            )
        
        return DuplicateCheckResponse(
            has_duplicates=False,
            suggested_action='create_new'
        )
    
    async def get_customer_statistics(self, customer_id: UUID) -> CustomerStatistics:
        """Calculate customer statistics from bookings and transactions"""
        # Get all bookings for this customer
        bookings_response = self.db.table("bookings").select("*").eq(
            "customer_id", str(customer_id)
        ).execute()
        
        bookings = bookings_response.data or []
        
        if not bookings:
            return CustomerStatistics()
        
        # Calculate statistics
        total_stays = len([b for b in bookings if b['status'] in ['checked_out', 'completed']])
        total_nights = sum(b.get('total_nights', 0) for b in bookings)
        total_spent = sum(float(b.get('total_amount', 0)) for b in bookings if b['status'] != 'cancelled')
        
        completed_bookings = [b for b in bookings if b['status'] in ['checked_out', 'completed']]
        cancelled_bookings = [b for b in bookings if b['status'] == 'cancelled']
        no_show_bookings = [b for b in bookings if b['status'] == 'no_show']
        
        # Dates
        if completed_bookings:
            last_stay = max(b['check_out_date'] for b in completed_bookings)
            first_stay = min(b['check_in_date'] for b in completed_bookings)
            last_stay_date = datetime.fromisoformat(last_stay)
            first_stay_date = datetime.fromisoformat(first_stay)
            days_since_last = (datetime.now() - last_stay_date).days
        else:
            last_stay_date = None
            first_stay_date = None
            days_since_last = None
        
        # Calculate rates
        total_bookings = len(bookings)
        cancellation_rate = len(cancelled_bookings) / total_bookings if total_bookings > 0 else 0
        no_show_rate = len(no_show_bookings) / total_bookings if total_bookings > 0 else 0
        
        # Average lead time
        lead_times = []
        for booking in bookings:
            if booking.get('created_at') and booking.get('check_in_date'):
                created = datetime.fromisoformat(booking['created_at'])
                check_in = datetime.fromisoformat(booking['check_in_date'])
                lead_times.append((check_in - created).days)
        
        average_lead_time = sum(lead_times) / len(lead_times) if lead_times else 0
        
        # Favorite room type
        room_types = defaultdict(int)
        for booking in completed_bookings:
            if booking.get('room_type_id'):
                room_types[booking['room_type_id']] += 1
        
        favorite_room_type = max(room_types, key=room_types.get) if room_types else None
        
        # Booking frequency (per year)
        if first_stay_date and total_stays > 0:
            years = (datetime.now() - first_stay_date).days / 365
            booking_frequency = total_stays / years if years > 0 else total_stays
        else:
            booking_frequency = 0
        
        # Get loyalty points from customer record
        customer_response = self.db.table("customers").select("loyalty_points").eq(
            "id", str(customer_id)
        ).single().execute()
        
        loyalty_points = customer_response.data.get('loyalty_points', 0) if customer_response.data else 0
        
        return CustomerStatistics(
            total_stays=total_stays,
            total_nights=total_nights,
            total_spent=total_spent,
            average_spend_per_stay=total_spent / total_stays if total_stays > 0 else 0,
            last_stay_date=last_stay_date,
            first_stay_date=first_stay_date,
            days_since_last_stay=days_since_last,
            lifetime_value=total_spent,
            booking_frequency=booking_frequency,
            cancellation_rate=cancellation_rate * 100,
            no_show_rate=no_show_rate * 100,
            average_lead_time=int(average_lead_time),
            favorite_room_type=favorite_room_type,
            loyalty_points=loyalty_points
        )
    
    async def create_customer(
        self, 
        customer_data: CustomerCreate,
        check_duplicates: bool = True
    ) -> CustomerResponse:
        """Create a new customer with duplicate checking"""
        try:
            # Check for duplicates if requested
            if check_duplicates:
                duplicate_check = await self.check_duplicates(
                    email=customer_data.email,
                    phone=customer_data.phone,
                    id_number=customer_data.id_number
                )
                
                if duplicate_check.has_duplicates:
                    if duplicate_check.suggested_action == 'update_existing':
                        # Update existing customer instead
                        existing_id = duplicate_check.duplicates[0].id
                        return await self.update_customer(
                            existing_id,
                            CustomerUpdate(**customer_data.dict(exclude_unset=True))
                        )
                    elif duplicate_check.suggested_action == 'merge':
                        raise ConflictException(
                            f"Similar customer profiles found. Consider merging.",
                            details=duplicate_check.dict()
                        )
            
            # Generate customer code
            customer_code = self.generate_customer_code()
            
            # Prepare data for insertion
            customer_dict = customer_data.dict(exclude_unset=True)
            
            # Handle nested objects
            if 'address' in customer_dict and customer_dict['address']:
                # Flatten address fields
                address = customer_dict.pop('address')
                customer_dict.update({
                    'address_line1': address.get('line1'),
                    'address_line2': address.get('line2'),
                    'city': address.get('city'),
                    'state_province': address.get('state_province'),
                    'postal_code': address.get('postal_code'),
                    'country': address.get('country')
                })
            
            if 'emergency_contact' in customer_dict and customer_dict['emergency_contact']:
                # Flatten emergency contact
                emergency = customer_dict.pop('emergency_contact')
                customer_dict.update({
                    'emergency_contact_name': emergency.get('name'),
                    'emergency_contact_phone': emergency.get('phone'),
                    'emergency_contact_relationship': emergency.get('relationship')
                })
            
            # Convert enums to strings and handle field mapping
            for field in ['customer_type', 'customer_source', 'gender', 'id_type', 'title']:
                if field in customer_dict and customer_dict[field]:
                    customer_dict[field] = str(customer_dict[field])
            
            # Handle vip_level (not vip_status in database)
            if 'vip_status' in customer_dict:
                vip_status = customer_dict.pop('vip_status')
                # Convert VIP status enum to level integer
                vip_level_mapping = {
                    'none': 0, 'silver': 2, 'gold': 3, 'platinum': 4, 'diamond': 5
                }
                customer_dict['vip_level'] = vip_level_mapping.get(str(vip_status).lower(), 0)
            
            # Handle preferred_language vs language_preference
            if 'preferred_language' in customer_dict:
                customer_dict['language_preference'] = customer_dict.pop('preferred_language')
            
            # Add metadata
            customer_dict['customer_code'] = customer_code
            customer_dict['profile_completeness'] = self.calculate_profile_completeness(customer_dict)
            customer_dict['acquisition_date'] = date.today().isoformat()
            
            # Create customer
            response = self.db.table("customers").insert(customer_dict).execute()
            
            if not response.data:
                raise BadRequestException("Failed to create customer")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("customers:*")
            
            # Get statistics
            customer_id = response.data[0]['id']
            statistics = await self.get_customer_statistics(UUID(customer_id))
            
            # Update VIP status based on statistics
            vip_status = self.calculate_vip_status(statistics)
            if vip_status != VIPStatus.NONE:
                self.db.table("customers").update({
                    'vip_status': vip_status.value
                }).eq("id", customer_id).execute()
                response.data[0]['vip_status'] = vip_status.value
            
            # Return with statistics
            result = CustomerResponse(**response.data[0])
            result.statistics = statistics
            
            return result
            
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            raise
    
    async def update_customer(
        self,
        customer_id: UUID,
        customer_data: CustomerUpdate
    ) -> CustomerResponse:
        """Update customer information"""
        try:
            # Check if customer exists
            existing = self.db.table("customers").select("*").eq(
                "id", str(customer_id)
            ).single().execute()
            
            if not existing.data:
                raise NotFoundException(f"Customer {customer_id} not found")
            
            # Prepare update data
            update_dict = customer_data.dict(exclude_unset=True)
            
            # Handle nested objects
            if 'address' in update_dict and update_dict['address']:
                address = update_dict.pop('address')
                update_dict.update({
                    'address_line1': address.get('line1'),
                    'address_line2': address.get('line2'),
                    'city': address.get('city'),
                    'state_province': address.get('state_province'),
                    'postal_code': address.get('postal_code'),
                    'country': address.get('country')
                })
            
            if 'emergency_contact' in update_dict and update_dict['emergency_contact']:
                emergency = update_dict.pop('emergency_contact')
                update_dict.update({
                    'emergency_contact_name': emergency.get('name'),
                    'emergency_contact_phone': emergency.get('phone'),
                    'emergency_contact_relationship': emergency.get('relationship')
                })
            
            # Convert enums to strings
            for field in ['customer_type', 'vip_status', 'status', 'customer_source', 'gender', 'id_type', 'title']:
                if field in update_dict and update_dict[field]:
                    update_dict[field] = str(update_dict[field])
            
            # Recalculate profile completeness
            merged_data = {**existing.data, **update_dict}
            update_dict['profile_completeness'] = self.calculate_profile_completeness(merged_data)
            
            # Update customer
            response = self.db.table("customers").update(update_dict).eq(
                "id", str(customer_id)
            ).execute()
            
            if not response.data:
                raise BadRequestException("Failed to update customer")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern(f"customers:{customer_id}:*")
                await self.cache.delete_pattern("customers:list:*")
            
            # Get statistics
            statistics = await self.get_customer_statistics(customer_id)
            
            # Update VIP status based on statistics
            vip_status = self.calculate_vip_status(statistics)
            if vip_status != response.data[0].get('vip_status', VIPStatus.NONE):
                self.db.table("customers").update({
                    'vip_status': vip_status.value
                }).eq("id", str(customer_id)).execute()
                response.data[0]['vip_status'] = vip_status.value
            
            result = CustomerResponse(**response.data[0])
            result.statistics = statistics
            
            return result
            
        except Exception as e:
            logger.error(f"Error updating customer: {str(e)}")
            raise
    
    async def get_customer(self, customer_id: UUID) -> CustomerResponse:
        """Get customer by ID with statistics"""
        try:
            # Try cache first
            if self.cache:
                cached = await self.cache.get(f"customers:{customer_id}")
                if cached:
                    return CustomerResponse(**cached)
            
            # Get from database
            response = self.db.table("customers").select("*").eq(
                "id", str(customer_id)
            ).single().execute()
            
            if not response.data:
                raise NotFoundException(f"Customer {customer_id} not found")
            
            # Get statistics
            statistics = await self.get_customer_statistics(customer_id)
            
            result = CustomerResponse(**response.data)
            result.statistics = statistics
            
            # Cache result
            if self.cache:
                await self.cache.set(
                    f"customers:{customer_id}",
                    result.dict(),
                    expire=3600  # 1 hour
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting customer: {str(e)}")
            raise
    
    async def search_customers(
        self,
        params: CustomerSearchParams
    ) -> CustomerListResponse:
        """Search customers with advanced filters"""
        try:
            query = self.db.table("customers").select("*")
            
            # Apply filters
            if params.search:
                search_term = f"%{params.search}%"
                query = query.or_(
                    f"full_name.ilike.{search_term},"
                    f"email.ilike.{search_term},"
                    f"phone.ilike.{search_term},"
                    f"company_name.ilike.{search_term},"
                    f"customer_code.ilike.{search_term}"
                )
            
            if params.customer_type:
                query = query.eq("customer_type", params.customer_type.value)
            
            if params.vip_status:
                query = query.eq("vip_status", params.vip_status.value)
            
            if params.status:
                query = query.eq("status", params.status.value)
            
            if params.is_blacklisted is not None:
                query = query.eq("is_blacklisted", params.is_blacklisted)
            
            if params.country:
                query = query.eq("country", params.country)
            
            if params.city:
                query = query.eq("city", params.city)
            
            if params.created_after:
                query = query.gte("created_at", params.created_after.isoformat())
            
            if params.created_before:
                query = query.lte("created_at", params.created_before.isoformat())
            
            # Get total count
            count_response = query.execute()
            total = len(count_response.data) if count_response.data else 0
            
            # Apply pagination
            offset = (params.page - 1) * params.limit
            query = query.limit(params.limit).offset(offset)
            
            # Apply sorting
            query = query.order(params.sort_by, desc=(params.order == "desc"))
            
            # Execute query
            response = query.execute()
            
            # Build response
            customers = []
            for customer_data in response.data:
                customer = CustomerResponse(**customer_data)
                # Optionally get statistics for each customer (might be slow for large lists)
                if params.has_stayed is not None:
                    stats = await self.get_customer_statistics(customer.id)
                    customer.statistics = stats
                    if params.has_stayed and stats.total_stays == 0:
                        continue
                    elif not params.has_stayed and stats.total_stays > 0:
                        continue
                customers.append(customer)
            
            return CustomerListResponse(
                data=customers,
                pagination={
                    "page": params.page,
                    "limit": params.limit,
                    "total": total,
                    "total_pages": (total + params.limit - 1) // params.limit
                }
            )
            
        except Exception as e:
            logger.error(f"Error searching customers: {str(e)}")
            raise
    
    async def merge_customers(
        self,
        merge_request: CustomerMergeRequest
    ) -> CustomerResponse:
        """Merge multiple customer profiles into one"""
        try:
            # Get all customers to merge
            customers = []
            for customer_id in [merge_request.primary_customer_id] + merge_request.customer_ids_to_merge:
                response = self.db.table("customers").select("*").eq(
                    "id", str(customer_id)
                ).single().execute()
                if response.data:
                    customers.append(response.data)
            
            if len(customers) < 2:
                raise BadRequestException("Need at least 2 customers to merge")
            
            # Use primary customer as base
            primary = customers[0]
            
            # Merge data from other customers
            for customer in customers[1:]:
                for field, value in customer.items():
                    # Skip system fields
                    if field in ['id', 'customer_code', 'created_at', 'updated_at']:
                        continue
                    
                    # Use merge preferences if specified
                    if field in merge_request.merge_preferences:
                        source_id = merge_request.merge_preferences[field]
                        source_customer = next(
                            (c for c in customers if c['id'] == str(source_id)), 
                            None
                        )
                        if source_customer:
                            primary[field] = source_customer[field]
                    # Otherwise, keep non-null values
                    elif value and not primary.get(field):
                        primary[field] = value
            
            # Update bookings to point to primary customer
            for customer in customers[1:]:
                self.db.table("bookings").update({
                    "customer_id": str(merge_request.primary_customer_id)
                }).eq("customer_id", customer['id']).execute()
            
            # Delete merged customers
            for customer_id in merge_request.customer_ids_to_merge:
                self.db.table("customers").delete().eq(
                    "id", str(customer_id)
                ).execute()
            
            # Update primary customer
            response = self.db.table("customers").update(primary).eq(
                "id", str(merge_request.primary_customer_id)
            ).execute()
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("customers:*")
            
            # Get updated customer with statistics
            return await self.get_customer(merge_request.primary_customer_id)
            
        except Exception as e:
            logger.error(f"Error merging customers: {str(e)}")
            raise
    
    async def delete_customer(self, customer_id: UUID) -> bool:
        """Delete a customer (soft delete by setting status to inactive)"""
        try:
            # Check if customer has bookings
            bookings = self.db.table("bookings").select("id").eq(
                "customer_id", str(customer_id)
            ).execute()
            
            if bookings.data:
                # Soft delete - just mark as inactive
                response = self.db.table("customers").update({
                    "status": CustomerStatus.INACTIVE.value,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", str(customer_id)).execute()
            else:
                # Hard delete if no bookings
                response = self.db.table("customers").delete().eq(
                    "id", str(customer_id)
                ).execute()
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern(f"customers:{customer_id}:*")
                await self.cache.delete_pattern("customers:list:*")
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting customer: {str(e)}")
            raise