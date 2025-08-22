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
        tax_amount = Decimal(str(booking_data.get('tax_amount', 0)))
        discount_amount = Decimal(str(booking_data.get('discount_amount', 0)))
        
        subtotal = total_room_charge + extra_person_charge + extra_bed_charge
        total_amount = subtotal + service_charges + tax_amount - discount_amount
        
        # Calculate deposit (30% by default or custom amount)
        deposit_required = booking_data.get('deposit_required', total_amount * Decimal('0.3'))
        
        return {
            'nights': nights,
            'room_rate': float(room_rate),
            'total_room_charge': float(total_room_charge),
            'subtotal': float(subtotal),
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
            
            # Calculate totals
            totals = await self.calculate_booking_totals(booking_data.dict())
            
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
            
            # Prepare booking data by mapping to actual database fields
            booking_dict = {
                'booking_code': self.generate_booking_code(),
                'customer_id': str(booking_data.customer_id) if booking_data.customer_id else None,
                'room_id': str(booking_data.room_id) if booking_data.room_id else None,
                'check_in_date': str(booking_data.check_in_date),
                'check_out_date': str(booking_data.check_out_date),
                'check_in_time': str(booking_data.check_in_time),
                'check_out_time': str(booking_data.check_out_time),
                'adults': booking_data.adults,
                'children': booking_data.children,
                # 'total_nights' is a generated column - don't include it
                'room_rate': float(booking_data.room_rate) if booking_data.room_rate else totals['room_rate'],
                'total_room_charge': totals['total_room_charge'],
                'extra_charges': float(booking_data.extra_person_charge) + float(booking_data.extra_bed_charge),
                'discounts': float(booking_data.discount_amount),
                'taxes': float(booking_data.tax_amount),
                'total_amount': totals['total_amount'],
                'deposit_amount': totals['deposit_required'],
                'paid_amount': 0.0,  # Initially no payment
                'status': BookingStatus.PENDING.value,
                'source': booking_data.source.value if hasattr(booking_data.source, 'value') else booking_data.source,
                'special_requests': booking_data.special_requests,
                'commission_rate': float(booking_data.commission_rate) if booking_data.commission_rate else 0.0
            }
            
            # Add internal notes if provided
            if booking_data.internal_notes:
                booking_dict['internal_notes'] = booking_data.internal_notes
            
            if user_id:
                booking_dict['created_by'] = str(user_id)
            
            # Create booking
            response = self.db.table("bookings").insert(booking_dict).execute()
            
            if not response.data:
                raise BadRequestException("Failed to create booking")
            
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
            paid_amount = Decimal(str(booking_data.get('paid_amount', 0)))
            deposit_amount = Decimal(str(booking_data.get('deposit_amount', 0)))
            # Balance due is total minus what's been paid
            booking_data['balance_due'] = float(total_amount - paid_amount)
        
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
        
        return booking_data

    async def get_booking(self, booking_id: UUID) -> Booking:
        """Get booking by ID"""
        try:
            response = self.db.table("bookings").select("*").eq("id", str(booking_id)).single().execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking_data = self._add_calculated_fields(response.data)
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error getting booking: {str(e)}")
            raise

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
            if user_id:
                update_dict['updated_by'] = str(user_id)
            
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
        """Process check-in for a booking"""
        try:
            booking = await self.get_booking(booking_id)
            
            if booking.status not in [BookingStatus.CONFIRMED, BookingStatus.GUARANTEED]:
                raise BadRequestException(f"Cannot check in booking with status {booking.status}")
            
            update_data = {
                'status': BookingStatus.CHECKED_IN.value,
                'actual_check_in': check_in_data.actual_check_in or datetime.now().isoformat(),
                'room_id': str(check_in_data.room_id),
                'early_check_in': check_in_data.early_check_in,
                'updated_at': datetime.now().isoformat()
            }
            
            if check_in_data.notes:
                internal_notes = booking.internal_notes or {}
                internal_notes['check_in_notes'] = check_in_data.notes
                update_data['internal_notes'] = internal_notes
            
            if user_id:
                update_data['updated_by'] = str(user_id)
            
            # Update room status to occupied
            self.db.table("rooms").update({
                'status': 'occupied',
                'current_booking_id': str(booking_id)
            }).eq("id", str(check_in_data.room_id)).execute()
            
            response = self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("bookings:*")
                await self.cache.delete_pattern(f"room:{check_in_data.room_id}:*")
            
            booking_data = self._add_calculated_fields(response.data[0])
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error during check-in: {str(e)}")
            raise

    async def check_out(self, booking_id: UUID, check_out_data: CheckOutRequest, user_id: Optional[UUID] = None) -> Booking:
        """Process check-out for a booking"""
        try:
            booking = await self.get_booking(booking_id)
            
            if booking.status != BookingStatus.CHECKED_IN:
                raise BadRequestException(f"Cannot check out booking with status {booking.status}")
            
            # Calculate final amount
            total_paid = booking.total_paid + check_out_data.payment_amount
            payment_status = PaymentStatus.FULLY_PAID if total_paid >= booking.total_amount else PaymentStatus.PARTIALLY_PAID
            
            update_data = {
                'status': BookingStatus.CHECKED_OUT.value,
                'payment_status': payment_status.value,
                'actual_check_out': check_out_data.actual_check_out or datetime.now().isoformat(),
                'late_check_out': check_out_data.late_check_out,
                'total_paid': float(total_paid),
                'updated_at': datetime.now().isoformat()
            }
            
            if check_out_data.extra_charges:
                update_data['service_charges'] = float(booking.service_charges + check_out_data.extra_charges)
                update_data['total_amount'] = float(booking.total_amount + check_out_data.extra_charges)
            
            if check_out_data.notes:
                internal_notes = booking.internal_notes or {}
                internal_notes['check_out_notes'] = check_out_data.notes
                update_data['internal_notes'] = internal_notes
            
            if user_id:
                update_data['updated_by'] = str(user_id)
            
            # Update room status to vacant
            if booking.room_id:
                self.db.table("rooms").update({
                    'status': 'vacant',
                    'current_booking_id': None
                }).eq("id", str(booking.room_id)).execute()
            
            # Record payment
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
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error during check-out: {str(e)}")
            raise

    async def cancel_booking(self, booking_id: UUID, cancellation: BookingCancellation, user_id: Optional[UUID] = None) -> Booking:
        """Cancel a booking"""
        try:
            booking = await self.get_booking(booking_id)
            
            if booking.status in [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED]:
                raise BadRequestException(f"Cannot cancel booking with status {booking.status}")
            
            update_data = {
                'status': BookingStatus.CANCELLED.value,
                'is_cancelled': True,
                'cancelled_at': datetime.now().isoformat(),
                'cancellation_reason': cancellation.reason,
                'updated_at': datetime.now().isoformat()
            }
            
            if cancellation.cancellation_charge:
                update_data['cancellation_charge'] = float(cancellation.cancellation_charge)
            
            if cancellation.refund_amount:
                update_data['refund_amount'] = float(cancellation.refund_amount)
                update_data['refund_status'] = 'pending'
            
            if user_id:
                update_data['cancelled_by'] = str(user_id)
                update_data['updated_by'] = str(user_id)
            
            # Free up the room if assigned
            if booking.room_id and booking.status == BookingStatus.CHECKED_IN:
                self.db.table("rooms").update({
                    'status': 'vacant',
                    'current_booking_id': None
                }).eq("id", str(booking.room_id)).execute()
            
            response = self.db.table("bookings").update(update_data).eq("id", str(booking_id)).execute()
            
            if not response.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            # Clear cache
            if self.cache:
                await self.cache.delete_pattern("bookings:*")
                await self.cache.delete_pattern(f"availability:*")
            
            booking_data = self._add_calculated_fields(response.data[0])
            return Booking(**booking_data)
            
        except Exception as e:
            logger.error(f"Error cancelling booking: {str(e)}")
            raise

    async def check_availability(self, request: BookingAvailabilityRequest) -> BookingAvailabilityResponse:
        """Check room availability for given dates"""
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
                
                # Check if room can accommodate guests
                can_book = (available_rooms > 0 and 
                          room_type['max_occupancy'] >= request.adults + request.children)
                
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

    async def get_bookings(
        self,
        status: Optional[BookingStatus] = None,
        customer_id: Optional[UUID] = None,
        room_type_id: Optional[UUID] = None,
        check_in_date: Optional[date] = None,
        check_out_date: Optional[date] = None,
        search: Optional[str] = None,
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
            if check_in_date:
                query = query.gte("check_in_date", str(check_in_date))
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
            query = query.order("created_at", desc=True)
            
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
            
            if user_id:
                update_data['updated_by'] = str(user_id)
            
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
            
            if user_id:
                update_data['updated_by'] = str(user_id)
            
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

    async def get_booking_statistics(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> BookingStatistics:
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