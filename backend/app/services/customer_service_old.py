from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc, asc
from fastapi import HTTPException, status
import re
from difflib import SequenceMatcher

from app.models.customer import Customer
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
    async def create_customer(db: Session, customer_data: CustomerCreate) -> CustomerResponse:
        try:
            duplicates = await CustomerService.check_duplicates(
                db, 
                phone=customer_data.phone,
                email=customer_data.email,
                id_number=customer_data.id_number
            )
            
            if duplicates.has_duplicates:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": "Potential duplicate customer found",
                        "duplicates": [
                            {
                                "id": str(dup.id),
                                "name": dup.full_name,
                                "phone": dup.phone,
                                "email": dup.email
                            } for dup in duplicates.duplicates[:3]
                        ]
                    }
                )
            
            db_customer = Customer(**customer_data.dict())
            db.add(db_customer)
            db.commit()
            db.refresh(db_customer)
            
            await CustomerService._invalidate_cache()
            
            logger.info(f"Customer created: {db_customer.id}")
            return CustomerResponse.from_orm(db_customer)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating customer: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create customer: {str(e)}"
            )

    @staticmethod
    async def get_customer(db: Session, customer_id: UUID) -> CustomerResponse:
        cache_key = f"customer:{customer_id}"
        
        cached = await cache_service.get(cache_key)
        if cached:
            return CustomerResponse(**cached)
        
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with id {customer_id} not found"
            )
        
        response = CustomerResponse.from_orm(customer)
        await cache_service.set(
            cache_key,
            response.dict(default=str),
            expire=300
        )
        
        return response

    @staticmethod
    async def update_customer(
        db: Session,
        customer_id: UUID,
        customer_update: CustomerUpdate
    ) -> CustomerResponse:
        try:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Customer with id {customer_id} not found"
                )
            
            update_data = customer_update.dict(exclude_unset=True)
            
            if 'phone' in update_data or 'email' in update_data or 'id_number' in update_data:
                duplicates = await CustomerService.check_duplicates(
                    db,
                    phone=update_data.get('phone', customer.phone),
                    email=update_data.get('email', customer.email),
                    id_number=update_data.get('id_number', customer.id_number),
                    exclude_id=customer_id
                )
                
                if duplicates.has_duplicates:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Update would create duplicate customer"
                    )
            
            for field, value in update_data.items():
                setattr(customer, field, value)
            
            customer.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(customer)
            
            await CustomerService._invalidate_cache(customer_id)
            
            logger.info(f"Customer updated: {customer_id}")
            return CustomerResponse.from_orm(customer)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating customer {customer_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update customer: {str(e)}"
            )

    @staticmethod
    async def delete_customer(db: Session, customer_id: UUID) -> bool:
        try:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Customer with id {customer_id} not found"
                )
            
            bookings_count = db.execute(
                "SELECT COUNT(*) FROM bookings WHERE customer_id = :customer_id",
                {"customer_id": customer_id}
            ).scalar()
            
            if bookings_count > 0:
                customer.status = "inactive"
                db.commit()
                logger.info(f"Customer {customer_id} marked as inactive (has bookings)")
                return False
            else:
                db.delete(customer)
                db.commit()
                await CustomerService._invalidate_cache(customer_id)
                logger.info(f"Customer deleted: {customer_id}")
                return True
                
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting customer {customer_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete customer: {str(e)}"
            )

    @staticmethod
    async def search_customers(
        db: Session,
        params: CustomerSearchParams
    ) -> Dict[str, Any]:
        try:
            query = db.query(Customer)
            
            if params.query:
                search_term = f"%{params.query}%"
                query = query.filter(
                    or_(
                        Customer.full_name.ilike(search_term),
                        Customer.email.ilike(search_term),
                        Customer.phone.ilike(search_term),
                        Customer.company_name.ilike(search_term),
                        Customer.id_number.ilike(search_term)
                    )
                )
            
            if params.customer_type:
                query = query.filter(Customer.customer_type == params.customer_type)
            
            if params.status:
                query = query.filter(Customer.status == params.status)
            
            if params.min_loyalty_points is not None:
                query = query.filter(Customer.loyalty_points >= params.min_loyalty_points)
            
            if params.max_loyalty_points is not None:
                query = query.filter(Customer.loyalty_points <= params.max_loyalty_points)
            
            if params.has_bookings is not None:
                if params.has_bookings:
                    query = query.filter(Customer.total_bookings > 0)
                else:
                    query = query.filter(Customer.total_bookings == 0)
            
            if params.is_vip:
                query = query.filter(Customer.status == "vip")
            
            total = query.count()
            
            if params.sort_by:
                order_func = desc if params.order == "desc" else asc
                if hasattr(Customer, params.sort_by):
                    query = query.order_by(order_func(getattr(Customer, params.sort_by)))
            
            offset = (params.page - 1) * params.limit
            customers = query.offset(offset).limit(params.limit).all()
            
            return {
                "data": [CustomerResponse.from_orm(c) for c in customers],
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
        db: Session,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        id_number: Optional[str] = None,
        exclude_id: Optional[UUID] = None
    ) -> DuplicateCheckResponse:
        try:
            conditions = []
            
            if phone:
                normalized_phone = re.sub(r'\D', '', phone)
                conditions.append(
                    func.regexp_replace(Customer.phone, '[^0-9]', '', 'g') == normalized_phone
                )
            
            if email:
                conditions.append(func.lower(Customer.email) == email.lower())
            
            if id_number:
                conditions.append(Customer.id_number == id_number)
            
            if not conditions:
                return DuplicateCheckResponse(has_duplicates=False)
            
            query = db.query(Customer).filter(or_(*conditions))
            
            if exclude_id:
                query = query.filter(Customer.id != exclude_id)
            
            duplicates = query.all()
            
            if not duplicates:
                return DuplicateCheckResponse(has_duplicates=False)
            
            similarity_scores = {}
            for dup in duplicates:
                score = 0
                if phone and dup.phone:
                    phone_normalized = re.sub(r'\D', '', dup.phone)
                    if phone_normalized == re.sub(r'\D', '', phone):
                        score += 40
                
                if email and dup.email:
                    if dup.email.lower() == email.lower():
                        score += 30
                
                if id_number and dup.id_number:
                    if dup.id_number == id_number:
                        score += 30
                
                similarity_scores[str(dup.id)] = score
            
            return DuplicateCheckResponse(
                has_duplicates=True,
                duplicates=[CustomerResponse.from_orm(d) for d in duplicates],
                similarity_scores=similarity_scores
            )
            
        except Exception as e:
            logger.error(f"Error checking duplicates: {str(e)}")
            return DuplicateCheckResponse(has_duplicates=False)

    @staticmethod
    async def get_customer_statistics(
        db: Session,
        customer_id: UUID
    ) -> CustomerStatistics:
        try:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Customer with id {customer_id} not found"
                )
            
            booking_stats = db.execute("""
                SELECT 
                    COUNT(*) as total_bookings,
                    COALESCE(SUM(total_amount), 0) as total_spent,
                    COALESCE(AVG(total_amount), 0) as avg_booking_value,
                    MAX(check_out_date) as last_checkout
                FROM bookings 
                WHERE customer_id = :customer_id 
                AND status IN ('completed', 'checked_out')
            """, {"customer_id": customer_id}).first()
            
            room_type_stats = db.execute("""
                SELECT rt.name, COUNT(*) as count
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.customer_id = :customer_id
                GROUP BY rt.name
                ORDER BY count DESC
                LIMIT 1
            """, {"customer_id": customer_id}).first()
            
            days_since_last = None
            if booking_stats.last_checkout:
                days_since_last = (datetime.utcnow() - booking_stats.last_checkout).days
            
            return CustomerStatistics(
                customer_id=customer_id,
                total_bookings=booking_stats.total_bookings,
                total_spent=float(booking_stats.total_spent),
                average_booking_value=float(booking_stats.avg_booking_value),
                last_visit=booking_stats.last_checkout,
                most_booked_room_type=room_type_stats.name if room_type_stats else None,
                loyalty_points=customer.loyalty_points,
                member_since=customer.created_at,
                days_since_last_visit=days_since_last
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
    async def update_loyalty_points(
        db: Session,
        customer_id: UUID,
        points: int,
        operation: str = "add"
    ) -> CustomerResponse:
        try:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Customer with id {customer_id} not found"
                )
            
            if operation == "add":
                customer.loyalty_points += points
            elif operation == "subtract":
                if customer.loyalty_points < points:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Insufficient loyalty points"
                    )
                customer.loyalty_points -= points
            elif operation == "set":
                customer.loyalty_points = points
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid operation. Use 'add', 'subtract', or 'set'"
                )
            
            if customer.loyalty_points >= 1000 and customer.status != "vip":
                customer.status = "vip"
            
            db.commit()
            db.refresh(customer)
            
            await CustomerService._invalidate_cache(customer_id)
            
            logger.info(f"Loyalty points updated for customer {customer_id}: {operation} {points}")
            return CustomerResponse.from_orm(customer)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating loyalty points: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update loyalty points: {str(e)}"
            )

    @staticmethod
    async def merge_customers(
        db: Session,
        primary_id: UUID,
        duplicate_id: UUID
    ) -> CustomerResponse:
        try:
            primary = db.query(Customer).filter(Customer.id == primary_id).first()
            duplicate = db.query(Customer).filter(Customer.id == duplicate_id).first()
            
            if not primary or not duplicate:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One or both customers not found"
                )
            
            db.execute("""
                UPDATE bookings SET customer_id = :primary_id 
                WHERE customer_id = :duplicate_id
            """, {"primary_id": primary_id, "duplicate_id": duplicate_id})
            
            db.execute("""
                UPDATE invoices SET customer_id = :primary_id 
                WHERE customer_id = :duplicate_id
            """, {"primary_id": primary_id, "duplicate_id": duplicate_id})
            
            primary.total_bookings += duplicate.total_bookings
            primary.total_spent += duplicate.total_spent
            primary.loyalty_points += duplicate.loyalty_points
            
            if duplicate.last_visit and (not primary.last_visit or duplicate.last_visit > primary.last_visit):
                primary.last_visit = duplicate.last_visit
            
            primary.is_returning = True
            
            if not primary.email and duplicate.email:
                primary.email = duplicate.email
            if not primary.id_number and duplicate.id_number:
                primary.id_number = duplicate.id_number
            if not primary.date_of_birth and duplicate.date_of_birth:
                primary.date_of_birth = duplicate.date_of_birth
            
            db.delete(duplicate)
            db.commit()
            db.refresh(primary)
            
            await CustomerService._invalidate_cache(primary_id)
            await CustomerService._invalidate_cache(duplicate_id)
            
            logger.info(f"Customers merged: {duplicate_id} -> {primary_id}")
            return CustomerResponse.from_orm(primary)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error merging customers: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to merge customers: {str(e)}"
            )

    @staticmethod
    async def _invalidate_cache(customer_id: Optional[UUID] = None):
        try:
            if customer_id:
                await cache_service.delete(f"customer:{customer_id}")
            
            # Delete pattern matching keys
            await cache_service.delete_pattern("customers:*")
        except Exception as e:
            logger.warning(f"Failed to invalidate cache: {str(e)}")