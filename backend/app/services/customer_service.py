from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from supabase import Client
from fastapi import HTTPException, status
import re
from difflib import SequenceMatcher

from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerSearchParams,
    CustomerStatistics,
    DuplicateCheckResponse
)
from app.core.logger import logger
from app.core.redis_client import CacheService, cache_service
import json


class CustomerService:
    @staticmethod
    async def create_customer(db: Client, customer_data: CustomerCreate) -> CustomerResponse:
        try:
            # Check for duplicates first
            duplicates = await CustomerService.check_duplicates(
                db, 
                phone=customer_data.phone,
                email=customer_data.email,
                id_number=customer_data.id_number
            )
            
            if duplicates.has_duplicates:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Customer with similar details already exists"
                )
            
            # Create customer in database
            customer_dict = customer_data.dict()
            customer_dict['created_at'] = datetime.utcnow().isoformat()
            customer_dict['updated_at'] = datetime.utcnow().isoformat()
            
            response = db.table("customers").insert(customer_dict).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create customer"
                )
            
            customer = response.data[0]
            logger.info(f"Customer created: {customer['id']}")
            
            return CustomerResponse(**customer)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create customer: {str(e)}"
            )

    @staticmethod
    async def get_customer(db: Client, customer_id: UUID) -> CustomerResponse:
        try:
            # Try to get from cache first
            cache_key = f"customer:{customer_id}"
            cached = await cache_service.get(cache_key)
            if cached:
                return CustomerResponse(**json.loads(cached))
            
            # Get from database
            response = db.table("customers").select("*").eq("id", str(customer_id)).single().execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Customer {customer_id} not found"
                )
            
            customer = response.data
            
            # Cache the result
            await cache_service.set(cache_key, json.dumps(customer), expire=300)
            
            return CustomerResponse(**customer)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting customer {customer_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get customer: {str(e)}"
            )

    @staticmethod
    async def update_customer(
        db: Client,
        customer_id: UUID,
        customer_data: CustomerUpdate
    ) -> CustomerResponse:
        try:
            # Check if customer exists
            existing = await CustomerService.get_customer(db, customer_id)
            
            # Check for duplicates if phone/email/id_number is being updated
            if customer_data.phone or customer_data.email or customer_data.id_number:
                duplicates = await CustomerService.check_duplicates(
                    db,
                    phone=customer_data.phone,
                    email=customer_data.email,
                    id_number=customer_data.id_number,
                    exclude_id=customer_id
                )
                
                if duplicates.has_duplicates:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Another customer with similar details already exists"
                    )
            
            # Update customer
            update_dict = customer_data.dict(exclude_unset=True)
            update_dict['updated_at'] = datetime.utcnow().isoformat()
            
            response = db.table("customers").update(update_dict).eq("id", str(customer_id)).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update customer"
                )
            
            customer = response.data[0]
            
            # Invalidate cache
            await CustomerService._invalidate_cache(customer_id)
            
            logger.info(f"Customer updated: {customer_id}")
            return CustomerResponse(**customer)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating customer {customer_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update customer: {str(e)}"
            )

    @staticmethod
    async def delete_customer(db: Client, customer_id: UUID) -> bool:
        try:
            # Check if customer exists
            customer = await CustomerService.get_customer(db, customer_id)
            
            # Check if customer has bookings
            bookings_response = db.table("bookings").select("id").eq("customer_id", str(customer_id)).limit(1).execute()
            
            if bookings_response.data and len(bookings_response.data) > 0:
                # Mark as inactive instead of deleting
                response = db.table("customers").update({"status": "inactive"}).eq("id", str(customer_id)).execute()
                logger.info(f"Customer {customer_id} marked as inactive (has bookings)")
                return False
            else:
                # Delete customer
                response = db.table("customers").delete().eq("id", str(customer_id)).execute()
                await CustomerService._invalidate_cache(customer_id)
                logger.info(f"Customer deleted: {customer_id}")
                return True
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting customer {customer_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete customer: {str(e)}"
            )

    @staticmethod
    async def search_customers(
        db: Client,
        params: CustomerSearchParams
    ) -> Dict[str, Any]:
        try:
            # If there's a search query, we need to get all customers first
            # and then filter them in Python since Supabase doesn't support OR with ILIKE easily
            if params.query:
                # Get all customers without pagination first
                query = db.table("customers").select("*")
                
                # Apply other filters
                if params.customer_type:
                    query = query.eq("customer_type", params.customer_type)
                
                if params.is_active is not None:
                    query = query.eq("is_active", params.is_active)
                
                if params.is_vip is not None:
                    query = query.eq("is_vip", params.is_vip)
                
                if params.has_bookings is not None:
                    if params.has_bookings:
                        query = query.gt("total_bookings", 0)
                    else:
                        query = query.eq("total_bookings", 0)
                
                if params.min_loyalty_points is not None:
                    query = query.gte("loyalty_points", params.min_loyalty_points)
                
                if params.max_loyalty_points is not None:
                    query = query.lte("loyalty_points", params.max_loyalty_points)
                
                # Apply sorting
                sort_by = params.sort_by or "created_at"
                order = params.order or "desc"
                ascending = order == "asc"
                query = query.order(sort_by, desc=not ascending)
                
                # Execute query to get all matching customers
                response = query.execute()
                all_customers = response.data or []
                
                # Filter by search term
                search_term = params.query.lower()
                filtered_customers = []
                for customer in all_customers:
                    if (search_term in (customer.get('full_name', '') or '').lower() or
                        search_term in (customer.get('email', '') or '').lower() or
                        search_term in (customer.get('phone', '') or '').lower() or
                        search_term in (customer.get('company_name', '') or '').lower() or
                        search_term in (customer.get('id_number', '') or '').lower()):
                        filtered_customers.append(customer)
                
                # Now apply pagination to the filtered results
                total = len(filtered_customers)
                offset = (params.page - 1) * params.limit
                end = offset + params.limit
                customers = filtered_customers[offset:end]
                
            else:
                # No search query, use normal pagination
                query = db.table("customers").select("*", count="exact")
                
                # Apply filters based on params
                if params.customer_type:
                    query = query.eq("customer_type", params.customer_type)
                
                if params.is_active is not None:
                    query = query.eq("is_active", params.is_active)
                
                if params.is_vip is not None:
                    query = query.eq("is_vip", params.is_vip)
                
                if params.has_bookings is not None:
                    if params.has_bookings:
                        query = query.gt("total_bookings", 0)
                    else:
                        query = query.eq("total_bookings", 0)
                
                if params.min_loyalty_points is not None:
                    query = query.gte("loyalty_points", params.min_loyalty_points)
                
                if params.max_loyalty_points is not None:
                    query = query.lte("loyalty_points", params.max_loyalty_points)
                
                # Apply sorting
                sort_by = params.sort_by or "created_at"
                order = params.order or "desc"
                ascending = order == "asc"
                query = query.order(sort_by, desc=not ascending)
                
                # Apply pagination
                offset = (params.page - 1) * params.limit
                query = query.range(offset, offset + params.limit - 1)
                
                # Execute query
                response = query.execute()
                
                customers = response.data or []
                total = response.count or 0
            
            return {
                "data": [CustomerResponse(**c) for c in customers],
                "total": total,
                "page": params.page,
                "limit": params.limit
            }
            
        except Exception as e:
            logger.error(f"Error searching customers: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to search customers: {str(e)}"
            )

    @staticmethod
    async def check_duplicates(
        db: Client,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        id_number: Optional[str] = None,
        exclude_id: Optional[UUID] = None
    ) -> DuplicateCheckResponse:
        try:
            duplicates = []
            
            # Check phone duplicates
            if phone:
                query = db.table("customers").select("*").eq("phone", phone)
                if exclude_id:
                    query = query.neq("id", str(exclude_id))
                response = query.execute()
                if response.data:
                    for customer in response.data:
                        duplicates.append({
                            "customer": CustomerResponse(**customer),
                            "match_type": "phone",
                            "similarity_score": 1.0
                        })
            
            # Check email duplicates
            if email:
                query = db.table("customers").select("*").eq("email", email)
                if exclude_id:
                    query = query.neq("id", str(exclude_id))
                response = query.execute()
                if response.data:
                    for customer in response.data:
                        # Don't add if already in duplicates
                        if not any(d["customer"].id == customer["id"] for d in duplicates):
                            duplicates.append({
                                "customer": CustomerResponse(**customer),
                                "match_type": "email",
                                "similarity_score": 1.0
                            })
            
            # Check ID number duplicates
            if id_number:
                query = db.table("customers").select("*").eq("id_number", id_number)
                if exclude_id:
                    query = query.neq("id", str(exclude_id))
                response = query.execute()
                if response.data:
                    for customer in response.data:
                        # Don't add if already in duplicates
                        if not any(d["customer"].id == customer["id"] for d in duplicates):
                            duplicates.append({
                                "customer": CustomerResponse(**customer),
                                "match_type": "id_number",
                                "similarity_score": 1.0
                            })
            
            return DuplicateCheckResponse(
                has_duplicates=len(duplicates) > 0,
                duplicates=duplicates
            )
            
        except Exception as e:
            logger.error(f"Error checking duplicates: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to check duplicates: {str(e)}"
            )

    @staticmethod
    async def get_customer_statistics(db: Client, customer_id: UUID) -> CustomerStatistics:
        try:
            # Get customer
            customer = await CustomerService.get_customer(db, customer_id)
            
            # Get bookings statistics
            bookings_response = db.table("bookings").select("*").eq("customer_id", str(customer_id)).execute()
            bookings = bookings_response.data or []
            
            total_bookings = len(bookings)
            total_spent = sum(booking.get("total_amount", 0) for booking in bookings)
            
            # Get last stay date
            last_stay_date = None
            if bookings:
                sorted_bookings = sorted(bookings, key=lambda x: x.get("check_out_date", ""), reverse=True)
                for booking in sorted_bookings:
                    if booking.get("status") == "checked_out":
                        last_stay_date = booking.get("check_out_date")
                        break
            
            # Calculate average spending
            avg_spending = total_spent / total_bookings if total_bookings > 0 else 0
            
            # Get payment history
            payment_history = []
            for booking in bookings:
                if booking.get("total_paid", 0) > 0:
                    payment_history.append({
                        "booking_id": booking["id"],
                        "date": booking["created_at"],
                        "amount": booking["total_paid"],
                        "status": "completed"
                    })
            
            return CustomerStatistics(
                customer_id=customer_id,
                total_bookings=total_bookings,
                total_spent=total_spent,
                average_spending=avg_spending,
                last_stay_date=last_stay_date,
                loyalty_points=customer.loyalty_points or 0,
                payment_history=payment_history,
                booking_history=[{"booking_id": b["id"], "dates": f"{b['check_in_date']} - {b['check_out_date']}", "status": b["status"]} for b in bookings]
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting customer statistics: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get customer statistics: {str(e)}"
            )

    @staticmethod
    async def merge_customers(
        db: Client,
        primary_id: UUID,
        duplicate_id: UUID
    ) -> CustomerResponse:
        try:
            # Get both customers
            primary = await CustomerService.get_customer(db, primary_id)
            duplicate = await CustomerService.get_customer(db, duplicate_id)
            
            # Transfer bookings
            db.table("bookings").update({"customer_id": str(primary_id)}).eq("customer_id", str(duplicate_id)).execute()
            
            # Merge loyalty points
            total_points = (primary.loyalty_points or 0) + (duplicate.loyalty_points or 0)
            
            # Update primary customer
            response = db.table("customers").update({
                "loyalty_points": total_points,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", str(primary_id)).execute()
            
            # Delete duplicate
            db.table("customers").delete().eq("id", str(duplicate_id)).execute()
            
            # Invalidate caches
            await CustomerService._invalidate_cache(primary_id)
            await CustomerService._invalidate_cache(duplicate_id)
            
            logger.info(f"Merged customer {duplicate_id} into {primary_id}")
            
            return CustomerResponse(**response.data[0])
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error merging customers: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to merge customers: {str(e)}"
            )
    
    @staticmethod
    async def _invalidate_cache(customer_id: UUID):
        """Invalidate cache for a customer"""
        cache_key = f"customer:{customer_id}"
        await cache_service.delete(cache_key)