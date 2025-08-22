import asyncio
import time
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import NotFoundException, BusinessRuleException, PaymentProcessingException
from app.schemas.pos import (
    CreateTransactionRequest,
    TransactionResponse,
    ProcessPaymentRequest,
    PaymentResponse,
    QRPaymentInitResponse,
    PaymentStatusResponse,
    OpenShiftRequest,
    ShiftResponse,
    CloseShiftRequest,
    ShiftSummaryResponse,
    PrintReceiptRequest,
    ReceiptResponse,
    VoidTransactionRequest,
    DailySummaryResponse,
    TransactionItemCreate,
    TransactionItemResponse,
    PaymentMethod,
    POSCategoryCreate,
    POSCategoryResponse,
    QuickProductResponse,
    PaymentStatus,
    TransactionStatus,
    TransactionType,
    CustomerType,
    ShiftStatus,
    DiscountType
)


class POSService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ============= Transaction Management =============
    
    async def create_transaction(
        self,
        request: CreateTransactionRequest,
        cashier_id: UUID
    ) -> TransactionResponse:
        """Create new POS transaction with items"""
        # Get current shift
        shift = await self._get_current_shift(cashier_id)
        if not shift:
            raise BusinessRuleException("No open shift found. Please open a shift first.")
        
        # Validate room if guest
        if request.customer_type == CustomerType.GUEST:
            if not request.booking_id:
                raise BusinessRuleException("Booking ID required for guest transactions")
            # Validate booking exists and is checked in
            booking = await self._get_booking(request.booking_id)
            if booking.status != 'checked_in':
                raise BusinessRuleException("Guest must be checked in to charge to room")
        
        # Calculate transaction amounts
        subtotal = Decimal("0.00")
        items_data = []
        
        for item_request in request.items:
            # Get product details
            product = await self._get_product(item_request.product_id)
            
            # Calculate item amounts
            item_subtotal = item_request.quantity * item_request.unit_price
            
            # Apply modifiers if any
            modifier_price = Decimal("0.00")
            if item_request.modifiers:
                for modifier in item_request.modifiers:
                    modifier_price += Decimal(str(modifier.get('price', 0)))
            
            item_total = item_subtotal + (modifier_price * item_request.quantity)
            
            items_data.append({
                'product_id': item_request.product_id,
                'product_code': product.code,
                'product_name': product.name,
                'category': product.category,
                'quantity': item_request.quantity,
                'unit': product.unit,
                'unit_price': item_request.unit_price,
                'modifiers': item_request.modifiers,
                'notes': item_request.notes,
                'total_amount': item_total
            })
            
            subtotal += item_total
        
        # Apply discount
        discount_amount = Decimal("0.00")
        discount_type = None
        discount_reason = None
        
        if request.discount:
            discount_type = request.discount.get('type')
            if discount_type == 'percentage':
                discount_amount = subtotal * Decimal(str(request.discount.get('value', 0))) / 100
            else:
                discount_amount = Decimal(str(request.discount.get('value', 0)))
            discount_reason = request.discount.get('reason')
        
        # Calculate tax and total
        taxable_amount = subtotal - discount_amount + request.service_charge
        tax_amount = taxable_amount * Decimal("0.10")  # 10% VAT
        total_amount = taxable_amount + tax_amount
        
        # Determine transaction type
        transaction_type = TransactionType.IMMEDIATE
        if request.customer_type == CustomerType.GUEST and request.booking_id:
            transaction_type = TransactionType.ROOM_CHARGE
        
        # Create transaction
        transaction_data = {
            'transaction_type': transaction_type,
            'shift_id': shift.id,
            'terminal_id': shift.terminal_id,
            'cashier_id': cashier_id,
            'customer_type': request.customer_type,
            'booking_id': request.booking_id,
            'customer_name': request.customer_name,
            'customer_phone': request.customer_phone,
            'room_number': request.room_number,
            'subtotal': subtotal,
            'discount_amount': discount_amount,
            'discount_type': discount_type,
            'discount_reason': discount_reason,
            'tax_rate': Decimal("10.00"),
            'tax_amount': tax_amount,
            'service_charge': request.service_charge,
            'total_amount': total_amount,
            'payment_status': PaymentStatus.PENDING,
            'status': TransactionStatus.ACTIVE
        }
        
        # Insert transaction
        result = await self.db.execute(
            """
            INSERT INTO pos_transactions 
            (transaction_type, shift_id, terminal_id, cashier_id, customer_type,
             booking_id, customer_name, customer_phone, room_number,
             subtotal, discount_amount, discount_type, discount_reason,
             tax_rate, tax_amount, service_charge, total_amount,
             payment_status, status)
            VALUES (:transaction_type, :shift_id, :terminal_id, :cashier_id, :customer_type,
                    :booking_id, :customer_name, :customer_phone, :room_number,
                    :subtotal, :discount_amount, :discount_type, :discount_reason,
                    :tax_rate, :tax_amount, :service_charge, :total_amount,
                    :payment_status, :status)
            RETURNING *
            """,
            transaction_data
        )
        transaction = result.fetchone()
        
        # Insert transaction items
        for item_data in items_data:
            item_data['transaction_id'] = transaction.id
            item_data['tax_rate'] = Decimal("10.00")
            item_data['tax_amount'] = item_data['total_amount'] * Decimal("0.10") / Decimal("1.10")
            
            await self.db.execute(
                """
                INSERT INTO pos_transaction_items
                (transaction_id, product_id, product_code, product_name, category,
                 quantity, unit, unit_price, tax_rate, tax_amount,
                 total_amount, modifiers, notes)
                VALUES (:transaction_id, :product_id, :product_code, :product_name, :category,
                        :quantity, :unit, :unit_price, :tax_rate, :tax_amount,
                        :total_amount, :modifiers, :notes)
                """,
                item_data
            )
        
        await self.db.commit()
        
        # Load items for response
        items = await self._get_transaction_items(transaction.id)
        
        return TransactionResponse(
            **dict(transaction),
            items=items
        )
    
    async def process_payment(
        self,
        transaction_id: UUID,
        request: ProcessPaymentRequest,
        cashier_id: UUID
    ) -> PaymentResponse | QRPaymentInitResponse:
        """Process payment for transaction"""
        # Get transaction
        transaction = await self._get_transaction(transaction_id)
        
        if transaction.payment_status == PaymentStatus.COMPLETED:
            raise BusinessRuleException("Transaction already paid")
        
        if transaction.status == TransactionStatus.VOID:
            raise BusinessRuleException("Cannot process payment for void transaction")
        
        payment_amount = request.amount or transaction.total_amount
        
        # Handle different payment methods
        if request.payment_method == PaymentMethod.QR_CODE:
            return await self._process_qr_payment(transaction, request, cashier_id)
        
        elif request.payment_method == PaymentMethod.ROOM_CHARGE:
            return await self._process_room_charge(transaction, cashier_id)
        
        else:
            return await self._process_direct_payment(
                transaction, request, payment_amount, cashier_id
            )
    
    async def _process_qr_payment(
        self,
        transaction: Any,
        request: ProcessPaymentRequest,
        cashier_id: UUID
    ) -> QRPaymentInitResponse:
        """Process QR code payment"""
        # Generate QR code for payment
        qr_data = {
            'amount': float(transaction.total_amount),
            'reference': transaction.transaction_code,
            'description': f'POS-{transaction.transaction_code}'
        }
        
        # Call QR generation service (integrated with billing)
        from app.services.billing_service_enhanced import BillingServiceEnhanced
        billing_service = BillingServiceEnhanced(self.db)
        
        qr_result = await billing_service.generate_seapay_qr(
            amount=transaction.total_amount,
            reference_code=transaction.transaction_code,
            description=f'POS Payment {transaction.transaction_code}'
        )
        
        # Update transaction with QR info
        await self.db.execute(
            """
            UPDATE pos_transactions
            SET qr_code_id = :qr_code_id,
                qr_code_url = :qr_code_url,
                qr_generated_at = :qr_generated_at,
                transaction_type = 'temp_bill',
                payment_method = 'qr_code',
                updated_at = NOW()
            WHERE id = :id
            """,
            {
                'id': transaction.id,
                'qr_code_id': qr_result['qr_code_id'],
                'qr_code_url': qr_result['qr_url'],
                'qr_generated_at': datetime.utcnow()
            }
        )
        
        await self.db.commit()
        
        # Print temp bill if requested
        if request.print_temp_bill:
            await self._print_qr_payment_receipt(transaction)
        
        # Start payment monitoring
        asyncio.create_task(self._monitor_qr_payment(transaction.id, qr_result['qr_code_id']))
        
        return QRPaymentInitResponse(
            status="awaiting_payment",
            transaction_id=transaction.id,
            qr_code_id=qr_result['qr_code_id'],
            qr_code_url=qr_result['qr_url'],
            amount=transaction.total_amount,
            monitor_endpoint=f"/api/pos/payment-status/{transaction.id}",
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
    
    async def _process_room_charge(
        self,
        transaction: Any,
        cashier_id: UUID
    ) -> PaymentResponse:
        """Process room charge payment"""
        if not transaction.booking_id:
            raise BusinessRuleException("No booking associated with transaction")
        
        # Create payment record
        payment_code = f"PAY-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        
        payment_data = {
            'transaction_id': transaction.id,
            'payment_code': payment_code,
            'payment_method': PaymentMethod.ROOM_CHARGE,
            'amount': transaction.total_amount,
            'payment_details': {
                'room_number': transaction.room_number,
                'booking_id': str(transaction.booking_id)
            },
            'status': 'completed',
            'processed_by': cashier_id,
            'processed_at': datetime.utcnow()
        }
        
        result = await self.db.execute(
            """
            INSERT INTO pos_payments
            (transaction_id, payment_code, payment_method, amount,
             payment_details, status, processed_by, processed_at)
            VALUES (:transaction_id, :payment_code, :payment_method, :amount,
                    :payment_details, :status, :processed_by, :processed_at)
            RETURNING *
            """,
            payment_data
        )
        payment = result.fetchone()
        
        # Update transaction status
        await self.db.execute(
            """
            UPDATE pos_transactions
            SET payment_status = 'completed',
                payment_method = 'room_charge',
                status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = :id
            """,
            {'id': transaction.id}
        )
        
        # Add charge to guest folio
        await self._add_to_guest_folio(transaction)
        
        await self.db.commit()
        
        return PaymentResponse(**dict(payment))
    
    async def _process_direct_payment(
        self,
        transaction: Any,
        request: ProcessPaymentRequest,
        amount: Decimal,
        cashier_id: UUID
    ) -> PaymentResponse:
        """Process direct payment (cash, card, transfer)"""
        payment_code = f"PAY-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        
        payment_data = {
            'transaction_id': transaction.id,
            'payment_code': payment_code,
            'payment_method': request.payment_method,
            'amount': amount,
            'payment_details': request.payment_details or {},
            'status': 'completed',
            'processed_by': cashier_id,
            'processed_at': datetime.utcnow(),
            'notes': request.payment_details.get('notes') if request.payment_details else None
        }
        
        # Handle cash change
        if request.payment_method == PaymentMethod.CASH:
            tendered = Decimal(str(request.payment_details.get('tendered', amount)))
            change = tendered - amount
            payment_data['payment_details'] = {
                'tendered': float(tendered),
                'change': float(change)
            }
        
        result = await self.db.execute(
            """
            INSERT INTO pos_payments
            (transaction_id, payment_code, payment_method, amount,
             payment_details, status, processed_by, processed_at, notes)
            VALUES (:transaction_id, :payment_code, :payment_method, :amount,
                    :payment_details, :status, :processed_by, :processed_at, :notes)
            RETURNING *
            """,
            payment_data
        )
        payment = result.fetchone()
        
        # Update transaction
        await self.db.execute(
            """
            UPDATE pos_transactions
            SET payment_status = 'completed',
                payment_method = :payment_method,
                status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = :id
            """,
            {
                'id': transaction.id,
                'payment_method': request.payment_method
            }
        )
        
        await self.db.commit()
        
        # Auto-print receipt
        await self._print_final_receipt(transaction.id)
        
        return PaymentResponse(**dict(payment))
    
    async def check_payment_status(self, transaction_id: UUID) -> PaymentStatusResponse:
        """Check QR payment status"""
        transaction = await self._get_transaction(transaction_id)
        
        response = PaymentStatusResponse(
            transaction_id=transaction_id,
            payment_status=transaction.payment_status
        )
        
        if transaction.qr_paid_at:
            # Payment received
            payment = await self._get_payment_by_transaction(transaction_id)
            response.payment_received = {
                'amount': float(payment.amount),
                'received_at': payment.processed_at.isoformat(),
                'bank_reference': payment.bank_transaction_id
            }
            response.action = 'print_final_receipt'
        
        return response
    
    async def void_transaction(
        self,
        transaction_id: UUID,
        request: VoidTransactionRequest,
        user_id: UUID
    ) -> TransactionResponse:
        """Void a transaction"""
        transaction = await self._get_transaction(transaction_id)
        
        if transaction.status == TransactionStatus.VOID:
            raise BusinessRuleException("Transaction already voided")
        
        if transaction.payment_status == PaymentStatus.COMPLETED:
            # Check permissions for voiding paid transactions
            if not await self._check_void_permission(user_id, request.supervisor_pin):
                raise BusinessRuleException("Insufficient permissions to void paid transaction")
        
        # Update transaction
        await self.db.execute(
            """
            UPDATE pos_transactions
            SET status = 'void',
                void_reason = :void_reason,
                void_by = :void_by,
                void_at = NOW(),
                updated_at = NOW()
            WHERE id = :id
            """,
            {
                'id': transaction_id,
                'void_reason': request.void_reason,
                'void_by': user_id
            }
        )
        
        # If payment was completed, process refund
        if transaction.payment_status == PaymentStatus.COMPLETED:
            await self._process_void_refund(transaction)
        
        await self.db.commit()
        
        return await self._get_transaction_with_items(transaction_id)
    
    # ============= Shift Management =============
    
    async def open_shift(
        self,
        request: OpenShiftRequest,
        user_id: UUID
    ) -> ShiftResponse:
        """Open new POS shift"""
        # Check for existing open shift
        existing = await self._get_current_shift(user_id)
        if existing:
            raise BusinessRuleException("You already have an open shift")
        
        shift_code = f"SHIFT-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:3].upper()}"
        
        shift_data = {
            'shift_code': shift_code,
            'terminal_id': request.terminal_id,
            'shift_date': date.today(),
            'opened_by': user_id,
            'opening_cash': request.opening_cash,
            'opening_notes': request.opening_notes,
            'status': ShiftStatus.OPEN
        }
        
        result = await self.db.execute(
            """
            INSERT INTO pos_shifts
            (shift_code, terminal_id, shift_date, opened_by,
             opening_cash, opening_notes, status)
            VALUES (:shift_code, :terminal_id, :shift_date, :opened_by,
                    :opening_cash, :opening_notes, :status)
            RETURNING *
            """,
            shift_data
        )
        shift = result.fetchone()
        
        await self.db.commit()
        
        return ShiftResponse(**dict(shift))
    
    async def close_shift(
        self,
        shift_id: UUID,
        request: CloseShiftRequest,
        user_id: UUID
    ) -> ShiftSummaryResponse:
        """Close POS shift with reconciliation"""
        shift = await self._get_shift(shift_id)
        
        if shift.status != ShiftStatus.OPEN:
            raise BusinessRuleException("Shift is not open")
        
        # Calculate expected cash
        cash_transactions = await self._get_shift_cash_transactions(shift_id)
        
        expected_cash = shift.opening_cash
        for trans in cash_transactions:
            if trans.status != TransactionStatus.VOID:
                if trans.payment_method == PaymentMethod.CASH:
                    expected_cash += trans.total_amount
        
        # Update shift
        await self.db.execute(
            """
            UPDATE pos_shifts
            SET closed_at = NOW(),
                closed_by = :closed_by,
                expected_cash = :expected_cash,
                actual_cash = :actual_cash,
                closing_notes = :closing_notes,
                discrepancy_reason = :discrepancy_reason,
                status = 'closed',
                updated_at = NOW()
            WHERE id = :id
            """,
            {
                'id': shift_id,
                'closed_by': user_id,
                'expected_cash': expected_cash,
                'actual_cash': request.actual_cash,
                'closing_notes': request.closing_notes,
                'discrepancy_reason': request.discrepancy_reason
            }
        )
        
        await self.db.commit()
        
        # Generate shift summary
        return await self._generate_shift_summary(shift_id)
    
    async def _generate_shift_summary(self, shift_id: UUID) -> ShiftSummaryResponse:
        """Generate comprehensive shift summary"""
        shift = await self._get_shift(shift_id)
        
        # Calculate duration
        if shift.closed_at:
            duration = shift.closed_at - shift.opened_at
            hours = int(duration.total_seconds() // 3600)
            minutes = int((duration.total_seconds() % 3600) // 60)
            duration_str = f"{hours} hours {minutes} minutes"
        else:
            duration_str = "In progress"
        
        # Get all transactions
        transactions = await self._get_shift_transactions(shift_id)
        
        # Calculate summaries
        sales_summary = {
            'gross_sales': shift.total_sales,
            'discounts': shift.total_discounts,
            'refunds': shift.total_refunds,
            'net_sales': shift.net_sales
        }
        
        payment_breakdown = {
            'cash': {
                'amount': float(shift.cash_sales),
                'count': sum(1 for t in transactions if t.payment_method == 'cash'),
                'percentage': float(shift.cash_sales / shift.total_sales * 100) if shift.total_sales > 0 else 0
            },
            'bank_transfer': {
                'amount': float(shift.transfer_sales),
                'count': sum(1 for t in transactions if t.payment_method in ['bank_transfer', 'qr_code']),
                'percentage': float(shift.transfer_sales / shift.total_sales * 100) if shift.total_sales > 0 else 0
            },
            'credit_card': {
                'amount': float(shift.card_sales),
                'count': sum(1 for t in transactions if t.payment_method == 'credit_card'),
                'percentage': float(shift.card_sales / shift.total_sales * 100) if shift.total_sales > 0 else 0
            },
            'room_charge': {
                'amount': float(shift.room_charge_sales),
                'count': sum(1 for t in transactions if t.payment_method == 'room_charge'),
                'percentage': float(shift.room_charge_sales / shift.total_sales * 100) if shift.total_sales > 0 else 0
            }
        }
        
        cash_reconciliation = {
            'opening_cash': float(shift.opening_cash),
            'cash_sales': float(shift.cash_sales),
            'cash_refunds': 0,  # TODO: Calculate from refund transactions
            'expected_cash': float(shift.expected_cash) if shift.expected_cash else 0,
            'actual_cash': float(shift.actual_cash) if shift.actual_cash else 0,
            'difference': float(shift.cash_difference) if shift.cash_difference else 0,
            'status': 'balanced' if abs(shift.cash_difference or 0) < 1 else 'discrepancy'
        }
        
        # Get top selling items
        top_items = await self._get_shift_top_items(shift_id)
        
        return ShiftSummaryResponse(
            shift_code=shift.shift_code,
            duration=duration_str,
            total_transactions=shift.transaction_count,
            sales_summary=sales_summary,
            payment_breakdown=payment_breakdown,
            cash_reconciliation=cash_reconciliation,
            top_items=top_items
        )
    
    # ============= Receipt Printing =============
    
    async def print_receipt(
        self,
        transaction_id: UUID,
        request: PrintReceiptRequest
    ) -> ReceiptResponse:
        """Print or reprint receipt"""
        transaction = await self._get_transaction_with_items(transaction_id)
        
        # Get receipt template
        template = await self._get_receipt_template(request.template_id)
        
        # Format receipt
        formatted_receipt = await self._format_receipt(transaction, template, request.receipt_type)
        
        # Update receipt info
        if not transaction.receipt_number:
            await self.db.execute(
                """
                UPDATE pos_transactions
                SET receipt_printed = true,
                    receipt_printed_at = NOW(),
                    receipt_print_count = receipt_print_count + 1,
                    updated_at = NOW()
                WHERE id = :id
                """,
                {'id': transaction_id}
            )
            await self.db.commit()
        
        # Send to printer (placeholder)
        printer_status = await self._send_to_printer(formatted_receipt, request.printer_id)
        
        return ReceiptResponse(
            transaction_id=transaction_id,
            receipt_number=transaction.receipt_number or f"TEMP-{transaction.transaction_code}",
            receipt_type=request.receipt_type,
            formatted_receipt=formatted_receipt,
            printer_status=printer_status,
            printed_at=datetime.utcnow()
        )
    
    async def _format_receipt(
        self,
        transaction: Any,
        template: Any,
        receipt_type: str
    ) -> str:
        """Format receipt for thermal printer"""
        width = 48  # 80mm thermal printer width
        
        lines = []
        
        # Header
        lines.append("=" * width)
        lines.append("HOMESTAY ABC".center(width))
        lines.append("123 Main Street".center(width))
        lines.append("Tel: 0123456789 | Tax ID: 0123456789".center(width))
        lines.append("=" * width)
        
        # Receipt type
        if receipt_type == "temp":
            lines.append("TEMPORARY BILL".center(width))
        elif receipt_type == "duplicate":
            lines.append("DUPLICATE RECEIPT".center(width))
        else:
            lines.append("SALES RECEIPT".center(width))
        
        lines.append("-" * width)
        
        # Transaction info
        lines.append(f"Date: {transaction.created_at.strftime('%Y-%m-%d %H:%M')}")
        lines.append(f"Receipt #: {transaction.receipt_number or 'PENDING'}")
        lines.append(f"Cashier: {transaction.cashier_id}")  # TODO: Get cashier name
        
        if transaction.room_number:
            lines.append(f"Room: {transaction.room_number}")
        
        if transaction.customer_name:
            lines.append(f"Customer: {transaction.customer_name}")
        
        lines.append("-" * width)
        
        # Items header
        lines.append("Item                    Qty   Price    Total")
        lines.append("-" * width)
        
        # Items
        for item in transaction.items:
            # Item name (truncate if too long)
            name = item.product_name[:20].ljust(20)
            qty = str(item.quantity).rjust(5)
            price = f"{item.unit_price:,.0f}".rjust(8)
            total = f"{item.total_amount:,.0f}".rjust(10)
            
            lines.append(f"{name}{qty}{price}{total}")
            
            # Modifiers
            if item.modifiers:
                for modifier in item.modifiers:
                    mod_name = f"  + {modifier.get('name', '')}".ljust(30)
                    mod_price = f"{modifier.get('price', 0):,.0f}".rjust(10)
                    lines.append(f"{mod_name}      {mod_price}")
        
        lines.append("-" * width)
        
        # Totals
        subtotal_label = "Subtotal:".rjust(35)
        subtotal_value = f"{transaction.subtotal:,.0f}".rjust(12)
        lines.append(f"{subtotal_label}{subtotal_value}")
        
        if transaction.discount_amount > 0:
            discount_label = "Discount:".rjust(35)
            discount_value = f"-{transaction.discount_amount:,.0f}".rjust(12)
            lines.append(f"{discount_label}{discount_value}")
        
        if transaction.service_charge > 0:
            service_label = "Service:".rjust(35)
            service_value = f"{transaction.service_charge:,.0f}".rjust(12)
            lines.append(f"{service_label}{service_value}")
        
        tax_label = f"VAT ({transaction.tax_rate}%):".rjust(35)
        tax_value = f"{transaction.tax_amount:,.0f}".rjust(12)
        lines.append(f"{tax_label}{tax_value}")
        
        lines.append("=" * width)
        
        total_label = "TOTAL:".rjust(35)
        total_value = f"{transaction.total_amount:,.0f}".rjust(12)
        lines.append(f"{total_label}{total_value}")
        
        lines.append("=" * width)
        
        # Payment info
        if transaction.payment_method:
            payment_label = f"Paid by {transaction.payment_method}:".rjust(35)
            payment_value = f"{transaction.total_amount:,.0f}".rjust(12)
            lines.append(f"{payment_label}{payment_value}")
            
            if transaction.payment_method == PaymentMethod.CASH:
                # TODO: Get cash tendered and change from payment details
                pass
        
        # Footer
        lines.append("-" * width)
        lines.append("Thank you for your visit!".center(width))
        lines.append("Please come again".center(width))
        lines.append("www.homestayabc.com".center(width))
        lines.append("=" * width)
        
        return "\n".join(lines)
    
    # ============= Reports =============
    
    async def get_daily_summary(
        self,
        date: date,
        terminal_id: Optional[str] = None,
        cashier_id: Optional[UUID] = None
    ) -> DailySummaryResponse:
        """Get daily sales summary"""
        # Build query filters
        filters = [
            func.date(self.db.table.pos_transactions.c.created_at) == date,
            self.db.table.pos_transactions.c.status != TransactionStatus.VOID
        ]
        
        if terminal_id:
            filters.append(self.db.table.pos_transactions.c.terminal_id == terminal_id)
        
        if cashier_id:
            filters.append(self.db.table.pos_transactions.c.cashier_id == cashier_id)
        
        # Get transactions
        result = await self.db.execute(
            select(self.db.table.pos_transactions)
            .where(and_(*filters))
        )
        transactions = result.fetchall()
        
        # Calculate summary
        total_revenue = sum(t.total_amount for t in transactions)
        transaction_count = len(transactions)
        average_transaction = total_revenue / transaction_count if transaction_count > 0 else 0
        
        summary = {
            'total_revenue': float(total_revenue),
            'transaction_count': transaction_count,
            'average_transaction': float(average_transaction)
        }
        
        # By hour analysis
        by_hour = []
        for hour in range(24):
            hour_transactions = [
                t for t in transactions 
                if t.created_at.hour == hour
            ]
            if hour_transactions:
                by_hour.append({
                    'hour': f"{hour:02d}:00",
                    'sales': float(sum(t.total_amount for t in hour_transactions)),
                    'transactions': len(hour_transactions)
                })
        
        # By category
        by_category = {}
        # TODO: Aggregate by product category from transaction items
        
        # By payment method
        by_payment = {}
        for method in PaymentMethod:
            method_transactions = [
                t for t in transactions 
                if t.payment_method == method.value
            ]
            if method_transactions:
                by_payment[method.value] = float(
                    sum(t.total_amount for t in method_transactions)
                )
        
        # Top products
        top_products = await self._get_top_products_for_date(date)
        
        # Shift details
        shift_details = await self._get_shifts_for_date(date)
        
        return DailySummaryResponse(
            date=date,
            summary=summary,
            by_hour=by_hour,
            by_category=by_category,
            by_payment=by_payment,
            top_products=top_products,
            shift_details=shift_details
        )
    
    # ============= Helper Methods =============
    
    async def _get_current_shift(self, user_id: UUID) -> Optional[Any]:
        """Get current open shift for user"""
        result = await self.db.execute(
            """
            SELECT * FROM pos_shifts
            WHERE opened_by = :user_id
            AND status = 'open'
            ORDER BY opened_at DESC
            LIMIT 1
            """,
            {'user_id': user_id}
        )
        return result.fetchone()
    
    async def _get_shift(self, shift_id: UUID) -> Any:
        """Get shift by ID"""
        result = await self.db.execute(
            """
            SELECT * FROM pos_shifts
            WHERE id = :id
            """,
            {'id': shift_id}
        )
        shift = result.fetchone()
        if not shift:
            raise NotFoundException("Shift not found")
        return shift
    
    async def _get_transaction(self, transaction_id: UUID) -> Any:
        """Get transaction by ID"""
        result = await self.db.execute(
            """
            SELECT * FROM pos_transactions
            WHERE id = :id
            """,
            {'id': transaction_id}
        )
        transaction = result.fetchone()
        if not transaction:
            raise NotFoundException("Transaction not found")
        return transaction
    
    async def _get_transaction_with_items(self, transaction_id: UUID) -> TransactionResponse:
        """Get transaction with items"""
        transaction = await self._get_transaction(transaction_id)
        items = await self._get_transaction_items(transaction_id)
        
        return TransactionResponse(
            **dict(transaction),
            items=items
        )
    
    async def _get_transaction_items(self, transaction_id: UUID) -> List[TransactionItemResponse]:
        """Get transaction items"""
        result = await self.db.execute(
            """
            SELECT * FROM pos_transaction_items
            WHERE transaction_id = :transaction_id
            ORDER BY sort_order, created_at
            """,
            {'transaction_id': transaction_id}
        )
        items = result.fetchall()
        
        return [TransactionItemResponse(**dict(item)) for item in items]
    
    async def _get_product(self, product_id: UUID) -> Any:
        """Get product details"""
        result = await self.db.execute(
            """
            SELECT * FROM products
            WHERE id = :id
            """,
            {'id': product_id}
        )
        product = result.fetchone()
        if not product:
            raise NotFoundException("Product not found")
        return product
    
    async def _get_booking(self, booking_id: UUID) -> Any:
        """Get booking details"""
        result = await self.db.execute(
            """
            SELECT * FROM bookings
            WHERE id = :id
            """,
            {'id': booking_id}
        )
        booking = result.fetchone()
        if not booking:
            raise NotFoundException("Booking not found")
        return booking
    
    async def _get_receipt_template(self, template_id: Optional[UUID] = None) -> Any:
        """Get receipt template"""
        if template_id:
            result = await self.db.execute(
                """
                SELECT * FROM pos_receipt_templates
                WHERE id = :id AND is_active = true
                """,
                {'id': template_id}
            )
        else:
            result = await self.db.execute(
                """
                SELECT * FROM pos_receipt_templates
                WHERE is_default = true AND is_active = true
                LIMIT 1
                """
            )
        
        template = result.fetchone()
        if not template:
            # Return default template structure
            return {
                'header_template': '',
                'body_template': '',
                'footer_template': '',
                'formatting': {'width': 48}
            }
        return template
    
    async def _monitor_qr_payment(self, transaction_id: UUID, qr_code_id: str):
        """Monitor QR payment status (async task)"""
        timeout = 300  # 5 minutes
        check_interval = 5  # seconds
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check payment status from billing service
            from app.services.billing_service_enhanced import BillingServiceEnhanced
            billing_service = BillingServiceEnhanced(self.db)
            
            payment_status = await billing_service.check_qr_payment_status(qr_code_id)
            
            if payment_status['status'] == 'completed':
                # Payment received - update transaction
                await self._complete_qr_payment(transaction_id, payment_status)
                return
            
            await asyncio.sleep(check_interval)
        
        # Timeout - notify staff
        # TODO: Send notification
    
    async def _complete_qr_payment(self, transaction_id: UUID, payment_info: Dict):
        """Complete transaction after QR payment received"""
        # Create payment record
        payment_code = f"PAY-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        
        await self.db.execute(
            """
            INSERT INTO pos_payments
            (transaction_id, payment_code, payment_method, amount,
             qr_payment_id, bank_transaction_id, status, processed_at)
            VALUES (:transaction_id, :payment_code, 'qr_code', :amount,
                    :qr_payment_id, :bank_transaction_id, 'completed', NOW())
            """,
            {
                'transaction_id': transaction_id,
                'payment_code': payment_code,
                'amount': payment_info['amount'],
                'qr_payment_id': payment_info.get('qr_payment_id'),
                'bank_transaction_id': payment_info.get('reference')
            }
        )
        
        # Update transaction
        await self.db.execute(
            """
            UPDATE pos_transactions
            SET payment_status = 'completed',
                qr_paid_at = NOW(),
                status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = :id
            """,
            {'id': transaction_id}
        )
        
        await self.db.commit()
        
        # Auto-print final receipt
        await self._print_final_receipt(transaction_id)
    
    async def _print_final_receipt(self, transaction_id: UUID):
        """Print final receipt after payment"""
        # TODO: Implement actual printing
        pass
    
    async def _print_qr_payment_receipt(self, transaction: Any):
        """Print temporary bill with QR code"""
        # TODO: Implement QR receipt printing
        pass
    
    async def _send_to_printer(self, receipt_text: str, printer_id: Optional[str]) -> str:
        """Send formatted receipt to printer"""
        # TODO: Implement actual printer communication
        return "online"
    
    async def _add_to_guest_folio(self, transaction: Any):
        """Add room charge to guest folio"""
        # TODO: Integrate with billing module
        pass
    
    async def _check_void_permission(self, user_id: UUID, supervisor_pin: Optional[str]) -> bool:
        """Check if user has permission to void transaction"""
        # TODO: Implement permission check
        return True
    
    async def _process_void_refund(self, transaction: Any):
        """Process refund for voided transaction"""
        # TODO: Implement refund processing
        pass
    
    async def _get_shift_transactions(self, shift_id: UUID) -> List[Any]:
        """Get all transactions for a shift"""
        result = await self.db.execute(
            """
            SELECT * FROM pos_transactions
            WHERE shift_id = :shift_id
            ORDER BY created_at
            """,
            {'shift_id': shift_id}
        )
        return result.fetchall()
    
    async def _get_shift_cash_transactions(self, shift_id: UUID) -> List[Any]:
        """Get cash transactions for a shift"""
        result = await self.db.execute(
            """
            SELECT * FROM pos_transactions
            WHERE shift_id = :shift_id
            AND payment_method = 'cash'
            ORDER BY created_at
            """,
            {'shift_id': shift_id}
        )
        return result.fetchall()
    
    async def _get_shift_top_items(self, shift_id: UUID) -> List[Dict]:
        """Get top selling items for a shift"""
        result = await self.db.execute(
            """
            SELECT 
                pti.product_name,
                SUM(pti.quantity) as total_quantity,
                SUM(pti.total_amount) as total_revenue
            FROM pos_transaction_items pti
            JOIN pos_transactions pt ON pti.transaction_id = pt.id
            WHERE pt.shift_id = :shift_id
            AND pt.status != 'void'
            GROUP BY pti.product_name
            ORDER BY total_revenue DESC
            LIMIT 5
            """,
            {'shift_id': shift_id}
        )
        items = result.fetchall()
        
        return [
            {
                'product': item.product_name,
                'quantity': int(item.total_quantity),
                'revenue': float(item.total_revenue)
            }
            for item in items
        ]
    
    async def _get_top_products_for_date(self, date: date) -> List[Dict]:
        """Get top selling products for a date"""
        result = await self.db.execute(
            """
            SELECT 
                pti.product_name,
                SUM(pti.quantity) as total_quantity,
                SUM(pti.total_amount) as total_revenue
            FROM pos_transaction_items pti
            JOIN pos_transactions pt ON pti.transaction_id = pt.id
            WHERE DATE(pt.created_at) = :date
            AND pt.status != 'void'
            GROUP BY pti.product_name
            ORDER BY total_revenue DESC
            LIMIT 10
            """,
            {'date': date}
        )
        items = result.fetchall()
        
        return [
            {
                'name': item.product_name,
                'quantity': int(item.total_quantity),
                'revenue': float(item.total_revenue)
            }
            for item in items
        ]
    
    async def _get_shifts_for_date(self, date: date) -> List[Dict]:
        """Get shift details for a date"""
        result = await self.db.execute(
            """
            SELECT * FROM pos_shifts
            WHERE shift_date = :date
            ORDER BY opened_at
            """,
            {'date': date}
        )
        shifts = result.fetchall()
        
        details = []
        for shift in shifts:
            # Get cashier name
            cashier_result = await self.db.execute(
                """
                SELECT full_name FROM user_profiles
                WHERE id = :id
                """,
                {'id': shift.opened_by}
            )
            cashier = cashier_result.fetchone()
            
            details.append({
                'shift': shift.shift_code,
                'cashier': cashier.full_name if cashier else 'Unknown',
                'sales': float(shift.total_sales),
                'status': 'balanced' if abs(shift.cash_difference or 0) < 1 else 'discrepancy'
            })
        
        return details
    
    async def _get_payment_by_transaction(self, transaction_id: UUID) -> Any:
        """Get payment record for transaction"""
        result = await self.db.execute(
            """
            SELECT * FROM pos_payments
            WHERE transaction_id = :transaction_id
            AND status = 'completed'
            ORDER BY processed_at DESC
            LIMIT 1
            """,
            {'transaction_id': transaction_id}
        )
        return result.fetchone()
    
    # ============= Category Management =============
    
    async def get_categories(
        self, 
        is_active: Optional[bool] = True,
        is_featured: Optional[bool] = None,
        parent_id: Optional[UUID] = None
    ) -> List[POSCategoryResponse]:
        """Get POS categories with filters"""
        try:
            query = self.db.table('pos_categories').select('*')
            
            if is_active is not None:
                query = query.eq('is_active', is_active)
            
            if is_featured is not None:
                query = query.eq('is_featured', is_featured)
            
            if parent_id is not None:
                query = query.eq('parent_id', str(parent_id))
            
            result = query.order('display_order').order('category_name').execute()
            
            if result.data:
                return [POSCategoryResponse(**cat) for cat in result.data]
            return []
        except Exception as e:
            print(f"Error getting categories: {e}")
            return []
    
    async def create_category(
        self,
        request: POSCategoryCreate,
        created_by: UUID
    ) -> POSCategoryResponse:
        """Create new POS category"""
        category_id = str(uuid.uuid4())
        
        data = {
            'id': category_id,
            'category_name': request.category_name,
            'description': request.description,
            'icon': request.icon,
            'color': request.color,
            'parent_id': str(request.parent_id) if request.parent_id else None,
            'display_order': request.display_order or 0,
            'is_featured': request.is_featured or False,
            'is_active': request.is_active if request.is_active is not None else True,
            'created_by': str(created_by),
            'created_at': datetime.now().isoformat()
        }
        
        result = self.db.table('pos_categories').insert(data).execute()
        
        if result.data:
            return POSCategoryResponse(**result.data[0])
        raise BusinessRuleException("Failed to create category")
    
    async def get_quick_products(
        self,
        category_id: Optional[UUID] = None,
        is_available: Optional[bool] = True
    ) -> List[QuickProductResponse]:
        """Get quick access products"""
        try:
            query = self.db.table('quick_products').select('*')
            
            if category_id:
                query = query.eq('category', str(category_id))
            
            if is_available is not None:
                query = query.eq('is_available', is_available)
            
            result = query.order('display_order').order('name').execute()
            
            if result.data:
                return [QuickProductResponse(**prod) for prod in result.data]
            return []
        except Exception as e:
            print(f"Error getting quick products: {e}")
            return []