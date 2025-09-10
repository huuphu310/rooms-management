"""
Folio Service - Manages financial transactions and payment flow
Based on the folio requirements document
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID, uuid4
from supabase import Client
import logging

from app.core.exceptions import (
    NotFoundException, BadRequestException, 
    ConflictException, BusinessRuleException
)

logger = logging.getLogger(__name__)

class FolioService:
    """Service for managing hotel folios and financial transactions"""
    
    def __init__(self, db: Client):
        self.db = db
    
    # Lifecycle Management
    async def create_folio_for_booking(self, booking_id: UUID, user_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Create a new folio when booking is created"""
        try:
            # Get booking details
            booking_result = self.db.table("bookings").select("""
                *, 
                customers(id, full_name, email, phone),
                room_type_id,
                room_id
            """).eq("id", str(booking_id)).execute()
            
            if not booking_result.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking = booking_result.data[0]
            
            # Check if folio already exists
            existing = self.db.table("folios").select("id").eq("booking_id", str(booking_id)).execute()
            if existing.data:
                return existing.data[0]
            
            # Generate folio number
            folio_number = self._generate_folio_number()
            
            # Create folio
            folio_data = {
                "folio_number": folio_number,
                "booking_id": str(booking_id),
                "guest_id": booking.get('customer_id'),
                "room_id": booking.get('room_id'),
                "total_charges": 0,
                "total_credits": 0,
                "total_tax": 0,
                "balance": 0,
                "is_master": True,
                "is_closed": False,
                "notes": f"Folio for booking {booking.get('booking_code')}"
            }
            
            folio_result = self.db.table("folios").insert(folio_data).execute()
            folio = folio_result.data[0]
            
            # Update booking with folio_id
            self.db.table("bookings").update({
                "folio_id": folio['id'],
                "lifecycle_status": "pending_deposit"
            }).eq("id", str(booking_id)).execute()
            
            logger.info(f"Created folio {folio_number} for booking {booking_id}")
            return folio
            
        except Exception as e:
            logger.error(f"Failed to create folio: {str(e)}")
            raise BadRequestException(f"Failed to create folio: {str(e)}")
    
    async def post_room_charges(self, booking_id: UUID, posting_date: Optional[date] = None) -> List[Dict[str, Any]]:
        """Post room charges for a booking"""
        try:
            if not posting_date:
                posting_date = date.today()
            
            # Get booking and folio - fix relationship ambiguity
            booking_result = self.db.table("bookings").select("""
                *,
                folios!bookings_folio_id_fkey(id, folio_number),
                room_types(name, base_price)
            """).eq("id", str(booking_id)).execute()
            
            if not booking_result.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking = booking_result.data[0]
            folio = booking.get('folios')
            
            if not folio:
                # Create folio if doesn't exist
                folio = await self.create_folio_for_booking(booking_id)
            
            # Calculate room charges
            room_rate = float(booking.get('room_rate', 0))
            if room_rate <= 0 and booking.get('room_types'):
                room_rate = float(booking['room_types'].get('base_price', 0))
            
            # Check for applicable surcharges
            surcharges = await self._calculate_surcharges(booking, posting_date)
            
            postings = []
            
            # Post room charge
            room_posting = await self.create_posting(
                folio_id=UUID(folio['id']),
                posting_type='room',
                description=f"Room charge for {posting_date}",
                amount=Decimal(str(room_rate)),
                posting_date=posting_date,
                reference=f"ROOM-{posting_date}"
            )
            postings.append(room_posting)
            
            # Post surcharges
            for surcharge in surcharges:
                surcharge_posting = await self.create_posting(
                    folio_id=UUID(folio['id']),
                    posting_type='surcharge',
                    description=surcharge['description'],
                    amount=Decimal(str(surcharge['amount'])),
                    posting_date=posting_date,
                    surcharge_type=surcharge['type'],
                    policy_id=surcharge.get('policy_id')
                )
                postings.append(surcharge_posting)
            
            # Update folio balance
            await self._update_folio_balance(UUID(folio['id']))
            
            return postings
            
        except Exception as e:
            logger.error(f"Failed to post room charges: {str(e)}")
            raise BadRequestException(f"Failed to post room charges: {str(e)}")
    
    async def create_posting(
        self,
        folio_id: UUID,
        posting_type: str,
        description: str,
        amount: Decimal,
        posting_date: Optional[date] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Create a single posting entry"""
        try:
            if not posting_date:
                posting_date = date.today()
            
            # Calculate tax if applicable
            tax_amount = self._calculate_tax(amount, posting_type)
            total_amount = amount + tax_amount
            
            posting_data = {
                "folio_id": str(folio_id),
                "posting_type": posting_type,
                "posting_date": posting_date.isoformat(),
                "description": description,
                "quantity": kwargs.get('quantity', 1),
                "unit_price": float(kwargs.get('unit_price', amount)),
                "amount": float(amount),
                "tax_amount": float(tax_amount),
                "total_amount": float(total_amount),
                "is_posted": True,
                "posted_at": datetime.utcnow().isoformat()
            }
            
            # Add optional fields
            for key in ['reference', 'surcharge_type', 'discount_type', 'policy_id', 'booking_id']:
                if key in kwargs and kwargs[key]:
                    posting_data[key] = str(kwargs[key]) if key.endswith('_id') else kwargs[key]
            
            result = self.db.table("folio_postings").insert(posting_data).execute()
            
            logger.info(f"Created posting: {posting_type} - {description} - Amount: {amount}")
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Failed to create posting: {str(e)}")
            raise BadRequestException(f"Failed to create posting: {str(e)}")
    
    async def process_deposit(
        self,
        booking_id: UUID,
        amount: Decimal,
        payment_method: str,
        transaction_id: Optional[str] = None,
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Process deposit payment for a booking"""
        try:
            # Get booking and folio - fix relationship ambiguity
            booking_result = self.db.table("bookings").select("""
                *,
                folios!bookings_folio_id_fkey(id, folio_number)
            """).eq("id", str(booking_id)).execute()
            
            if not booking_result.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking = booking_result.data[0]
            folio = booking.get('folios')
            
            if not folio:
                folio = await self.create_folio_for_booking(booking_id, user_id)
            
            # Create deposit record
            deposit_data = {
                "booking_id": str(booking_id),
                "folio_id": folio['id'],
                "deposit_type": "fixed",
                "required_amount": float(booking.get('deposit_amount', 0)),
                "paid_amount": float(amount),
                "state": "captured",
                "payment_method": payment_method,
                "transaction_id": transaction_id,
                "payment_date": datetime.utcnow().isoformat()
            }
            
            deposit_result = self.db.table("deposit_records").insert(deposit_data).execute()
            deposit = deposit_result.data[0]
            
            # Create deposit posting (credit)
            await self.create_posting(
                folio_id=UUID(folio['id']),
                posting_type='deposit',
                description=f"Deposit payment - {payment_method}",
                amount=-amount,  # Negative for credit
                reference=transaction_id
            )
            
            # Update booking status
            new_status = 'confirmed' if amount >= Decimal(str(booking.get('deposit_amount', 0))) else 'pending_deposit'
            
            self.db.table("bookings").update({
                "lifecycle_status": new_status,
                "has_deposit": True,
                "paid_amount": float(amount)
            }).eq("id", str(booking_id)).execute()
            
            # Update folio balance
            await self._update_folio_balance(UUID(folio['id']))
            
            logger.info(f"Processed deposit of {amount} for booking {booking_id}")
            return deposit
            
        except Exception as e:
            logger.error(f"Failed to process deposit: {str(e)}")
            raise BadRequestException(f"Failed to process deposit: {str(e)}")
    
    async def check_in(self, booking_id: UUID, user_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Process check-in for a booking"""
        try:
            # Get booking - fix relationship ambiguity
            booking_result = self.db.table("bookings").select("*, folios!bookings_folio_id_fkey(*)").eq("id", str(booking_id)).execute()
            
            if not booking_result.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking = booking_result.data[0]
            
            # Verify booking status
            if booking.get('lifecycle_status') not in ['confirmed', 'guaranteed']:
                raise BusinessRuleException("Booking must be confirmed before check-in")
            
            # Update booking status
            self.db.table("bookings").update({
                "lifecycle_status": "checked_in",
                "checked_in_at": datetime.utcnow().isoformat(),
                "status": "checked_in"
            }).eq("id", str(booking_id)).execute()
            
            # Post first night's room charge
            await self.post_room_charges(booking_id)
            
            logger.info(f"Checked in booking {booking_id}")
            return {"status": "checked_in", "booking_id": str(booking_id)}
            
        except Exception as e:
            logger.error(f"Failed to check in: {str(e)}")
            raise BadRequestException(f"Failed to check in: {str(e)}")
    
    async def check_out(
        self,
        booking_id: UUID,
        early_checkout: bool = False,
        checkout_date: Optional[date] = None,
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Process check-out and generate invoice"""
        try:
            if not checkout_date:
                checkout_date = date.today()
            
            # Get booking with folio - fix relationship ambiguity
            booking_result = self.db.table("bookings").select("""
                *,
                folios!bookings_folio_id_fkey(*)
            """).eq("id", str(booking_id)).execute()
            
            if not booking_result.data:
                raise NotFoundException(f"Booking {booking_id} not found")
            
            booking = booking_result.data[0]
            folio = booking.get('folios')
            
            if not folio:
                raise BusinessRuleException("No folio found for booking")
            
            # Handle early checkout
            if early_checkout:
                original_checkout = datetime.fromisoformat(booking['check_out_date']).date()
                if checkout_date < original_checkout:
                    # Apply early checkout surcharge
                    nights_unused = (original_checkout - checkout_date).days
                    early_checkout_fee = await self._calculate_early_checkout_fee(booking, nights_unused)
                    
                    if early_checkout_fee > 0:
                        await self.create_posting(
                            folio_id=UUID(folio['id']),
                            posting_type='surcharge',
                            description=f"Early checkout fee - {nights_unused} nights unused",
                            amount=Decimal(str(early_checkout_fee)),
                            surcharge_type='manual'
                        )
            
            # Post any remaining charges
            await self._post_pending_charges(UUID(folio['id']))
            
            # Update folio balance
            await self._update_folio_balance(UUID(folio['id']))
            
            # Generate invoice
            invoice = await self.generate_invoice(UUID(folio['id']))
            
            # Update booking status
            self.db.table("bookings").update({
                "lifecycle_status": "checked_out",
                "checked_out_at": datetime.utcnow().isoformat(),
                "status": "checked_out",
                "early_checkout": early_checkout,
                "early_checkout_date": checkout_date.isoformat() if early_checkout else None
            }).eq("id", str(booking_id)).execute()
            
            # Close folio
            self.db.table("folios").update({
                "is_closed": True,
                "closed_at": datetime.utcnow().isoformat(),
                "closed_by": str(user_id) if user_id else None
            }).eq("id", folio['id']).execute()
            
            logger.info(f"Checked out booking {booking_id}")
            return invoice
            
        except Exception as e:
            logger.error(f"Failed to check out: {str(e)}")
            raise BadRequestException(f"Failed to check out: {str(e)}")
    
    async def generate_invoice(self, folio_id: UUID) -> Dict[str, Any]:
        """Generate invoice from folio"""
        try:
            # Get folio with all postings
            folio_result = self.db.table("folios").select("""
                *,
                bookings!folios_booking_id_fkey(booking_code, customer_id),
                folio_postings(*)
            """).eq("id", str(folio_id)).execute()
            
            if not folio_result.data:
                raise NotFoundException(f"Folio {folio_id} not found")
            
            folio = folio_result.data[0]
            postings = folio.get('folio_postings', [])
            booking = folio.get('bookings')
            
            # Calculate totals
            subtotal = Decimal('0')
            tax_total = Decimal('0')
            surcharge_total = Decimal('0')
            discount_total = Decimal('0')
            
            for posting in postings:
                if not posting.get('is_void'):
                    amount = Decimal(str(posting['amount']))
                    tax = Decimal(str(posting.get('tax_amount', 0)))
                    
                    if posting['posting_type'] == 'surcharge':
                        surcharge_total += amount
                    elif posting['posting_type'] == 'discount':
                        discount_total += abs(amount)
                    else:
                        subtotal += amount
                    
                    tax_total += tax
            
            total_amount = subtotal + surcharge_total - discount_total + tax_total
            paid_amount = abs(Decimal(str(folio.get('total_credits', 0))))
            balance_due = total_amount - paid_amount
            
            # Generate invoice number
            invoice_number = self._generate_invoice_number()
            
            # Create invoice
            invoice_data = {
                "invoice_number": invoice_number,
                "invoice_type": "standard",
                "reference_type": "folio",
                "reference_id": str(folio_id),
                "booking_id": folio.get('booking_id'),
                "customer_id": booking.get('customer_id') if booking else None,
                "issue_date": date.today().isoformat(),
                "due_date": (date.today() + timedelta(days=7)).isoformat(),
                "subtotal": float(subtotal),
                "discount_amount": float(discount_total),
                "tax_amount": float(tax_total),
                "total_amount": float(total_amount),
                "paid_amount": float(paid_amount),
                "status": "paid" if balance_due <= 0 else "draft"
            }
            
            invoice_result = self.db.table("invoices").insert(invoice_data).execute()
            invoice = invoice_result.data[0]
            
            # Create line items
            line_number = 0
            for posting in postings:
                if not posting.get('is_void'):
                    line_number += 1
                    line_item = {
                        "invoice_id": invoice['id'],
                        "posting_id": posting['id'],
                        "line_number": line_number,
                        "description": posting['description'],
                        "category": posting['posting_type'],
                        "quantity": posting.get('quantity', 1),
                        "unit_price": float(posting.get('unit_price', 0)),
                        "amount": float(posting['amount']),
                        "tax_amount": float(posting.get('tax_amount', 0)),
                        "total_amount": float(posting['total_amount']),
                        "reference_date": posting.get('posting_date')
                    }
                    self.db.table("invoice_line_items").insert(line_item).execute()
            
            logger.info(f"Generated invoice {invoice_number} for folio {folio_id}")
            return invoice
            
        except Exception as e:
            logger.error(f"Failed to generate invoice: {str(e)}")
            raise BadRequestException(f"Failed to generate invoice: {str(e)}")
    
    # Helper methods
    def _generate_folio_number(self) -> str:
        """Generate unique folio number"""
        timestamp = datetime.now().strftime("%Y%m%d")
        random_suffix = str(uuid4())[:4].upper()
        return f"F{timestamp}{random_suffix}"
    
    def _generate_invoice_number(self) -> str:
        """Generate unique invoice number"""
        timestamp = datetime.now().strftime("%Y%m%d")
        random_suffix = str(uuid4())[:4].upper()
        return f"INV{timestamp}{random_suffix}"
    
    def _calculate_tax(self, amount: Decimal, posting_type: str) -> Decimal:
        """Calculate tax for a posting"""
        # Default 10% VAT for room and services
        if posting_type in ['room', 'surcharge', 'pos']:
            return amount * Decimal('0.10')
        return Decimal('0')
    
    async def _calculate_surcharges(self, booking: Dict, posting_date: date) -> List[Dict]:
        """Calculate applicable surcharges for a booking"""
        surcharges = []
        
        # Weekend surcharge (Friday-Sunday)
        if posting_date.weekday() in [4, 5, 6]:  # Friday, Saturday, Sunday
            # Check for weekend surcharge policy
            policy_result = self.db.table("surcharge_policies").select("*").eq(
                "surcharge_type", "weekend"
            ).eq("is_active", True).execute()
            
            if policy_result.data:
                policy = policy_result.data[0]
                room_rate = float(booking.get('room_rate', 0))
                
                if policy['calculation_type'] == 'percentage':
                    amount = room_rate * float(policy['value']) / 100
                else:
                    amount = float(policy['value'])
                
                surcharges.append({
                    'type': 'weekend',
                    'description': 'Weekend surcharge',
                    'amount': amount,
                    'policy_id': policy['id']
                })
        
        # Extra person surcharge
        adults = booking.get('adults', 1)
        children = booking.get('children', 0)
        total_guests = adults + children
        
        if total_guests > 2:  # Standard occupancy is 2
            extra_persons = total_guests - 2
            # Check for extra person surcharge policy
            policy_result = self.db.table("surcharge_policies").select("*").eq(
                "surcharge_type", "extra_person"
            ).eq("is_active", True).execute()
            
            if policy_result.data:
                policy = policy_result.data[0]
                amount = float(policy['value']) * extra_persons
                
                surcharges.append({
                    'type': 'extra_person',
                    'description': f'Extra person surcharge ({extra_persons} persons)',
                    'amount': amount,
                    'policy_id': policy['id']
                })
        
        return surcharges
    
    async def _calculate_early_checkout_fee(self, booking: Dict, nights_unused: int) -> float:
        """Calculate early checkout fee"""
        # Default: 50% of one night's rate as penalty
        room_rate = float(booking.get('room_rate', 0))
        return room_rate * 0.5
    
    async def _update_folio_balance(self, folio_id: UUID):
        """Update folio balance from postings"""
        try:
            # Get all postings
            postings_result = self.db.table("folio_postings").select("*").eq(
                "folio_id", str(folio_id)
            ).eq("is_void", False).execute()
            
            total_charges = Decimal('0')
            total_credits = Decimal('0')
            total_tax = Decimal('0')
            
            for posting in postings_result.data:
                amount = Decimal(str(posting['amount']))
                tax = Decimal(str(posting.get('tax_amount', 0)))
                
                if amount > 0:
                    total_charges += amount
                else:
                    total_credits += abs(amount)
                
                total_tax += tax
            
            balance = total_charges - total_credits + total_tax
            
            # Update folio
            self.db.table("folios").update({
                "total_charges": float(total_charges),
                "total_credits": float(total_credits),
                "total_tax": float(total_tax),
                "balance": float(balance)
            }).eq("id", str(folio_id)).execute()
            
        except Exception as e:
            logger.error(f"Failed to update folio balance: {str(e)}")
    
    async def _post_pending_charges(self, folio_id: UUID):
        """Post any pending charges (POS, minibar, etc.)"""
        # This would integrate with POS system to post pending charges
        pass
    
    async def night_audit(self, audit_date: Optional[date] = None):
        """Run night audit to post room charges for all checked-in bookings"""
        try:
            if not audit_date:
                audit_date = date.today()
            
            # Get all checked-in bookings
            bookings_result = self.db.table("bookings").select("id").eq(
                "lifecycle_status", "checked_in"
            ).execute()
            
            results = {
                "success": [],
                "failed": []
            }
            
            for booking in bookings_result.data:
                try:
                    await self.post_room_charges(UUID(booking['id']), audit_date)
                    results["success"].append(booking['id'])
                except Exception as e:
                    logger.error(f"Failed to post charges for booking {booking['id']}: {str(e)}")
                    results["failed"].append({
                        "booking_id": booking['id'],
                        "error": str(e)
                    })
            
            logger.info(f"Night audit completed: {len(results['success'])} successful, {len(results['failed'])} failed")
            return results
            
        except Exception as e:
            logger.error(f"Night audit failed: {str(e)}")
            raise BadRequestException(f"Night audit failed: {str(e)}")