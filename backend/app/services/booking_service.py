from datetime import date, datetime, timedelta, time
from typing import Optional, List, Dict, Any
from decimal import Decimal
from uuid import UUID
import uuid
import logging
from supabase import Client
from app.core.redis_client import CacheService
from app.schemas.booking import (
    BookingCreate, 
    BookingUpdate, 
    Booking,
    CheckInRequest, 
    CheckOutRequest, 
    BookingCancellation,
    BookingAvailabilityRequest, 
    BookingAvailabilityResponse,
    RoomAvailability,
    BookingStatus,
    PaymentStatus,
    BookingPayment,
    BookingStatusUpdate,
    BookingConfirmation,
    BookingModification,
    BookingListResponse,
    BookingStatistics
)
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.services.pricing_service import PricingService
from app.services.folio_service import FolioService

logger = logging.getLogger(__name__)

class BookingService:
    def __init__(self, db: Client, cache: CacheService = None):
        self.db = db
        self.cache = cache
        self.pricing_service = PricingService(db, cache)

    def generate_booking_code(self) -> str:
        """Generate unique booking code in format BK20240001"""
        year = datetime.now().year
        
        # Get the last booking code for this year
        response = self.db.table("bookings").select("booking_code").like(
            "booking_code", f"BK{year}%"
        ).order("booking_code", desc=True).limit(1).execute()
        
        if response.data:
            last_code = response.data[0]["booking_code"]
            last_number = int(last_code[-4:])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"BK{year}{new_number:04d}"

    async def calculate_booking_totals(self, booking_data: dict) -> dict:
        """Calculate all booking totals including seasonal rates"""
        check_in = booking_data.get('check_in_date')
        check_out = booking_data.get('check_out_date')
        
        if isinstance(check_in, str):
            check_in = date.fromisoformat(check_in)
        if isinstance(check_out, str):
            check_out = date.fromisoformat(check_out)
        
        nights = (check_out - check_in).days
        room_rate = Decimal(str(booking_data.get('room_rate', 0)))
        
        # Check for seasonal rates
        seasonal_rates = await self.pricing_service.get_seasonal_rates(
            room_type_id=booking_data.get('room_type_id'),
            is_active=True,
            start_date=check_in,
            end_date=check_out
        )
        
        # Apply highest priority seasonal rate if found
        if seasonal_rates['data']:
            seasonal_rate = seasonal_rates['data'][0]  # Already sorted by priority
            if seasonal_rate.rate_multiplier:
                room_rate *= seasonal_rate.rate_multiplier
            elif seasonal_rate.fixed_rate:
                room_rate = seasonal_rate.fixed_rate
        
        # Calculate charges
        total_room_charge = room_rate * nights
        extra_person_charge = Decimal(str(booking_data.get('extra_person_charge', 0)))
        extra_bed_charge = Decimal(str(booking_data.get('extra_bed_charge', 0)))
        service_charges = Decimal(str(booking_data.get('service_charges', 0)))
        
        subtotal = total_room_charge + extra_person_charge + extra_bed_charge + service_charges
        
        # Calculate discount based on type
        discount_type = booking_data.get('discount_type', 'amount')
        discount_value = Decimal(str(booking_data.get('discount_value', 0)))
        
        if discount_type == 'percentage' and discount_value > 0:
            discount_amount = (subtotal * discount_value / 100).quantize(Decimal('0.01'))
        elif discount_type == 'amount':
            discount_amount = Decimal(str(booking_data.get('discount_amount', discount_value)))
        else:
            discount_amount = Decimal('0')
        
        # Calculate tax - use provided tax_percentage or default to 10%
        # If tax_percentage is explicitly 0, use 0
        if 'tax_percentage' in booking_data:
            tax_percentage = Decimal(str(booking_data['tax_percentage']))
        else:
            tax_percentage = Decimal('10')  # Default 10% VAT
            
        taxable_amount = subtotal - discount_amount
        tax_amount = (taxable_amount * tax_percentage / 100).quantize(Decimal('0.01'))
        
        total_amount = taxable_amount + tax_amount
        
        # Calculate deposit (30% by default or custom amount)
        if booking_data.get('deposit_required'):
            deposit_required = Decimal(str(booking_data['deposit_required']))
        else:
            deposit_required = (total_amount * Decimal('0.3')).quantize(Decimal('0.01'))
        
        return {
            'nights': nights,
            'room_rate': float(room_rate),
            'total_room_charge': float(total_room_charge),
            'subtotal': float(subtotal),
            'discount_amount': float(discount_amount),
            'tax_amount': float(tax_amount),
            'total_amount': float(total_amount),
            'deposit_required': float(deposit_required)
        }

    async def create_booking(self, booking_data: BookingCreate, user_id: Optional[UUID] = None) -> Booking:
        """Create a new booking with availability check"""
        try:
            # Check availability first
            availability = await self.check_availability(BookingAvailabilityRequest(
                check_in_date=booking_data.check_in_date,
                check_out_date=booking_data.check_out_date,
                room_type_id=booking_data.room_type_id,
                adults=booking_data.adults,
                children=booking_data.children
            ))
            
            if not availability.available:
                raise ConflictException("No rooms available for the selected dates")
            
            # Additional occupancy validation with clear error messages
            room_type_info = None
            for rt in availability.room_types:
                if str(rt.room_type_id) == str(booking_data.room_type_id):
                    room_type_info = rt
                    break
            
            if room_type_info:
                # Get room type details for occupancy limits
                room_type_response = self.db.table("room_types").select(
                    "name, standard_occupancy, max_occupancy"
                ).eq("id", str(booking_data.room_type_id)).execute()
                
                if room_type_response.data:
                    room_type_data = room_type_response.data[0]
                    total_guests = booking_data.adults + booking_data.children
                    max_occupancy = room_type_data['max_occupancy']
                    standard_occupancy = room_type_data['standard_occupancy']
                    room_name = room_type_data['name']
                    extra_persons = getattr(booking_data, 'extra_persons', 0) or 0
                    
                    # Check if the room can support extra persons (max > standard)
                    supports_extra_persons = max_occupancy > standard_occupancy
                    
                    if total_guests > max_occupancy:
                        extra_guests_needed = total_guests - max_occupancy
                        
                        if supports_extra_persons:
                            raise ConflictException(
                                f"{room_name} can accommodate maximum {max_occupancy} guests, but {total_guests} guests requested. "
                                f"Please reduce guest count by {extra_guests_needed} or ensure extra person arrangements are made."
                            )
                        else:
                            raise ConflictException(
                                f"{room_name} has a fixed capacity of {max_occupancy} guests and cannot accommodate extra persons. "
                                f"Current request is for {total_guests} guests. Please reduce guest count by {extra_guests_needed} "
                                f"or select a room type that supports more guests."
                            )
                    
                    # Warn if requesting extra persons when they've indicated extra_persons > 0
                    if total_guests > standard_occupancy and extra_persons > 0:
                        if total_guests <= max_occupancy:
                            logger.info(
                                f"Booking {booking_data.room_type_id} for {total_guests} guests with {extra_persons} extra persons specified. "
                                f"This is within the room's maximum capacity of {max_occupancy}."
                            )
                    
                    elif total_guests > standard_occupancy:
                        extra_guests = total_guests - standard_occupancy
                        # This is just a warning - booking can proceed but user should be aware
                        logger.info(
                            f"Booking {booking_data.room_type_id} for {total_guests} guests exceeds standard occupancy "
                            f"of {standard_occupancy}. {extra_guests} extra person charge(s) may apply."
                        )
            
            # Calculate totals - pass the full booking data including discount_type and discount_value
            booking_dict = booking_data.dict()
            
            # Ensure discount fields are included
            if not booking_dict.get('discount_type'):
                booking_dict['discount_type'] = getattr(booking_data, 'discount_type', 'amount')
            if not booking_dict.get('discount_value'):
                booking_dict['discount_value'] = getattr(booking_data, 'discount_value', 0)
            
            # Use the provided tax_percentage if available, otherwise default
            if hasattr(booking_data, 'tax_percentage') and booking_data.tax_percentage is not None:
                booking_dict['tax_percentage'] = booking_data.tax_percentage
            
            totals = await self.calculate_booking_totals(booking_dict)
            
            # Handle customer creation/lookup if guest info provided but no customer_id
            if not booking_data.customer_id and booking_data.guest_name:
                # Try to find existing customer by email or phone
                customer_id = None
                
                if booking_data.guest_email:
                    # Search for customer by email
                    customer_response = self.db.table("customers").select("*").eq("email", booking_data.guest_email).execute()
                    if customer_response.data and len(customer_response.data) > 0:
                        customer_id = customer_response.data[0]["id"]
                
                if not customer_id and booking_data.guest_phone:
                    # Search for customer by phone
                    customer_response = self.db.table("customers").select("*").eq("phone", booking_data.guest_phone).execute()
                    if customer_response.data and len(customer_response.data) > 0:
                        customer_id = customer_response.data[0]["id"]
                
                # If no existing customer found, create a new one
                if not customer_id:
                    customer_data = {
                        "full_name": booking_data.guest_name,
                        "email": booking_data.guest_email,
                        "phone": booking_data.guest_phone,
                        "country": booking_data.guest_country or "Vietnam"
                    }
                    customer_response = self.db.table("customers").insert(customer_data).execute()
                    if customer_response.data and len(customer_response.data) > 0:
                        customer_id = customer_response.data[0]["id"]
                        logger.info(f"Created new customer with ID: {customer_id}")
                
                # Set the customer_id in booking data
                if customer_id:
                    booking_data.customer_id = UUID(customer_id) if isinstance(customer_id, str) else customer_id
            
            # Store original data that we need for response but isn't in database
            original_guest_name = booking_data.guest_name
            original_room_type_id = str(booking_data.room_type_id)
            original_discount_type = booking_data.discount_type if hasattr(booking_data, 'discount_type') else 'amount'
            original_discount_value = booking_data.discount_value if hasattr(booking_data, 'discount_value') else 0
            original_purpose_of_visit = booking_data.purpose_of_visit if hasattr(booking_data, 'purpose_of_visit') else None
            
            # Calculate extra charges total
            extra_person_charge = float(booking_data.extra_person_charge) if booking_data.extra_person_charge else 0.0
            extra_bed_charge = float(booking_data.extra_bed_charge) if booking_data.extra_bed_charge else 0.0
            service_charges = float(booking_data.service_charges) if booking_data.service_charges else 0.0
            total_extra_charges = extra_person_charge + extra_bed_charge + service_charges
            
            # Get deposit_paid value
            deposit_paid = float(booking_data.deposit_paid) if hasattr(booking_data, 'deposit_paid') and booking_data.deposit_paid else 0.0
            
            # Prepare booking data by mapping to actual database fields
            booking_dict = {
                'booking_code': self.generate_booking_code(),
                'customer_id': str(booking_data.customer_id) if booking_data.customer_id else None,
                'room_id': str(booking_data.room_id) if booking_data.room_id else None,
                'room_type_id': original_room_type_id,  # Now saved directly to database column
                'check_in_date': str(booking_data.check_in_date),
                'check_out_date': str(booking_data.check_out_date),
                'check_in_time': str(booking_data.check_in_time),
                'check_out_time': str(booking_data.check_out_time),
                'adults': booking_data.adults,
                'children': booking_data.children,
                # 'total_nights' is a generated column - don't include it
                'room_rate': float(booking_data.room_rate) if booking_data.room_rate else totals['room_rate'],
                'total_room_charge': totals['total_room_charge'],
                'extra_charges': total_extra_charges,
                'discounts': float(totals.get('discount_amount', 0)),
                'taxes': float(totals.get('tax_amount', 0)),
                'total_amount': totals['total_amount'],
                'deposit_amount': float(booking_data.deposit_required) if booking_data.deposit_required else totals['deposit_required'],
                'paid_amount': deposit_paid,
                'status': BookingStatus.PENDING.value,
                'source': booking_data.source.value if hasattr(booking_data.source, 'value') else booking_data.source,
                'special_requests': booking_data.special_requests if booking_data.special_requests else None,
                'commission_rate': float(booking_data.commission_rate) if booking_data.commission_rate else 0.0
            }
            
            # Add internal notes (no longer need to store room_type_id here)
            if booking_data.internal_notes:
                booking_dict['internal_notes'] = booking_data.internal_notes
            
            if user_id:
                booking_dict['created_by'] = str(user_id)
            
            # Create booking with initial lifecycle status
            booking_dict['lifecycle_status'] = 'draft'
            response = self.db.table("bookings").insert(booking_dict).execute()
            
            if not response.data:
                raise BadRequestException("Failed to create booking")
            
            booking_id = response.data[0]['id']
            
            # Create folio for the booking
            folio_service = FolioService(self.db)
            folio = await folio_service.create_folio_for_booking(UUID(booking_id), user_id)
            
            # If deposit is paid, process it
            if deposit_paid > 0:
                await folio_service.process_deposit(
                    booking_id=UUID(booking_id),
                    amount=Decimal(str(deposit_paid)),
                    payment_method=booking_data.payment_method if hasattr(booking_data, 'payment_method') else 'cash',
                    user_id=user_id
                )
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("bookings:*")
                await self.cache.delete_pattern(f"availability:{booking_data.room_type_id}:*")
            
            # Add the guest name and room type ID to the response
            result_data = response.data[0]
            result_data['guest_name'] = original_guest_name
            result_data['room_type_id'] = original_room_type_id
            
            # Add other fields from the original booking data
            result_data['guest_email'] = booking_data.guest_email
            result_data['guest_phone'] = booking_data.guest_phone
            result_data['guest_country'] = booking_data.guest_country
            
            # Add the original pricing fields for the response
            result_data['extra_person_charge'] = extra_person_charge
            result_data['extra_bed_charge'] = extra_bed_charge
            result_data['service_charges'] = service_charges
            result_data['tax_percentage'] = booking_data.tax_percentage if hasattr(booking_data, 'tax_percentage') else 10
            result_data['discount_type'] = original_discount_type
            result_data['discount_value'] = original_discount_value
            result_data['discount_amount'] = totals.get('discount_amount', 0)
            result_data['discount_reason'] = booking_data.discount_reason if hasattr(booking_data, 'discount_reason') else None
            result_data['deposit_required'] = float(booking_data.deposit_required) if booking_data.deposit_required else totals['deposit_required']
            result_data['deposit_paid'] = deposit_paid
            result_data['purpose_of_visit'] = original_purpose_of_visit
            
            booking_data_final = self._add_calculated_fields(result_data)
            return Booking(**booking_data_final)
            
        except Exception as e:
            logger.error(f"Error creating booking: {str(e)}")
            raise

    def _add_calculated_fields(self, booking_data: dict) -> dict:
        """Add calculated fields to booking data and map database fields to schema fields"""
        # Map database fields to schema fields
        if 'guest_name' not in booking_data and booking_data.get('customer_id'):
            # Fetch customer information
            customer_response = self.db.table("customers").select("*").eq("id", booking_data['customer_id']).execute()
            if customer_response.data and len(customer_response.data) > 0:
                customer = customer_response.data[0]
                booking_data['guest_name'] = customer.get('full_name', 'Guest')
                booking_data['guest_email'] = customer.get('email')
                booking_data['guest_phone'] = customer.get('phone')
                booking_data['guest_country'] = customer.get('country')
            else:
                booking_data['guest_name'] = 'Guest'
        elif 'guest_name' not in booking_data:
            booking_data['guest_name'] = 'Guest'
        
        if 'room_type_id' not in booking_data:
            # Get room type ID from room if available
            # For now, use a placeholder - this should be fetched from room relation
            booking_data['room_type_id'] = booking_data.get('room', {}).get('room_type_id', str(uuid.uuid4()))
        
        # Calculate balance_due if not present
        if 'balance_due' not in booking_data:
            total_amount = Decimal(str(booking_data.get('total_amount', 0)))
            total_paid = Decimal(str(booking_data.get('total_paid', 0)))
            deposit_paid = Decimal(str(booking_data.get('deposit_paid', 0)))
            
            # If total_paid is 0 but deposit_paid exists, consider deposit as payment
            if total_paid == 0 and deposit_paid > 0:
                total_paid = deposit_paid
                booking_data['total_paid'] = float(total_paid)
            
            # Balance due is total minus what's been paid
            booking_data['balance_due'] = float(total_amount - total_paid)
        
        # Add calculated nights if not present (from generated column)
        if 'nights' not in booking_data and 'total_nights' in booking_data:
            booking_data['nights'] = booking_data['total_nights']
        
        # Calculate total guests if not present
        if 'total_guests' not in booking_data:
            adults = booking_data.get('adults', 1)
            children = booking_data.get('children', 0)
            booking_data['total_guests'] = adults + children
        
        # Calculate subtotal if not present
        if 'subtotal' not in booking_data:
            total_room_charge = Decimal(str(booking_data.get('total_room_charge', 0)))
            extra_charges = Decimal(str(booking_data.get('extra_charges', 0)))
            booking_data['subtotal'] = float(total_room_charge + extra_charges)
        
        # Add booking_date from created_at if not present
        if 'booking_date' not in booking_data and 'created_at' in booking_data:
            booking_data['booking_date'] = booking_data['created_at']
        
        # Map database discount field to schema discount_amount
        if 'discount_amount' not in booking_data and 'discounts' in booking_data:
            booking_data['discount_amount'] = booking_data['discounts']
        
        # Map database tax field to schema tax_amount
        if 'tax_amount' not in booking_data and 'taxes' in booking_data:
            booking_data['tax_amount'] = booking_data['taxes']
        
        # Set default values for schema-required fields
        booking_data.setdefault('guest_email', None)
        booking_data.setdefault('guest_phone', None)
        booking_data.setdefault('guest_country', None)
        booking_data.setdefault('source', 'direct')
        booking_data.setdefault('special_requests', None)
        booking_data.setdefault('payment_status', 'pending')
        booking_data.setdefault('extra_person_charge', 0.0)
        booking_data.setdefault('extra_bed_charge', 0.0)
        booking_data.setdefault('service_charges', 0.0)
        booking_data.setdefault('deposit_required', 0.0)
        booking_data.setdefault('total_paid', 0.0)
        
        # Set default time values if None
        if booking_data.get('check_in_time') is None:
            booking_data['check_in_time'] = '14:00:00'  # Default check-in time
        if booking_data.get('check_out_time') is None:
            booking_data['check_out_time'] = '12:00:00'  # Default check-out time
        
        # Set is_cancelled based on status
        booking_data['is_cancelled'] = booking_data.get('status') == 'cancelled'
        
        # Set default values for cancellation fields
        booking_data.setdefault('cancellation_charge', 0.0)
        booking_data.setdefault('refund_amount', 0.0)
        booking_data.setdefault('refund_status', None)
        
        return booking_data

    async def get_booking(self, booking_id: UUID) -> Booking:
        """Get booking by ID"""
        try:
            # Use maybeSingle() instead of single() to avoid error when no rows found
            response = self.db.table("bookings").select("*").eq("id", str(booking_id)).execute()
            
            if not response.data or len(response.data) == 0:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking_data = self._add_calculated_fields(response.data[0])
            return Booking(**booking_data)
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Error getting booking: {str(e)}")
            raise BadRequestException(f"Error retrieving booking: {str(e)}")

    async def get_booking_by_code(self, booking_code: str) -> Booking:
        """Get booking by booking code"""
        try:
            response = self.db.table("bookings").select("*").eq("booking_code", booking_code).single().execute()
            
            if not response.data:
                raise NotFoundException(f"Booking with code {booking_code} not found")
            
            booking_data = self._add_calculated_fields(response.data)
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error getting booking by code: {str(e)}")
            raise

    async def update_booking(self, booking_id: UUID, booking_data: BookingUpdate, user_id: Optional[UUID] = None) -> Booking:
        """Update booking details"""
        try:
            # Get existing booking
            existing = await self.get_booking(booking_id)
            
            # If dates changed, recalculate totals
            update_dict = booking_data.dict(exclude_unset=True)
            
            if 'check_in_date' in update_dict or 'check_out_date' in update_dict:
                # Merge with existing data for calculation
                calc_data = existing.dict()
                calc_data.update(update_dict)
                totals = await self.calculate_booking_totals(calc_data)
                update_dict.update(totals)
            
            # Convert UUID fields to strings
            uuid_fields = ['room_id']
            for field in uuid_fields:
                if field in update_dict and update_dict[field]:
                    update_dict[field] = str(update_dict[field])
            
            # Convert date/time fields to strings
            date_fields = ['check_in_date', 'check_out_date']
            for field in date_fields:
                if field in update_dict and update_dict[field]:
                    update_dict[field] = str(update_dict[field])
            
            time_fields = ['check_in_time', 'check_out_time']
            for field in time_fields:
                if field in update_dict and update_dict[field]:
                    update_dict[field] = str(update_dict[field])
            
            # Convert Decimal fields to float
            decimal_fields = ['room_rate', 'extra_person_charge', 'extra_bed_charge',
                            'service_charges', 'tax_amount', 'discount_amount',
                            'deposit_required', 'deposit_paid']
            for field in decimal_fields:
                if field in update_dict and isinstance(update_dict[field], Decimal):
                    update_dict[field] = float(update_dict[field])
            
            update_dict['updated_at'] = datetime.now().isoformat()
            # Note: updated_by column doesn't exist in the database
            
            response = self.db.table("bookings").update(update_dict).eq("id", str(booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("bookings:*")
                await self.cache.delete(f"booking:{booking_id}")
            
            booking_data = self._add_calculated_fields(response.data[0])
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error updating booking: {str(e)}")
            raise

    async def check_in(self, booking_id: UUID, check_in_data: CheckInRequest, user_id: Optional[UUID] = None) -> Booking:
        """Process check-in for a booking with room hold/release management"""
        try:
            booking = await self.get_booking(booking_id)
            
            # Check lifecycle status instead of regular status
            booking_record = self.db.table("bookings").select("lifecycle_status").eq("id", str(booking_id)).execute()
            if booking_record.data:
                lifecycle_status = booking_record.data[0].get('lifecycle_status', 'draft')
                if lifecycle_status not in ['confirmed', 'guaranteed']:
                    raise BadRequestException(f"Cannot check in booking with lifecycle status {lifecycle_status}")
            
            # Get the previously assigned room (if any)
            previously_assigned_room_id = booking.room_id
            check_in_room_id = check_in_data.room_id
            
            # Use folio service for check-in
            folio_service = FolioService(self.db)
            await folio_service.check_in(booking_id, user_id)
            
            # Handle room changes during check-in
            if previously_assigned_room_id and str(previously_assigned_room_id) != str(check_in_room_id):
                logger.info(f"Room change during check-in: {previously_assigned_room_id} -> {check_in_room_id}")
                
                # Release the previously assigned room (set back to available)
                self.db.table("rooms").update({
                    'status': 'available',
                    'status_reason': None,
                    'current_booking_id': None,
                    'updated_at': datetime.now().isoformat()
                }).eq("id", str(previously_assigned_room_id)).execute()
                
                logger.info(f"Released previously assigned room {previously_assigned_room_id}")
            
            update_data = {
                'status': BookingStatus.CHECKED_IN.value,
                'actual_check_in': check_in_data.actual_check_in or datetime.now().isoformat(),
                'room_id': str(check_in_room_id),
                'early_check_in': check_in_data.early_check_in,
                'updated_at': datetime.now().isoformat(),
                'checked_in_at': datetime.now().isoformat()
            }
            
            if check_in_data.notes:
                internal_notes = booking.internal_notes or {}
                internal_notes['check_in_notes'] = check_in_data.notes
                update_data['internal_notes'] = internal_notes
            
            # Set the check-in room status to occupied
            self.db.table("rooms").update({
                'status': 'occupied',
                'status_reason': f'Guest checked in - Booking {booking.booking_code}',
                'current_booking_id': str(booking_id),
                'updated_at': datetime.now().isoformat()
            }).eq("id", str(check_in_room_id)).execute()
            
            logger.info(f"Set room {check_in_room_id} to occupied status")
            
            response = self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("bookings:*")
                await self.cache.delete_pattern(f"room:{check_in_room_id}:*")
                if previously_assigned_room_id:
                    await self.cache.delete_pattern(f"room:{previously_assigned_room_id}:*")
            
            booking_data = self._add_calculated_fields(response.data[0])
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error during check-in: {str(e)}")
            raise

    async def check_out(self, booking_id: UUID, check_out_data: CheckOutRequest, user_id: Optional[UUID] = None) -> Booking:
        """Process check-out for a booking"""
        try:
            booking = await self.get_booking(booking_id)
            
            # Check lifecycle status instead of regular status
            lifecycle_result = self.db.table("bookings").select("lifecycle_status").eq("id", str(booking_id)).execute()
            if not lifecycle_result.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            lifecycle_status = lifecycle_result.data[0].get('lifecycle_status', 'checked_in')
            if lifecycle_status != 'checked_in':
                raise BadRequestException(f"Cannot check out booking with lifecycle status {lifecycle_status}")
            
            # Determine if this is an early checkout
            early_checkout = False
            checkout_date = None
            if check_out_data.actual_check_out:
                # Safe date parsing for checkout_date
                actual_checkout = check_out_data.actual_check_out
                if isinstance(actual_checkout, str):
                    checkout_date = datetime.fromisoformat(actual_checkout).date()
                elif hasattr(actual_checkout, 'date'):
                    checkout_date = actual_checkout.date()  # Convert datetime to date
                else:
                    checkout_date = actual_checkout  # Already a date object
                
                # Safe date parsing for original_checkout
                original_check_out = booking.check_out_date
                if isinstance(original_check_out, str):
                    original_checkout = datetime.fromisoformat(original_check_out).date()
                elif hasattr(original_check_out, 'date'):
                    original_checkout = original_check_out.date()  # Convert datetime to date
                else:
                    original_checkout = original_check_out  # Already a date object
                early_checkout = checkout_date < original_checkout
            else:
                checkout_date = date.today()
                # Safe date parsing for original_checkout
                original_check_out = booking.check_out_date
                if isinstance(original_check_out, str):
                    original_checkout = datetime.fromisoformat(original_check_out).date()
                elif hasattr(original_check_out, 'date'):
                    original_checkout = original_check_out.date()  # Convert datetime to date
                else:
                    original_checkout = original_check_out  # Already a date object
                early_checkout = checkout_date < original_checkout
            
            # Use folio service for check-out
            folio_service = FolioService(self.db)
            
            # Process check-out through folio service
            checkout_result = await folio_service.check_out(
                booking_id=booking_id,
                early_checkout=early_checkout,
                checkout_date=checkout_date if early_checkout else None,
                user_id=user_id
            )
            
            # Process final payment if any
            if check_out_data.payment_amount > 0:
                await folio_service.post_charge(
                    folio_id=UUID(checkout_result['folio']['id']),
                    posting_type='payment',
                    description=f"Payment - {check_out_data.payment_method}",
                    amount=-Decimal(str(check_out_data.payment_amount)),  # Negative for payments
                    reference=check_out_data.payment_method,
                    user_id=user_id
                )
            
            # Process extra charges if any
            if check_out_data.extra_charges:
                await folio_service.post_charge(
                    folio_id=UUID(checkout_result['folio']['id']),
                    posting_type='surcharge',
                    description="Late checkout charges",
                    amount=Decimal(str(check_out_data.extra_charges)),
                    surcharge_type='late_checkout',
                    user_id=user_id
                )
            
            # Generate final invoice
            invoice = await folio_service.generate_invoice(UUID(checkout_result['folio']['id']))
            
            # Update booking with final details
            total_paid = Decimal(str(booking.total_paid)) + Decimal(str(check_out_data.payment_amount))
            payment_status = PaymentStatus.FULLY_PAID if total_paid >= Decimal(str(invoice['total_amount'])) else PaymentStatus.PARTIALLY_PAID
            
            update_data = {
                'status': BookingStatus.CHECKED_OUT.value,
                'lifecycle_status': 'checked_out',
                'payment_status': payment_status.value,
                'actual_check_out': check_out_data.actual_check_out or datetime.now().isoformat(),
                'checked_out_at': datetime.now().isoformat(),
                'early_checkout': early_checkout,
                'early_checkout_date': checkout_date.isoformat() if early_checkout else None,
                'late_check_out': check_out_data.late_check_out,
                'total_paid': float(total_paid),
                'updated_at': datetime.now().isoformat()
            }
            
            if check_out_data.extra_charges:
                update_data['service_charges'] = float(Decimal(str(booking.service_charges)) + Decimal(str(check_out_data.extra_charges)))
                update_data['total_amount'] = float(invoice['total_amount'])
            
            if check_out_data.notes:
                internal_notes = booking.internal_notes or {}
                internal_notes['check_out_notes'] = check_out_data.notes
                update_data['internal_notes'] = internal_notes
            
            # Update room status back to available
            if booking.room_id:
                self.db.table("rooms").update({
                    'status': 'available',
                    'status_reason': 'Guest checked out',
                    'current_booking_id': None,
                    'updated_at': datetime.now().isoformat()
                }).eq("id", str(booking.room_id)).execute()
                
                logger.info(f"Set room {booking.room_id} to available status after check-out")
            
            # Record payment in payments table for compatibility
            if check_out_data.payment_amount > 0:
                payment_data = {
                    'booking_id': str(booking_id),
                    'amount': float(check_out_data.payment_amount),
                    'payment_method': check_out_data.payment_method,
                    'payment_date': datetime.now().isoformat(),
                    'created_by': str(user_id) if user_id else None
                }
                self.db.table("payments").insert(payment_data).execute()
            
            response = self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("bookings:*")
                if booking.room_id:
                    await self.cache.delete_pattern(f"room:{booking.room_id}:*")
            
            booking_data = self._add_calculated_fields(response.data[0])
            # Add invoice number to response
            booking_data['invoice_number'] = invoice['invoice_number']
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error during check-out: {str(e)}")
            raise

    async def cancel_booking(self, booking_id: UUID, cancellation: BookingCancellation, user_id: Optional[UUID] = None) -> Booking:
        """Cancel a booking"""
        try:
            booking = await self.get_booking(booking_id)
            
            # Check if booking is already cancelled or checked out
            if booking.status == BookingStatus.CANCELLED:
                raise BadRequestException("Booking is already cancelled")
            
            if booking.status == BookingStatus.CHECKED_OUT:
                raise BadRequestException("Cannot cancel checked-out booking")
            
            # Update booking status
            update_data = {
                'status': BookingStatus.CANCELLED.value,
                'cancelled_at': datetime.now().isoformat(),
                'cancellation_reason': cancellation.reason,
                'updated_at': datetime.now().isoformat()
            }
            
            if user_id:
                update_data['cancelled_by'] = str(user_id)
                
            # Add cancellation charge if specified
            if hasattr(cancellation, 'cancellation_charge') and cancellation.cancellation_charge:
                update_data['cancellation_charge'] = float(cancellation.cancellation_charge)
                
            # Add refund amount if specified
            if hasattr(cancellation, 'refund_amount') and cancellation.refund_amount:
                update_data['refund_amount'] = float(cancellation.refund_amount)
            
            response = self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            # Cancel any pending invoices associated with this booking
            try:
                invoice_update_result = self.db.table("billing_invoices").update({
                    "status": "cancelled",
                    "updated_at": datetime.now().isoformat(),
                    "notes": f"Invoice cancelled due to booking cancellation: {cancellation.reason}"
                }).eq("booking_id", str(booking_id)).in_("status", ["pending", "draft", "sent"]).execute()
                
                if invoice_update_result.data:
                    logger.info(f"Cancelled {len(invoice_update_result.data)} invoice(s) for booking {booking_id}")
            except Exception as invoice_error:
                logger.warning(f"Failed to cancel invoices for booking {booking_id}: {str(invoice_error)}")
                # Don't fail the booking cancellation if invoice cancellation fails
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("bookings:*")
                await self.cache.delete_pattern(f"availability:*")
                await self.cache.delete_pattern("invoices:*")
                await self.cache.delete_pattern("billing:*")
            
            # Return updated booking
            updated_booking = response.data[0]
            booking_data = self._add_calculated_fields(updated_booking)
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error cancelling booking: {str(e)}")
            raise

    async def confirm_deposit(self, booking_id: UUID, deposit_amount: Decimal, payment_method: str, transaction_id: Optional[str] = None, user_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Confirm deposit payment for a booking"""
        try:
            # Get booking details
            booking_result = self.db.table("bookings").select("*").eq("id", str(booking_id)).execute()
            if not booking_result.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking = booking_result.data[0]
            lifecycle_status = booking.get('lifecycle_status', 'draft')
            
            if lifecycle_status not in ['draft', 'pending_deposit']:
                raise BadRequestException(f"Cannot process deposit for booking with lifecycle status {lifecycle_status}")
            
            # Initialize folio service
            folio_service = FolioService(self.db)
            
            # Create folio if it doesn't exist
            folio_id = booking.get('folio_id')
            if not folio_id:
                folio = await folio_service.create_folio_for_booking(booking_id, user_id)
                folio_id = folio['id']
            
            # Process the deposit
            deposit_record = await folio_service.process_deposit(
                booking_id=booking_id,
                amount=deposit_amount,
                payment_method=payment_method,
                transaction_id=transaction_id,
                user_id=user_id
            )
            
            # Update booking status
            update_data = {
                'lifecycle_status': 'confirmed',
                'status': BookingStatus.CONFIRMED.value,
                'has_deposit': True,
                'deposit_amount': float(deposit_amount),
                'total_paid': float(Decimal(str(booking.get('total_paid', 0))) + deposit_amount),
                'payment_status': PaymentStatus.DEPOSIT_PAID.value,
                'updated_at': datetime.now().isoformat()
            }
            
            self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern(f"booking:{booking_id}")
                await self.cache.delete_pattern("bookings:*")
            
            return {
                'booking_id': str(booking_id),
                'folio_id': folio_id,
                'deposit_record': deposit_record,
                'lifecycle_status': 'confirmed',
                'message': 'Deposit confirmed successfully'
            }
            
        except Exception as e:
            logger.error(f"Error confirming deposit: {str(e)}")
            raise

    async def process_no_show(self, booking_id: UUID, charge_percentage: int = 100, user_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Process a no-show booking"""
        try:
            # Get booking details
            booking_result = self.db.table("bookings").select("*").eq("id", str(booking_id)).execute()
            if not booking_result.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking = booking_result.data[0]
            lifecycle_status = booking.get('lifecycle_status', 'confirmed')
            
            if lifecycle_status not in ['confirmed', 'guaranteed']:
                raise BadRequestException(f"Cannot process no-show for booking with lifecycle status {lifecycle_status}")
            
            # Initialize folio service
            folio_service = FolioService(self.db)
            
            # Get or create folio
            folio_id = booking.get('folio_id')
            if not folio_id:
                folio = await folio_service.create_folio_for_booking(booking_id, user_id)
                folio_id = folio['id']
            
            # Calculate no-show charge
            total_amount = Decimal(str(booking['total_amount']))
            no_show_charge = (total_amount * Decimal(charge_percentage)) / Decimal(100)
            
            # Post no-show charge
            await folio_service.post_charge(
                folio_id=UUID(folio_id),
                posting_type='surcharge',
                description=f"No-show charge ({charge_percentage}%)",
                amount=no_show_charge,
                surcharge_type='service',
                reference=f"NO-SHOW-{booking_id}",
                user_id=user_id
            )
            
            # Check if deposit covers the no-show charge
            deposit_amount = Decimal(str(booking.get('deposit_amount', 0)))
            if deposit_amount >= no_show_charge:
                # Apply deposit to cover the charge
                await folio_service.post_charge(
                    folio_id=UUID(folio_id),
                    posting_type='payment',
                    description="Deposit applied for no-show charge",
                    amount=-no_show_charge,
                    reference=f"DEPOSIT-APPLY-{booking_id}",
                    user_id=user_id
                )
                
                # Update deposit state to captured
                self.db.table("deposit_records").update({
                    'state': 'captured',
                    'updated_at': datetime.now().isoformat()
                }).eq("booking_id", str(booking_id)).eq("state", "held").execute()
            
            # Close the folio
            await folio_service.close_folio(UUID(folio_id), user_id)
            
            # Update booking status
            update_data = {
                'lifecycle_status': 'no_show',
                'status': BookingStatus.NO_SHOW.value,
                'no_show': True,
                'updated_at': datetime.now().isoformat()
            }
            
            # Free up the room if assigned
            if booking.get('room_id'):
                self.db.table("rooms").update({
                    'status': 'vacant',
                    'current_booking_id': None
                }).eq("id", booking['room_id']).execute()
            
            self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            # Generate invoice
            invoice = await folio_service.generate_invoice(UUID(folio_id))
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern(f"booking:{booking_id}")
                await self.cache.delete_pattern("bookings:*")
            
            return {
                'booking_id': str(booking_id),
                'folio_id': folio_id,
                'no_show_charge': float(no_show_charge),
                'deposit_applied': float(min(deposit_amount, no_show_charge)),
                'balance_due': float(max(no_show_charge - deposit_amount, Decimal(0))),
                'invoice_number': invoice['invoice_number'],
                'lifecycle_status': 'no_show',
                'message': 'No-show processed successfully'
            }
            
        except Exception as e:
            logger.error(f"Error processing no-show: {str(e)}")
            raise

    async def check_availability(self, request: BookingAvailabilityRequest) -> BookingAvailabilityResponse:
        """Check room availability for given dates (ignores occupancy limits)"""
        try:
            # Build query for room types
            query = self.db.table("room_types").select("*")
            
            if request.room_type_id:
                query = query.eq("id", str(request.room_type_id))
            
            room_types_response = query.execute()
            
            if not room_types_response.data:
                return BookingAvailabilityResponse(
                    available=False,
                    room_types=[],
                    total_nights=(request.check_out_date - request.check_in_date).days,
                    check_in_date=request.check_in_date,
                    check_out_date=request.check_out_date
                )
            
            available_room_types = []
            
            for room_type in room_types_response.data:
                # Get total rooms for this type
                rooms_response = self.db.table("rooms").select("id").eq(
                    "room_type_id", room_type['id']
                ).eq("is_active", True).execute()
                
                total_rooms = len(rooms_response.data)
                
                # Get room IDs for this room type
                room_ids = [room['id'] for room in rooms_response.data]
                
                # Get booked rooms for the date range
                if room_ids:
                    bookings_response = self.db.table("bookings").select("room_id").in_(
                        "room_id", room_ids
                    ).gte("check_out_date", str(request.check_in_date)).lte(
                        "check_in_date", str(request.check_out_date)
                    ).in_("status", ["confirmed", "checked_in"]).execute()
                else:
                    bookings_response = type('obj', (object,), {'data': []})()
                
                booked_rooms = len(bookings_response.data)
                available_rooms = total_rooms - booked_rooms
                
                # Only check if rooms are physically available (ignore occupancy limits)
                can_book = available_rooms > 0
                
                # Get seasonal rates
                base_rate = Decimal(str(room_type['base_price']))
                seasonal_rates = await self.pricing_service.get_seasonal_rates(
                    room_type_id=room_type['id'],
                    is_active=True,
                    start_date=request.check_in_date,
                    end_date=request.check_out_date,
                    limit=1
                )
                
                rate_with_seasonal = base_rate
                if seasonal_rates['data']:
                    seasonal_rate = seasonal_rates['data'][0]
                    if seasonal_rate.rate_multiplier:
                        rate_with_seasonal = base_rate * seasonal_rate.rate_multiplier
                    elif seasonal_rate.fixed_rate:
                        rate_with_seasonal = seasonal_rate.fixed_rate
                
                available_room_types.append(RoomAvailability(
                    room_type_id=room_type['id'],
                    room_type_name=room_type['name'],
                    available_rooms=available_rooms,
                    total_rooms=total_rooms,
                    base_rate=base_rate,
                    rate_with_seasonal=rate_with_seasonal,
                    can_book=can_book
                ))
            
            return BookingAvailabilityResponse(
                available=any(rt.can_book for rt in available_room_types),
                room_types=available_room_types,
                total_nights=(request.check_out_date - request.check_in_date).days,
                check_in_date=request.check_in_date,
                check_out_date=request.check_out_date
            )
            
        except Exception as e:
            logger.error(f"Error checking availability: {str(e)}")
            raise

    async def list_bookings(
        self,
        status: Optional[BookingStatus] = None,
        customer_id: Optional[UUID] = None,
        room_type_id: Optional[UUID] = None,
        room_id: Optional[UUID] = None,
        check_in_date_from: Optional[date] = None,
        check_in_date_to: Optional[date] = None,
        check_out_date: Optional[date] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        order: str = "desc",
        page: int = 1,
        limit: int = 20
    ) -> BookingListResponse:
        """Get bookings with filters"""
        try:
            query = self.db.table("bookings").select("*")
            
            if status:
                query = query.eq("status", status.value)
            if customer_id:
                query = query.eq("customer_id", str(customer_id))
            if room_type_id:
                query = query.eq("room_type_id", str(room_type_id))
            if room_id:
                query = query.eq("room_id", str(room_id))
            if check_in_date_from:
                query = query.gte("check_in_date", str(check_in_date_from))
            if check_in_date_to:
                query = query.lte("check_in_date", str(check_in_date_to))
            if check_out_date:
                query = query.lte("check_out_date", str(check_out_date))
            if search:
                # Only search on booking_code since guest_name and guest_email are not in bookings table
                query = query.ilike("booking_code", f"%{search}%")
            
            # Get total count
            count_response = query.execute()
            total = len(count_response.data) if count_response.data else 0
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.limit(limit).offset(offset)
            
            # Apply sorting
            desc_order = order.lower() == "desc"
            query = query.order(sort_by, desc=desc_order)
            
            response = query.execute()
            
            bookings = [Booking(**self._add_calculated_fields(booking)) for booking in response.data]
            
            return BookingListResponse(
                data=bookings,
                pagination={
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit
                }
            )
            
        except Exception as e:
            logger.error(f"Error getting bookings: {str(e)}")
            raise

    async def update_booking_status(self, booking_id: UUID, status_update: BookingStatusUpdate, user_id: Optional[UUID] = None) -> Booking:
        """Update booking status"""
        try:
            booking = await self.get_booking(booking_id)
            
            update_data = {
                'status': status_update.status.value,
                'updated_at': datetime.now().isoformat()
            }
            
            if status_update.notes:
                internal_notes = booking.internal_notes or {}
                internal_notes['status_change'] = status_update.notes
                update_data['internal_notes'] = internal_notes
            
            # Note: updated_by column doesn't exist in the database
            
            # Handle status-specific actions
            if status_update.status == BookingStatus.CONFIRMED:
                update_data['confirmation_sent'] = True
                update_data['confirmation_sent_at'] = datetime.now().isoformat()
            
            response = self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("bookings:*")
            
            booking_data = self._add_calculated_fields(response.data[0])
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error updating booking status: {str(e)}")
            raise

    async def confirm_booking(self, booking_id: UUID, confirmation_data: Optional[BookingConfirmation] = None, user_id: Optional[UUID] = None) -> Booking:
        """Confirm a booking and optionally send confirmation"""
        try:
            booking = await self.get_booking(booking_id)
            
            if booking.status == BookingStatus.CANCELLED:
                raise BadRequestException("Cannot confirm a cancelled booking")
            
            update_data = {
                'status': BookingStatus.CONFIRMED.value,
                'updated_at': datetime.now().isoformat()
            }
            
            response = self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete(f"booking:{booking_id}")
                await self.cache.delete_pattern("bookings:*")
            
            # Optionally send confirmation email/SMS
            if confirmation_data:
                if confirmation_data.send_email and booking.guest_email:
                    # TODO: Send confirmation email
                    logger.info(f"Confirmation email would be sent to {booking.guest_email}")
                
                if confirmation_data.send_sms and booking.guest_phone:
                    # TODO: Send confirmation SMS
                    logger.info(f"Confirmation SMS would be sent to {booking.guest_phone}")
            
            booking_data = self._add_calculated_fields(response.data[0])
            # Add confirmation fields for the response
            booking_data['confirmation_sent'] = True
            booking_data['confirmation_sent_at'] = datetime.now()
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error confirming booking: {str(e)}")
            raise

    async def record_payment(self, payment: BookingPayment, user_id: Optional[UUID] = None) -> Booking:
        """Record a payment for a booking"""
        try:
            booking = await self.get_booking(payment.booking_id)
            
            # Record payment in payments table
            payment_data = {
                'booking_id': str(payment.booking_id),
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'payment_reference': payment.payment_reference,
                'payment_date': datetime.now().isoformat(),
                'notes': payment.notes,
                'created_by': str(user_id) if user_id else None
            }
            
            self.db.table("payments").insert(payment_data).execute()
            
            # Update booking payment status
            total_paid = booking.total_paid + payment.amount
            payment_status = PaymentStatus.FULLY_PAID if total_paid >= booking.total_amount else PaymentStatus.PARTIALLY_PAID
            
            if booking.deposit_paid == 0 and payment.amount >= booking.deposit_required:
                payment_status = PaymentStatus.DEPOSIT_PAID
            
            update_data = {
                'total_paid': float(total_paid),
                'payment_status': payment_status.value,
                'updated_at': datetime.now().isoformat()
            }
            
            if payment.amount >= booking.deposit_required and booking.deposit_paid == 0:
                update_data['deposit_paid'] = float(payment.amount)
            
            # Note: updated_by column doesn't exist in the database
            
            response = self.db.table("bookings").update(update_data).eq("id", str(payment.booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {payment.booking_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete(f"booking:{payment.booking_id}")
            
            booking_data = self._add_calculated_fields(response.data[0])
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error recording payment: {str(e)}")
            raise

    async def get_statistics(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> BookingStatistics:
        """Get booking statistics for dashboard"""
        try:
            today = date.today()
            month_start = date(today.year, today.month, 1)
            
            # Total bookings
            total_response = self.db.table("bookings").select("id", count="exact").execute()
            total_bookings = total_response.count or 0
            
            # Confirmed bookings
            confirmed_response = self.db.table("bookings").select("id", count="exact").eq(
                "status", BookingStatus.CONFIRMED.value
            ).execute()
            confirmed_bookings = confirmed_response.count or 0
            
            # Pending bookings
            pending_response = self.db.table("bookings").select("id", count="exact").eq(
                "status", BookingStatus.PENDING.value
            ).execute()
            pending_bookings = pending_response.count or 0
            
            # Currently checked in
            checked_in_response = self.db.table("bookings").select("id", count="exact").eq(
                "status", BookingStatus.CHECKED_IN.value
            ).execute()
            checked_in = checked_in_response.count or 0
            
            # Revenue today
            today_response = self.db.table("bookings").select("total_paid").eq(
                "booking_date", str(today)
            ).execute()
            revenue_today = sum(Decimal(str(b['total_paid'])) for b in today_response.data) if today_response.data else Decimal('0')
            
            # Revenue this month
            month_response = self.db.table("bookings").select("total_paid").gte(
                "booking_date", str(month_start)
            ).execute()
            revenue_month = sum(Decimal(str(b['total_paid'])) for b in month_response.data) if month_response.data else Decimal('0')
            
            # Occupancy rate
            total_rooms_response = self.db.table("rooms").select("id", count="exact").eq("is_active", True).execute()
            total_rooms = total_rooms_response.count or 1
            occupancy_rate = (checked_in / total_rooms) * 100 if total_rooms > 0 else 0
            
            # Average stay length
            stays_response = self.db.table("bookings").select("nights").in_(
                "status", [BookingStatus.CHECKED_OUT.value, BookingStatus.CHECKED_IN.value]
            ).execute()
            
            if stays_response.data:
                avg_stay = sum(b['nights'] for b in stays_response.data) / len(stays_response.data)
            else:
                avg_stay = 0
            
            return BookingStatistics(
                total_bookings=total_bookings,
                confirmed_bookings=confirmed_bookings,
                pending_bookings=pending_bookings,
                checked_in=checked_in,
                revenue_today=revenue_today,
                revenue_month=revenue_month,
                occupancy_rate=occupancy_rate,
                average_stay_length=avg_stay
            )
            
        except Exception as e:
            logger.error(f"Error getting booking statistics: {str(e)}")
            raise