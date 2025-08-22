from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_supabase_service
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerSearchParams,
    CustomerStatistics,
    DuplicateCheckResponse
)
from app.services.customer_service import CustomerService
from app.core.logger import logger

router = APIRouter()


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new customer with duplicate detection
    """
    logger.info(f"Creating customer: {customer.full_name}")
    return await CustomerService.create_customer(db, customer)


@router.get("/search", response_model=CustomerListResponse)
async def search_customers(
    query: Optional[str] = Query(None, description="Search term"),
    customer_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    min_loyalty_points: Optional[int] = Query(None),
    max_loyalty_points: Optional[int] = Query(None),
    has_bookings: Optional[bool] = Query(None),
    is_vip: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Search customers with advanced filtering
    """
    params = CustomerSearchParams(
        query=query,
        customer_type=customer_type,
        is_active=is_active,
        min_loyalty_points=min_loyalty_points,
        max_loyalty_points=max_loyalty_points,
        has_bookings=has_bookings,
        is_vip=is_vip,
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order
    )
    return await CustomerService.search_customers(db, params)


@router.get("/check-duplicates", response_model=DuplicateCheckResponse)
async def check_duplicates(
    phone: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    id_number: Optional[str] = Query(None),
    exclude_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Check for duplicate customers based on phone, email, or ID number
    """
    if not any([phone, email, id_number]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of phone, email, or id_number must be provided"
        )
    
    return await CustomerService.check_duplicates(
        db, phone, email, id_number, exclude_id
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get customer by ID
    """
    return await CustomerService.get_customer(db, customer_id)


@router.get("/{customer_id}/statistics", response_model=CustomerStatistics)
async def get_customer_statistics(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get customer statistics including booking history and spending
    """
    return await CustomerService.get_customer_statistics(db, customer_id)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Update customer information
    """
    return await CustomerService.update_customer(db, customer_id, customer_update)


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: UUID,
    db: Session = Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete or deactivate customer (soft delete if has bookings)
    """
    deleted = await CustomerService.delete_customer(db, customer_id)
    if deleted:
        return {"message": "Customer deleted successfully"}
    else:
        return {"message": "Customer deactivated (has existing bookings)"}


@router.post("/{customer_id}/loyalty-points", response_model=CustomerResponse)
async def update_loyalty_points(
    customer_id: UUID,
    points: int = Query(..., description="Points to add/subtract/set"),
    operation: str = Query("add", regex="^(add|subtract|set)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update customer loyalty points
    """
    return await CustomerService.update_loyalty_points(
        db, customer_id, points, operation
    )


@router.post("/{primary_id}/merge/{duplicate_id}", response_model=CustomerResponse)
async def merge_customers(
    primary_id: UUID,
    duplicate_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Merge duplicate customers - combines bookings, points, and history
    """
    if primary_id == duplicate_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot merge customer with itself"
        )
    
    return await CustomerService.merge_customers(db, primary_id, duplicate_id)


@router.get("/", response_model=CustomerListResponse)
async def list_customers(
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    List all customers with pagination and optional search
    """
    params = CustomerSearchParams(query=search, page=page, limit=limit)
    return await CustomerService.search_customers(db, params)
