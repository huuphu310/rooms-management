from typing import Optional, List
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.deps import (
    get_current_user,
    UserScopedDbDep,
    AuthenticatedDbDep
)
from app.services.folio_service import FolioService
from app.services.billing_service_enhanced import BillingServiceEnhanced
from app.core.exceptions import NotFoundException
from supabase import Client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["folio"]
)

@router.get("/booking/{booking_id}")
async def get_booking_folio(
    booking_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get folio details for a booking"""
    try:
        billing_service = BillingServiceEnhanced(db)
        statement = await billing_service.get_folio_statement(booking_id)
        return {"success": True, "data": statement}
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting folio: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{folio_id}")
async def get_folio_by_id(
    folio_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get folio details by folio ID"""
    try:
        # Get folio with all postings
        result = db.table("folios").select("""
            *,
            bookings!inner(
                booking_code,
                check_in_date,
                check_out_date,
                customers!inner(
                    full_name,
                    email,
                    phone
                )
            ),
            folio_postings(
                *
            )
        """).eq("id", str(folio_id)).execute()
        
        if not result.data:
            raise NotFoundException(f"Folio {folio_id} not found")
        
        folio = result.data[0]
        
        # Calculate totals
        total_charges = sum(float(p['total_amount']) for p in folio.get('folio_postings', []) if float(p['total_amount']) > 0 and not p.get('is_void'))
        total_credits = sum(float(p['total_amount']) for p in folio.get('folio_postings', []) if float(p['total_amount']) < 0 and not p.get('is_void'))
        
        return {
            "success": True,
            "data": {
                "folio": {
                    "id": folio['id'],
                    "folio_number": folio['folio_number'],
                    "booking_id": folio['booking_id'],
                    "booking_code": folio['bookings']['booking_code'],
                    "guest": folio['bookings']['customers'],
                    "dates": {
                        "check_in": folio['bookings']['check_in_date'],
                        "check_out": folio['bookings']['check_out_date']
                    },
                    "is_closed": folio.get('is_closed', False),
                    "created_at": folio['created_at']
                },
                "postings": [{
                    "id": p['id'],
                    "type": p['posting_type'],
                    "date": p['posting_date'],
                    "time": p.get('posting_time'),
                    "description": p['description'],
                    "reference": p.get('reference'),
                    "quantity": p.get('quantity', 1),
                    "unit_price": float(p.get('unit_price', 0)),
                    "amount": float(p['amount']),
                    "tax": float(p.get('tax_amount', 0)),
                    "total": float(p['total_amount']),
                    "is_void": p.get('is_void', False),
                    "void_reason": p.get('void_reason')
                } for p in folio.get('folio_postings', [])],
                "summary": {
                    "total_charges": total_charges,
                    "total_credits": abs(total_credits),
                    "balance": total_charges + total_credits
                }
            }
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting folio: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def list_folios(
    db: AuthenticatedDbDep,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_closed: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all folios with filters"""
    try:
        query = db.table("folios").select("""
            id,
            folio_number,
            booking_id,
            total_charges,
            total_credits,
            balance,
            is_closed,
            created_at,
            bookings!folios_booking_id_fkey(
                booking_code,
                customers!inner(
                    full_name
                )
            )
        """)
        
        if is_closed is not None:
            query = query.eq("is_closed", is_closed)
        
        if date_from:
            query = query.gte("created_at", date_from.isoformat())
        
        if date_to:
            query = query.lte("created_at", f"{date_to.isoformat()}T23:59:59")
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Format response
        folios = [{
            "id": f['id'],
            "folio_number": f['folio_number'],
            "booking_id": f['booking_id'],
            "booking_code": f['bookings']['booking_code'],
            "guest_name": f['bookings']['customers']['full_name'],
            "total_charges": float(f.get('total_charges', 0)),
            "total_credits": float(f.get('total_credits', 0)),
            "balance": float(f.get('balance', 0)),
            "is_closed": f.get('is_closed', False),
            "created_at": f['created_at']
        } for f in result.data]
        
        return {
            "success": True,
            "data": folios,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": len(result.data)
            }
        }
    except Exception as e:
        logger.error(f"Error listing folios: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{folio_id}/close")
async def close_folio(
    folio_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Close a folio (no more postings allowed)"""
    try:
        folio_service = FolioService(db)
        result = await folio_service.close_folio(
            folio_id=folio_id,
            user_id=UUID(current_user['id']) if current_user else None
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error closing folio: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{folio_id}/reopen")
async def reopen_folio(
    folio_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Reopen a closed folio"""
    try:
        # Check if folio exists and is closed
        folio_result = db.table("folios").select("*").eq("id", str(folio_id)).execute()
        if not folio_result.data:
            raise NotFoundException(f"Folio {folio_id} not found")
        
        if not folio_result.data[0].get('is_closed'):
            raise HTTPException(status_code=400, detail="Folio is not closed")
        
        # Reopen folio
        result = db.table("folios").update({
            "is_closed": False,
            "closed_at": None,
            "closed_by": None,
            "updated_at": date.today().isoformat()
        }).eq("id", str(folio_id)).execute()
        
        return {
            "success": True,
            "data": {
                "folio_id": str(folio_id),
                "is_closed": False,
                "message": "Folio reopened successfully"
            }
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error reopening folio: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{folio_id}/balance")
async def get_folio_balance(
    folio_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get current balance for a folio"""
    try:
        folio_service = FolioService(db)
        balance = await folio_service.calculate_folio_balance(folio_id)
        
        return {
            "success": True,
            "data": {
                "folio_id": str(folio_id),
                "balance": float(balance),
                "status": "paid" if balance <= 0 else "outstanding"
            }
        }
    except Exception as e:
        logger.error(f"Error getting folio balance: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))