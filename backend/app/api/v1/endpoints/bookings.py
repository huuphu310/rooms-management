from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from datetime import date
from uuid import UUID
from app.api.deps import (
    CurrentUser,
    OptionalUser,
    require_permission,
    get_supabase
)
from app.schemas.booking import (
    BookingCreate, 
    BookingUpdate, 
    Booking,
    CheckInRequest, 
    CheckOutRequest, 
    BookingCancellation,
    BookingAvailabilityRequest, 
    BookingAvailabilityResponse,
    BookingStatus,
    BookingPayment,
    BookingStatusUpdate,
    BookingListResponse,
    BookingStatistics
)
from app.services.booking_service import BookingService
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Booking Management Endpoints
@router.post("/", response_model=Booking)
async def create_booking(
    booking_data: BookingCreate,
    db = Depends(get_supabase),
    current_user: OptionalUser = None
):
    """Create a new booking"""
    # Use service client for database operations (RLS bypass)
    from app.core.database import get_supabase_service
    service_db = get_supabase_service()
    service = BookingService(service_db, None)  # Temporarily disable cache
    user_id = current_user['id'] if current_user else None
    return await service.create_booking(booking_data, user_id)

@router.get("/{booking_id}", response_model=Booking)
async def get_booking(
    booking_id: UUID,
    db = Depends(get_supabase)
):
    """Get booking by ID"""
    # Use service client for database operations (RLS bypass)
    from app.core.database import get_supabase_service
    service_db = get_supabase_service()
    service = BookingService(service_db, None)
    return await service.get_booking(booking_id)

@router.get("/code/{booking_code}", response_model=Booking)
async def get_booking_by_code(
    booking_code: str,
    db = Depends(get_supabase)
):
    """Get booking by booking code"""
    # Use service client for database operations (RLS bypass)
    from app.core.database import get_supabase_service
    service_db = get_supabase_service()
    service = BookingService(service_db, None)
    return await service.get_booking_by_code(booking_code)

@router.get("/", response_model=BookingListResponse)
async def get_bookings(
    status: Optional[BookingStatus] = None,
    customer_id: Optional[UUID] = None,
    room_type_id: Optional[UUID] = None,
    check_in_date: Optional[date] = None,
    check_out_date: Optional[date] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_supabase)
):
    """Get bookings with filters"""
    # Use service client for database operations (RLS bypass)
    from app.core.database import get_supabase_service
    service_db = get_supabase_service()
    service = BookingService(service_db, None)
    return await service.get_bookings(
        status=status,
        customer_id=customer_id,
        room_type_id=room_type_id,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        search=search,
        page=page,
        limit=limit
    )

@router.put("/{booking_id}", response_model=Booking)
async def update_booking(
    booking_id: UUID,
    booking_data: BookingUpdate,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("bookings", "edit"))
):
    """Update booking details"""
    service = BookingService(db, None)
    return await service.update_booking(booking_id, booking_data, current_user['id'])

@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: UUID,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("bookings", "delete"))
):
    """Delete a booking (soft delete by cancelling)"""
    service = BookingService(db, None)
    cancellation = BookingCancellation(reason="Deleted by user")
    await service.cancel_booking(booking_id, cancellation, current_user['id'])
    return {"message": "Booking deleted successfully"}

# Booking Status Management
@router.post("/{booking_id}/check-in", response_model=Booking)
async def check_in(
    booking_id: UUID,
    check_in_data: CheckInRequest,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("bookings", "edit"))
):
    """Process check-in for a booking"""
    service = BookingService(db, None)
    return await service.check_in(booking_id, check_in_data, current_user['id'])

@router.post("/{booking_id}/check-out", response_model=Booking)
async def check_out(
    booking_id: UUID,
    check_out_data: CheckOutRequest,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("bookings", "edit"))
):
    """Process check-out for a booking"""
    service = BookingService(db, None)
    return await service.check_out(booking_id, check_out_data, current_user['id'])

@router.post("/{booking_id}/cancel", response_model=Booking)
async def cancel_booking(
    booking_id: UUID,
    cancellation_data: BookingCancellation,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("bookings", "cancel"))
):
    """Cancel a booking"""
    service = BookingService(db, None)
    return await service.cancel_booking(booking_id, cancellation_data, current_user['id'])

@router.put("/{booking_id}/status", response_model=Booking)
async def update_booking_status(
    booking_id: UUID,
    status_update: BookingStatusUpdate,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("bookings", "edit"))
):
    """Update booking status"""
    service = BookingService(db, None)
    return await service.update_booking_status(booking_id, status_update, current_user['id'])

# Payment Management
@router.post("/{booking_id}/payment", response_model=Booking)
async def record_payment(
    booking_id: UUID,
    payment_data: BookingPayment,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """Record a payment for a booking"""
    service = BookingService(db, None)
    # Set booking_id in payment_data
    payment_data.booking_id = booking_id
    return await service.record_payment(payment_data, current_user['id'])

# Availability and Statistics
@router.post("/availability", response_model=BookingAvailabilityResponse)
async def check_availability(
    request: BookingAvailabilityRequest,
    db = Depends(get_supabase)
):
    """Check room availability for given dates"""
    service = BookingService(db, None)
    return await service.check_availability(request)

@router.get("/statistics/dashboard", response_model=BookingStatistics)
async def get_booking_statistics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("reports", "view"))
):
    """Get booking statistics for dashboard"""
    service = BookingService(db, None)
    return await service.get_booking_statistics(start_date, end_date)

# Booking Confirmation
@router.post("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: UUID,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("bookings", "edit"))
):
    """Confirm a pending booking"""
    service = BookingService(db, None)
    status_update = BookingStatusUpdate(
        status=BookingStatus.CONFIRMED,
        notes="Booking confirmed"
    )
    booking = await service.update_booking_status(booking_id, status_update, current_user['id'])
    return {"message": "Booking confirmed successfully", "booking": booking}

# No-show Management
@router.post("/{booking_id}/no-show")
async def mark_no_show(
    booking_id: UUID,
    notes: Optional[str] = None,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("bookings", "edit"))
):
    """Mark a booking as no-show"""
    service = BookingService(db, None)
    status_update = BookingStatusUpdate(
        status=BookingStatus.NO_SHOW,
        notes=notes or "Guest did not arrive"
    )
    booking = await service.update_booking_status(booking_id, status_update, current_user['id'])
    return {"message": "Booking marked as no-show", "booking": booking}