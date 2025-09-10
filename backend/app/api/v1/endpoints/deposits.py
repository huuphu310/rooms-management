from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from app.api.deps import get_current_user,
    UserScopedDbDep,
    AuthenticatedDbDep
from app.services.folio_service import FolioService
from app.services.booking_service import BookingService
from app.core.exceptions import NotFoundException, BadRequestException
from supabase import Client
from pydantic import BaseModel

router = APIRouter(
    prefix="/deposits",
    tags=["deposits"]
)

class DepositRequest(BaseModel):
    booking_id: UUID
    amount: Decimal
    payment_method: str
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

class RefundRequest(BaseModel):
    deposit_id: UUID
    refund_amount: Decimal
    reason: str
    notes: Optional[str] = None

@router.post("/confirm")
async def confirm_deposit(
    request: DepositRequest,
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Confirm deposit payment for a booking"""
    try:
        booking_service = BookingService(db)
        result = await booking_service.confirm_deposit(
            booking_id=request.booking_id,
            deposit_amount=request.amount,
            payment_method=request.payment_method,
            transaction_id=request.transaction_id,
            user_id=UUID(current_user['id']) if current_user else None
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/booking/{booking_id}")
async def get_booking_deposits(
    booking_id: UUID,
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all deposit records for a booking"""
    try:
        result = db.table("deposit_records").select("*").eq("booking_id", str(booking_id)).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/refund")
async def refund_deposit(
    request: RefundRequest,
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Process a deposit refund"""
    try:
        folio_service = FolioService(db)
        result = await folio_service.refund_deposit(
            deposit_id=request.deposit_id,
            refund_amount=request.refund_amount,
            reason=request.reason,
            user_id=UUID(current_user['id']) if current_user else None
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/expired")
async def get_expired_deposits(
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all expired deposits that need to be released"""
    try:
        result = db.table("deposit_records").select("""
            *,
            bookings!inner(
                booking_code,
                customers!inner(
                    full_name,
                    email,
                    phone
                )
            )
        """).eq("state", "held").lt("expires_at", datetime.now().isoformat()).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/release-expired")
async def release_expired_deposits(
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Release all expired deposit holds"""
    try:
        folio_service = FolioService(db)
        
        # Get expired deposits
        expired = db.table("deposit_records").select("*").eq("state", "held").lt("expires_at", datetime.now().isoformat()).execute()
        
        released_count = 0
        for deposit in expired.data:
            try:
                await folio_service.release_deposit(
                    deposit_id=UUID(deposit['id']),
                    user_id=UUID(current_user['id']) if current_user else None
                )
                released_count += 1
            except Exception as e:
                print(f"Error releasing deposit {deposit['id']}: {str(e)}")
        
        return {
            "success": True, 
            "data": {
                "total_expired": len(expired.data),
                "released": released_count,
                "message": f"Released {released_count} expired deposits"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/summary")
async def get_deposit_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get deposit summary statistics"""
    try:
        query = db.table("deposit_records").select("state, paid_amount, refund_amount")
        
        if start_date:
            query = query.gte("created_at", start_date.isoformat())
        if end_date:
            query = query.lte("created_at", f"{end_date.isoformat()}T23:59:59")
        
        result = query.execute()
        
        summary = {
            'total_held': 0,
            'total_captured': 0,
            'total_released': 0,
            'total_refunded': 0,
            'count_held': 0,
            'count_captured': 0,
            'count_released': 0,
            'count_refunded': 0
        }
        
        for deposit in result.data:
            state = deposit['state']
            amount = float(deposit.get('paid_amount', 0))
            
            if state == 'held':
                summary['total_held'] += amount
                summary['count_held'] += 1
            elif state == 'captured':
                summary['total_captured'] += amount
                summary['count_captured'] += 1
            elif state == 'released':
                summary['total_released'] += amount
                summary['count_released'] += 1
            elif state == 'refunded':
                refund_amount = float(deposit.get('refund_amount', 0))
                summary['total_refunded'] += refund_amount
                summary['count_refunded'] += 1
        
        return {"success": True, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))