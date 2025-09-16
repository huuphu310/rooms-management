from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from typing import Optional, Dict, Any, List
from datetime import date
from uuid import UUID
from app.api.deps import (
    CurrentUserDep,
    OptionalUserDep,
    UserScopedDbDep,
    AuthenticatedDbDep,
    require_permission,
    require_staff,
    get_current_user,
    get_current_active_user
)
from app.schemas.booking import (
    BookingCreate, 
    BookingUpdate, 
    Booking,
    CheckInRequest, 
    CheckOutRequest, 
    BookingCancellation,
    BookingConfirmation,
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

@router.get("", response_model=BookingListResponse)
@router.get("/", response_model=BookingListResponse, include_in_schema=False)
async def list_bookings(
    db: AuthenticatedDbDep,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[BookingStatus] = None,
    check_in_date_from: Optional[date] = None,
    check_in_date_to: Optional[date] = None,
    check_out_date: Optional[date] = None,
    customer_id: Optional[UUID] = None,
    room_id: Optional[UUID] = None,
    room_type_id: Optional[UUID] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    current_user: dict = Depends(get_current_user)
):
    """List bookings with filtering options"""
    try:
        service = BookingService(db)
        return await service.list_bookings(
            page=page,
            limit=limit,
            status=status,
            check_in_date_from=check_in_date_from,
            check_in_date_to=check_in_date_to,
            check_out_date=check_out_date,
            customer_id=customer_id,
            room_id=room_id,
            room_type_id=room_type_id,
            search=search,
            sort_by=sort_by,
            order=order
        )
    except Exception as e:
        logger.error(f"Error listing bookings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Booking)
async def create_booking(
    booking_data: BookingCreate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Create a new booking"""
    try:
        service = BookingService(db)
        return await service.create_booking(
            booking_data=booking_data,
            user_id=UUID(current_user['id'])
        )
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{booking_id}", response_model=Booking)
async def get_booking(
    booking_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get booking details"""
    try:
        service = BookingService(db)
        booking = await service.get_booking(booking_id)
        if not booking:
            raise NotFoundException(f"Booking {booking_id} not found")
        return booking
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{booking_id}", response_model=Booking)
async def update_booking(
    booking_id: UUID,
    booking_update: BookingUpdate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Update booking details"""
    try:
        service = BookingService(db)
        return await service.update_booking(
            booking_id=booking_id,
            booking_data=booking_update,
            user_id=UUID(current_user['id'])
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("bookings", "delete"))
):
    """Delete a booking (admin only)"""
    # TODO: Implement delete_booking in BookingService
    raise HTTPException(status_code=501, detail="Delete booking not implemented yet")

@router.post("/{booking_id}/check-in", response_model=Booking)
async def check_in(
    booking_id: UUID,
    check_in_data: CheckInRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Check in a booking"""
    try:
        service = BookingService(db)
        return await service.check_in(
            booking_id=booking_id,
            check_in_data=check_in_data,
            user_id=UUID(current_user['id'])
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error checking in: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{booking_id}/check-out", response_model=Booking)
async def check_out(
    booking_id: UUID,
    check_out_data: CheckOutRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Check out a booking"""
    try:
        service = BookingService(db)
        return await service.check_out(
            booking_id=booking_id,
            check_out_data=check_out_data,
            user_id=UUID(current_user['id'])
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error checking out: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{booking_id}/cancel", response_model=Booking)
async def cancel_booking(
    booking_id: UUID,
    cancellation_data: BookingCancellation,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a booking"""
    try:
        service = BookingService(db)
        return await service.cancel_booking(
            booking_id=booking_id,
            cancellation=cancellation_data,
            user_id=UUID(current_user['id'])
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error cancelling booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{booking_id}/confirm", response_model=Booking)
async def confirm_booking(
    booking_id: UUID,
    confirmation_data: BookingConfirmation,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Confirm a booking"""
    try:
        service = BookingService(db)
        return await service.confirm_booking(
            booking_id=booking_id,
            confirmation_data=confirmation_data,
            user_id=UUID(current_user['id'])
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error confirming booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-availability", response_model=BookingAvailabilityResponse)
async def check_availability(
    availability_request: BookingAvailabilityRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Check room availability for booking"""
    try:
        service = BookingService(db)
        return await service.check_availability(availability_request)
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{booking_id}/payments", response_model=List[BookingPayment])
async def get_booking_payments(
    booking_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get all payments for a booking"""
    # TODO: Implement get_booking_payments in BookingService
    raise HTTPException(status_code=501, detail="Get booking payments not implemented yet")

@router.post("/{booking_id}/payments", response_model=BookingPayment)
async def add_booking_payment(
    booking_id: UUID,
    payment_data: BookingPayment,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Add a payment to a booking"""
    try:
        service = BookingService(db)
        # Use record_payment instead of add_booking_payment
        return await service.record_payment(
            payment=payment_data,
            user_id=UUID(current_user['id'])
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding booking payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{booking_id}/status", response_model=Booking)
async def update_booking_status(
    booking_id: UUID,
    status_update: BookingStatusUpdate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Update booking status"""
    try:
        service = BookingService(db)
        return await service.update_booking_status(
            booking_id=booking_id,
            status_update=status_update,
            user_id=UUID(current_user['id'])
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating booking status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{booking_id}/assign-room")
async def assign_room_to_booking(
    booking_id: UUID,
    request: dict,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign a room to a booking
    
    This endpoint delegates to the room allocation service
    """
    from app.services.room_allocation_service import RoomAllocationService
    from app.schemas.room_allocation import AssignRoomRequest, AssignmentType
    
    # Extract room_id from request body
    room_id = request.get("room_id")
    if not room_id:
        raise HTTPException(status_code=400, detail="room_id is required")
    
    # Create the proper request for room allocation service
    allocation_request = AssignRoomRequest(
        booking_id=booking_id,
        room_id=UUID(room_id),
        assignment_type=AssignmentType.MANUAL,
        assignment_reason="Manual assignment via booking interface"
    )
    
    # Use the room allocation service
    allocation_service = RoomAllocationService(db)
    result = await allocation_service.assign_room(allocation_request)
    
    return result

@router.get("/statistics/summary", response_model=BookingStatistics)
async def get_booking_statistics(
    db: AuthenticatedDbDep,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: dict = Depends(require_permission("reports", "view"))
):
    """Get booking statistics summary"""
    try:
        service = BookingService(db)
        # Use get_statistics instead of get_booking_statistics
        return await service.get_statistics(
            start_date=start_date,
            end_date=end_date
        )
    except Exception as e:
        logger.error(f"Error getting booking statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customer/{customer_id}", response_model=List[Booking])
async def get_customer_bookings(
    customer_id: UUID,
    db: AuthenticatedDbDep,
    status: Optional[BookingStatus] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get all bookings for a customer"""
    # TODO: Implement get_customer_bookings or use list_bookings with customer_id filter
    raise HTTPException(status_code=501, detail="Get customer bookings not implemented yet")

@router.get("/room/{room_id}", response_model=List[Booking])
async def get_room_bookings(
    room_id: UUID,
    db: AuthenticatedDbDep,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[BookingStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all bookings for a room"""
    # TODO: Implement get_room_bookings or use list_bookings with room_id filter
    raise HTTPException(status_code=501, detail="Get room bookings not implemented yet")

@router.get("/today/arrivals", response_model=List[Booking])
async def get_today_arrivals(
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get all arrivals for today"""
    # TODO: Implement get_today_arrivals or use list_bookings with date filter
    raise HTTPException(status_code=501, detail="Get today arrivals not implemented yet")

@router.get("/today/departures", response_model=List[Booking])
async def get_today_departures(
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get all departures for today"""
    # TODO: Implement get_today_departures or use list_bookings with date filter
    raise HTTPException(status_code=501, detail="Get today departures not implemented yet")