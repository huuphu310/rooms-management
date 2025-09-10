from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.deps import (
    get_current_user,
    UserScopedDbDep,
    AuthenticatedDbDep
)
from app.services.booking_service import BookingService
from app.services.folio_service import FolioService
from app.services.billing_service_enhanced import BillingServiceEnhanced
from app.core.exceptions import NotFoundException, BadRequestException
from supabase import Client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["checkout"]
)

class EarlyCheckoutRequest(BaseModel):
    booking_id: UUID
    checkout_date: date
    reason: Optional[str] = None
    waive_surcharge: bool = False

class CheckoutSummaryRequest(BaseModel):
    booking_id: UUID
    checkout_date: Optional[date] = None

class CompleteCheckoutRequest(BaseModel):
    booking_id: UUID
    payment_amount: Optional[Decimal] = 0
    payment_method: Optional[str] = "cash"

class NoShowRequest(BaseModel):
    booking_id: UUID
    charge_percentage: int = 100

@router.post("/early")
async def process_early_checkout(
    request: EarlyCheckoutRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Process early checkout for a booking"""
    try:
        # Get booking details
        booking_result = db.table("bookings").select("*").eq("id", str(request.booking_id)).execute()
        if not booking_result.data:
            raise NotFoundException(f"Booking {request.booking_id} not found")
        
        booking = booking_result.data[0]
        # Handle date parsing safely
        check_out_date = booking['check_out_date']
        if isinstance(check_out_date, str):
            original_checkout = datetime.fromisoformat(check_out_date).date()
        elif hasattr(check_out_date, 'date'):
            original_checkout = check_out_date.date()  # Convert datetime to date
        else:
            original_checkout = check_out_date  # Already a date object
        
        # Validate early checkout
        if request.checkout_date >= original_checkout:
            raise BadRequestException("Not an early checkout")
        
        if booking.get('lifecycle_status') != 'checked_in':
            raise BadRequestException(f"Cannot checkout booking with status {booking.get('lifecycle_status')}")
        
        # Initialize services
        folio_service = FolioService(db)
        
        # Calculate early checkout surcharge
        nights_unused = (original_checkout - request.checkout_date).days
        
        # Handle check-in date parsing safely
        check_in_date = booking['check_in_date']
        if isinstance(check_in_date, str):
            check_in_date_obj = datetime.fromisoformat(check_in_date).date()
        elif hasattr(check_in_date, 'date'):
            check_in_date_obj = check_in_date.date()  # Convert datetime to date
        else:
            check_in_date_obj = check_in_date  # Already a date object
        
        room_rate = Decimal(str(booking.get('room_charges', 0))) / max((original_checkout - check_in_date_obj).days, 1)
        
        # Apply early checkout policy (e.g., 50% of unused nights)
        early_checkout_fee = Decimal(0)
        if not request.waive_surcharge:
            early_checkout_fee = (room_rate * nights_unused * Decimal("0.5"))  # 50% penalty
        
        # Get folio
        folio_result = db.table("folios").select("*").eq("booking_id", str(request.booking_id)).execute()
        if not folio_result.data:
            raise NotFoundException("No folio found for booking")
        
        folio_id = UUID(folio_result.data[0]['id'])
        
        # Post early checkout surcharge
        if early_checkout_fee > 0:
            await folio_service.create_posting(
                folio_id=folio_id,
                posting_type='surcharge',
                description=f"Early checkout fee ({nights_unused} unused nights)",
                amount=early_checkout_fee,
                surcharge_type='early_checkout',
                reference=f"EARLY-CHECKOUT-{request.booking_id}"
            )
        
        # Remove charges for unused nights
        unused_dates = []
        current_date = request.checkout_date
        while current_date < original_checkout:
            unused_dates.append(current_date.isoformat())
            current_date = date(current_date.year, current_date.month, current_date.day + 1)
        
        # Void room charges for unused dates
        postings_result = db.table("folio_postings").select("*").eq("folio_id", str(folio_id)).eq("posting_type", "room").in_("reference", unused_dates).execute()
        
        for posting in postings_result.data:
            db.table("folio_postings").update({
                'is_void': True,
                'void_reason': f"Early checkout on {request.checkout_date}",
                'voided_at': datetime.now().isoformat(),
                'voided_by': current_user['id'] if current_user else None
            }).eq("id", posting['id']).execute()
        
        # Update booking
        db.table("bookings").update({
            'early_checkout': True,
            'early_checkout_date': request.checkout_date.isoformat(),
            'updated_at': datetime.now().isoformat()
        }).eq("id", str(request.booking_id)).execute()
        
        # Get updated folio balance
        folio_service = FolioService(db)
        balance = await folio_service.calculate_folio_balance(folio_id)
        
        return {
            "success": True,
            "data": {
                "booking_id": str(request.booking_id),
                "original_checkout": original_checkout.isoformat(),
                "new_checkout": request.checkout_date.isoformat(),
                "nights_unused": nights_unused,
                "early_checkout_fee": float(early_checkout_fee),
                "waived": request.waive_surcharge,
                "balance_due": float(balance),
                "message": "Early checkout processed successfully"
            }
        }
        
    except Exception as e:
        logger.error(f"Error processing early checkout: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/summary")
async def get_checkout_summary(
    request: CheckoutSummaryRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get checkout summary including all charges and payments"""
    try:
        # Get booking details
        booking_result = db.table("bookings").select("*").eq("id", str(request.booking_id)).execute()
        if not booking_result.data:
            raise NotFoundException(f"Booking {request.booking_id} not found")
        
        booking = booking_result.data[0]
        
        # Initialize services
        billing_service = BillingServiceEnhanced(db)
        folio_service = FolioService(db)
        
        # Check if folio exists, create if not
        folio_result = db.table("folios").select("*").eq("booking_id", str(request.booking_id)).execute()
        if not folio_result.data:
            logger.info(f"No folio found for booking {request.booking_id}, creating one")
            # Use service client to bypass RLS when creating folio
            service_folio = FolioService(db)  # db is already service client here
            await service_folio.create_folio_for_booking(request.booking_id, UUID(current_user['id']) if current_user else None)
        
        # Get folio statement
        statement = await billing_service.get_folio_statement(request.booking_id)
        
        # Check if early checkout
        checkout_date = request.checkout_date or date.today()
        
        # Handle date parsing safely
        check_out_date = booking['check_out_date']
        if isinstance(check_out_date, str):
            original_checkout = datetime.fromisoformat(check_out_date).date()
        elif hasattr(check_out_date, 'date'):
            original_checkout = check_out_date.date()  # Convert datetime to date
        else:
            original_checkout = check_out_date  # Already a date object
        is_early_checkout = checkout_date < original_checkout
        
        # Calculate potential early checkout fee if applicable
        early_checkout_fee = Decimal(0)
        if is_early_checkout:
            nights_unused = (original_checkout - checkout_date).days
            
            # Handle check-in date parsing safely
            check_in_date = booking['check_in_date']
            if isinstance(check_in_date, str):
                check_in_date_obj = datetime.fromisoformat(check_in_date).date()
            elif hasattr(check_in_date, 'date'):
                check_in_date_obj = check_in_date.date()  # Convert datetime to date
            else:
                check_in_date_obj = check_in_date  # Already a date object
            
            room_rate = Decimal(str(booking.get('room_charges', 0))) / max((original_checkout - check_in_date_obj).days, 1)
            early_checkout_fee = (room_rate * nights_unused * Decimal("0.5"))  # 50% penalty
        
        return {
            "success": True,
            "data": {
                "booking_id": str(request.booking_id),
                "booking_code": booking['booking_code'],
                "guest_name": booking.get('guest_name', ''),
                "check_in_date": booking['check_in_date'],
                "original_checkout": original_checkout.isoformat(),
                "checkout_date": checkout_date.isoformat(),
                "is_early_checkout": is_early_checkout,
                "potential_early_checkout_fee": float(early_checkout_fee) if is_early_checkout else 0,
                "statement": statement,
                "final_balance": statement['summary']['balance_due'],
                "payment_required": statement['summary']['balance_due'] > 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting checkout summary: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/complete")
async def complete_checkout(
    request: CompleteCheckoutRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Complete the checkout process"""
    try:
        from app.schemas.booking import CheckOutRequest
        
        # Initialize booking service
        booking_service = BookingService(db)
        
        # Prepare checkout request
        checkout_request = CheckOutRequest(
            payment_amount=request.payment_amount,
            payment_method=request.payment_method or "cash",
            actual_check_out=datetime.now().isoformat()
        )
        
        # Process checkout
        result = await booking_service.check_out(
            booking_id=request.booking_id,
            check_out_data=checkout_request,
            user_id=UUID(current_user['id']) if current_user else None
        )
        
        return {
            "success": True,
            "data": {
                "booking_id": str(result.id),
                "status": result.status,
                "invoice_number": getattr(result, 'invoice_number', None),
                "total_paid": result.total_paid,
                "payment_status": result.payment_status,
                "message": "Checkout completed successfully"
            }
        }
        
    except Exception as e:
        logger.error(f"Error completing checkout: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/no-show")
async def process_no_show(
    request: NoShowRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Process a no-show for a booking"""
    try:
        booking_service = BookingService(db)
        
        result = await booking_service.process_no_show(
            booking_id=request.booking_id,
            charge_percentage=request.charge_percentage,
            user_id=UUID(current_user['id']) if current_user else None
        )
        
        return {"success": True, "data": result}
        
    except Exception as e:
        logger.error(f"Error processing no-show: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))