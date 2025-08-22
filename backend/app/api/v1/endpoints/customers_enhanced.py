"""Enhanced Customer API Endpoints based on documentation"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

from app.api.deps import (
    CurrentUser,
    OptionalUser,
    require_permission,
    get_supabase
)
from app.schemas.customer_enhanced import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerSearchParams,
    DuplicateCheckResponse,
    CustomerMergeRequest,
    CustomerType,
    VIPStatus,
    CustomerStatus
)
from app.services.customer_service_enhanced import CustomerServiceEnhanced
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.core.database import get_supabase_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# Customer Management Endpoints
@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate,
    check_duplicates: bool = Query(True, description="Check for duplicate customers"),
    db = Depends(get_supabase),
    current_user: OptionalUser = None
):
    """
    Create a new customer profile.
    
    Features:
    - Automatic duplicate detection based on email, phone, and ID
    - Profile completeness calculation
    - Customer code generation
    - VIP status calculation based on statistics
    """
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    service = CustomerServiceEnhanced(service_db, None)
    
    try:
        return await service.create_customer(customer_data, check_duplicates)
    except ConflictException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create customer"
        )


@router.get("/search", response_model=CustomerListResponse)
async def search_customers(
    search: Optional[str] = Query(None, description="Search in name, email, phone, company"),
    customer_type: Optional[CustomerType] = Query(None),
    vip_status: Optional[VIPStatus] = Query(None),
    status: Optional[CustomerStatus] = Query(None),
    has_stayed: Optional[bool] = Query(None, description="Filter by whether customer has stayed"),
    is_blacklisted: Optional[bool] = Query(None),
    country: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    created_after: Optional[date] = Query(None),
    created_before: Optional[date] = Query(None),
    last_stay_after: Optional[date] = Query(None),
    last_stay_before: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db = Depends(get_supabase)
):
    """
    Search and list customers with advanced filtering.
    
    Features:
    - Full-text search across multiple fields
    - Filter by customer type, VIP status, and more
    - Pagination and sorting
    - Optional statistics calculation
    """
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    service = CustomerServiceEnhanced(service_db, None)
    
    params = CustomerSearchParams(
        search=search,
        customer_type=customer_type,
        vip_status=vip_status,
        status=status,
        has_stayed=has_stayed,
        is_blacklisted=is_blacklisted,
        country=country,
        city=city,
        created_after=created_after,
        created_before=created_before,
        last_stay_after=last_stay_after,
        last_stay_before=last_stay_before,
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order
    )
    
    return await service.search_customers(params)


@router.get("/check-duplicates", response_model=DuplicateCheckResponse)
async def check_duplicates(
    email: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    id_number: Optional[str] = Query(None),
    db = Depends(get_supabase)
):
    """
    Check for duplicate customers based on email, phone, or ID number.
    
    Returns:
    - List of potential duplicates
    - Similarity scores
    - Suggested action (merge, update_existing, or create_new)
    """
    if not any([email, phone, id_number]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one search parameter (email, phone, or id_number) is required"
        )
    
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    service = CustomerServiceEnhanced(service_db, None)
    
    return await service.check_duplicates(email, phone, id_number)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: UUID,
    include_statistics: bool = Query(True, description="Include customer statistics"),
    db = Depends(get_supabase)
):
    """
    Get customer by ID with optional statistics.
    
    Includes:
    - Complete customer profile
    - Calculated statistics (total stays, lifetime value, etc.)
    - VIP status
    - Profile completeness
    """
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    service = CustomerServiceEnhanced(service_db, None)
    
    try:
        return await service.get_customer(customer_id)
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerUpdate,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("customers", "update"))
):
    """
    Update customer information.
    
    Features:
    - Partial updates supported
    - Automatic profile completeness recalculation
    - VIP status update based on new statistics
    """
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    service = CustomerServiceEnhanced(service_db, None)
    
    try:
        return await service.update_customer(customer_id, customer_data)
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/merge", response_model=CustomerResponse)
async def merge_customers(
    merge_request: CustomerMergeRequest,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("customers", "merge"))
):
    """
    Merge multiple customer profiles into one.
    
    Process:
    1. Combines customer data using specified preferences
    2. Transfers all bookings to primary customer
    3. Deletes merged customer profiles
    4. Updates statistics and VIP status
    """
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    service = CustomerServiceEnhanced(service_db, None)
    
    try:
        return await service.merge_customers(merge_request)
    except BadRequestException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: UUID,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("customers", "delete"))
):
    """
    Delete a customer.
    
    Behavior:
    - Soft delete if customer has bookings (marks as inactive)
    - Hard delete if no bookings exist
    """
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    service = CustomerServiceEnhanced(service_db, None)
    
    try:
        success = await service.delete_customer(customer_id)
        if success:
            return {"message": "Customer deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete customer"
            )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{customer_id}/add-loyalty-points")
async def add_loyalty_points(
    customer_id: UUID,
    points: int = Body(..., ge=0),
    reason: str = Body(...),
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("customers", "update"))
):
    """
    Add loyalty points to a customer.
    
    Parameters:
    - points: Number of points to add
    - reason: Reason for adding points
    """
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    
    try:
        # Get current points
        response = service_db.table("customers").select("loyalty_points").eq(
            "id", str(customer_id)
        ).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        current_points = response.data.get("loyalty_points", 0)
        new_points = current_points + points
        
        # Update points
        update_response = service_db.table("customers").update({
            "loyalty_points": new_points
        }).eq("id", str(customer_id)).execute()
        
        # Log the transaction (if you have a loyalty_transactions table)
        # service_db.table("loyalty_transactions").insert({
        #     "customer_id": str(customer_id),
        #     "points": points,
        #     "reason": reason,
        #     "created_by": current_user["id"]
        # }).execute()
        
        return {
            "message": "Loyalty points added successfully",
            "previous_points": current_points,
            "points_added": points,
            "new_total": new_points
        }
        
    except Exception as e:
        logger.error(f"Error adding loyalty points: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add loyalty points"
        )


@router.post("/{customer_id}/blacklist")
async def blacklist_customer(
    customer_id: UUID,
    reason: str = Body(...),
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("customers", "blacklist"))
):
    """
    Add customer to blacklist.
    
    Parameters:
    - reason: Reason for blacklisting
    """
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    
    try:
        response = service_db.table("customers").update({
            "is_blacklisted": True,
            "blacklist_reason": reason,
            "is_active": False,  # Use is_active instead of status
            "blacklisted_at": datetime.now().isoformat(),
            "blacklisted_by": current_user["id"]
        }).eq("id", str(customer_id)).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return {"message": "Customer blacklisted successfully"}
        
    except Exception as e:
        logger.error(f"Error blacklisting customer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to blacklist customer"
        )


@router.delete("/{customer_id}/blacklist")
async def remove_from_blacklist(
    customer_id: UUID,
    db = Depends(get_supabase),
    current_user: dict = Depends(require_permission("customers", "blacklist"))
):
    """Remove customer from blacklist."""
    # Use service client for database operations (RLS bypass)
    service_db = get_supabase_service()
    
    try:
        response = service_db.table("customers").update({
            "is_blacklisted": False,
            "blacklist_reason": None,
            "is_active": True  # Use is_active instead of status
        }).eq("id", str(customer_id)).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return {"message": "Customer removed from blacklist successfully"}
        
    except Exception as e:
        logger.error(f"Error removing customer from blacklist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove customer from blacklist"
        )