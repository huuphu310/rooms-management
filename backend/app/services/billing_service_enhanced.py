import hashlib
import hmac
import json
import re
import requests
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID, uuid4
from decimal import Decimal
from supabase import Client

from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
    BusinessRuleException
)
from app.schemas.billing_enhanced import *


class BillingServiceEnhanced:
    def __init__(self, db: Client, redis_client=None):
        self.db = db
        self.redis_client = redis_client
        self.vat_rate = Decimal("10")  # Default VAT rate 10%
        
        # SEAPay Configuration
        self.seapay_config = {
            'vietqr_client_id': 'your_client_id',
            'vietqr_api_key': 'your_api_key',
            'bank_code': '970436',  # Vietcombank
            'bank_account': '1234567890',
            'account_holder': 'HOMESTAY ABC',
            'webhook_secret': 'your_webhook_secret',
            'qr_expiry_minutes': 30,
            'payment_tolerance': Decimal("1000")  # Accept ±1000 VND difference
        }

    # Invoice Management
    async def create_deposit_invoice(self, deposit_data: CreateDepositInvoice) -> InvoiceResponse:
        """Create deposit invoice for booking"""
        
        # Verify booking exists and doesn't have deposit invoice
        booking = await self._get_booking(deposit_data.booking_id)
        existing_deposit = self.db.table("billing_invoices")\
            .select("id")\
            .eq("booking_id", str(deposit_data.booking_id))\
            .eq("invoice_type", "deposit")\
            .execute()
            
        if existing_deposit.data:
            raise ConflictException("Booking already has deposit invoice")

        # Calculate deposit amount
        deposit_amount = await self._calculate_deposit_amount(
            booking, 
            deposit_data.deposit_calculation
        )

        # Generate invoice number
        invoice_number = await self._generate_invoice_number("deposit")

        # Create invoice
        invoice_data = {
            "invoice_number": invoice_number,
            "invoice_type": "deposit",
            "booking_id": str(deposit_data.booking_id),
            "customer_id": str(booking.get("customer_id")) if booking.get("customer_id") else None,
            "currency": "VND",
            "subtotal": float(deposit_amount),
            "service_charge": 0,
            "tax_rate": float(self.vat_rate),
            "tax_amount": float(deposit_amount * self.vat_rate / 100),
            "discount_amount": 0,
            "total_amount": float(deposit_amount * (1 + self.vat_rate / 100)),
            "invoice_date": deposit_data.due_date.isoformat() if hasattr(deposit_data.due_date, 'isoformat') else str(deposit_data.due_date),
            "due_date": deposit_data.due_date.isoformat() if hasattr(deposit_data.due_date, 'isoformat') else str(deposit_data.due_date),
            "status": "pending",
            "notes": deposit_data.notes,
            "payment_terms": deposit_data.payment_terms or "Payment required within 48 hours to secure reservation"
        }

        result = self.db.table("billing_invoices").insert(invoice_data).execute()
        
        if not result.data:
            raise ValidationException("Failed to create invoice")

        invoice_id = result.data[0]["id"]

        # Create invoice item for deposit
        item_data = {
            "invoice_id": invoice_id,
            "item_type": "custom",
            "description": f"Deposit for booking {booking.get('booking_code', '')}",
            "quantity": 1,
            "unit": "deposit",
            "unit_price": float(deposit_amount),
            "tax_rate": float(self.vat_rate),
            "tax_amount": float(deposit_amount * self.vat_rate / 100),
            "total_amount": float(deposit_amount * (1 + self.vat_rate / 100)),
            "sort_order": 1
        }

        self.db.table("billing_invoice_items").insert(item_data).execute()

        # Update booking status
        self.db.table("bookings")\
            .update({"status": "pending_deposit"})\
            .eq("id", str(deposit_data.booking_id))\
            .execute()

        return await self.get_invoice(UUID(invoice_id))

    async def create_partial_invoice(self, partial_data: CreatePartialInvoice) -> InvoiceResponse:
        """Create partial payment invoice"""
        
        booking = await self._get_booking(partial_data.booking_id)
        
        # Calculate total amount
        subtotal = sum(item.amount for item in partial_data.items)
        tax_amount = subtotal * self.vat_rate / 100
        total_amount = subtotal + tax_amount

        # Generate invoice number
        invoice_number = await self._generate_invoice_number("partial")

        # Create invoice
        invoice_data = {
            "invoice_number": invoice_number,
            "invoice_type": partial_data.invoice_type,
            "booking_id": str(partial_data.booking_id),
            "customer_id": str(booking.get("customer_id")) if booking.get("customer_id") else None,
            "currency": "VND",
            "subtotal": float(subtotal),
            "service_charge": 0,
            "tax_rate": float(self.vat_rate),
            "tax_amount": float(tax_amount),
            "discount_amount": 0,
            "total_amount": float(total_amount),
            "invoice_date": date.today().isoformat(),
            "due_date": partial_data.due_date.isoformat() if hasattr(partial_data.due_date, 'isoformat') else str(partial_data.due_date),
            "status": "pending",
            "notes": partial_data.notes
        }

        result = self.db.table("billing_invoices").insert(invoice_data).execute()
        invoice_id = result.data[0]["id"]

        # Create invoice items
        for i, item in enumerate(partial_data.items):
            item_tax = item.amount * self.vat_rate / 100
            item_total = item.amount + item_tax
            
            item_data = {
                "invoice_id": invoice_id,
                "item_type": item.item_type,
                "description": item.description,
                "quantity": 1,
                "unit": "payment",
                "unit_price": float(item.amount),
                "tax_rate": float(self.vat_rate),
                "tax_amount": float(item_tax),
                "total_amount": float(item_total),
                "sort_order": i + 1
            }
            
            self.db.table("billing_invoice_items").insert(item_data).execute()

        return await self.get_invoice(UUID(invoice_id))

    async def get_invoice(self, invoice_id: UUID) -> InvoiceResponse:
        """Get invoice by ID with items"""
        result = self.db.table("billing_invoices")\
            .select("*, billing_invoice_items(*)")\
            .eq("id", str(invoice_id))\
            .execute()
            
        if not result.data:
            raise NotFoundException(f"Invoice {invoice_id} not found")

        invoice_data = result.data[0]
        return self._format_invoice_response(invoice_data)

    async def get_invoices(self, params: InvoiceSearchParams) -> List[InvoiceResponse]:
        """Get invoices with filtering"""
        query = self.db.table("billing_invoices").select("*, billing_invoice_items(*)")
        
        if params.booking_id:
            query = query.eq("booking_id", str(params.booking_id))
        if params.customer_id:
            query = query.eq("customer_id", str(params.customer_id))
        if params.invoice_type:
            query = query.eq("invoice_type", params.invoice_type)
        if params.status:
            query = query.eq("status", params.status)
        if params.date_from:
            query = query.gte("invoice_date", params.date_from.isoformat())
        if params.date_to:
            query = query.lte("invoice_date", params.date_to.isoformat())
        if params.search:
            query = query.ilike("invoice_number", f"%{params.search}%")

        # Order and pagination
        query = query.order(params.sort_by, desc=(params.order == "desc"))
        query = query.range((params.page - 1) * params.limit, params.page * params.limit - 1)

        result = query.execute()
        return [self._format_invoice_response(invoice) for invoice in result.data]

    # Payment Processing
    async def process_payment(self, payment_data: ProcessPayment) -> List[PaymentResponse]:
        """Process payment for invoice"""
        
        invoice = await self.get_invoice(payment_data.invoice_id)
        
        # Validate total payment doesn't exceed balance due
        total_payment = sum(p.amount for p in payment_data.payments)
        if total_payment > invoice.balance_due:
            raise ValidationException("Payment exceeds balance due")

        payments = []
        for payment_item in payment_data.payments:
            # Generate payment code
            payment_code = await self._generate_payment_code()
            
            payment_create = PaymentCreate(
                invoice_id=payment_data.invoice_id,
                booking_id=payment_data.booking_id,
                amount=payment_item.amount,
                payment_method=payment_item.payment_method,
                payment_details=payment_item.payment_details,
                payment_category=PaymentCategory.PARTIAL if invoice.invoice_type != InvoiceType.DEPOSIT else PaymentCategory.DEPOSIT,
                is_deposit=(invoice.invoice_type == InvoiceType.DEPOSIT)
            )
            
            payment = await self.create_payment(payment_code, payment_create)
            payments.append(payment)

        # Update invoice payment status
        await self._update_invoice_payment_status(payment_data.invoice_id)
        
        # Check booking payment completion
        await self._check_booking_payment_completion(payment_data.booking_id)

        return payments

    async def create_payment(self, payment_code: str, payment_data: PaymentCreate) -> PaymentResponse:
        """Create payment record"""
        
        payment_record = {
            "payment_code": payment_code,
            "invoice_id": str(payment_data.invoice_id) if payment_data.invoice_id else None,
            "booking_id": str(payment_data.booking_id),
            "amount": float(payment_data.amount),
            "currency": payment_data.currency,
            "payment_method": payment_data.payment_method,
            "payment_details": payment_data.payment_details,
            "payment_category": payment_data.payment_category,
            "is_deposit": payment_data.is_deposit,
            "is_refund": payment_data.is_refund,
            "refund_reason": payment_data.refund_reason,
            "original_payment_id": str(payment_data.original_payment_id) if payment_data.original_payment_id else None,
            "payment_status": "completed",
            "payment_date": datetime.now().isoformat(),
            "notes": payment_data.notes
        }

        result = self.db.table("billing_payments").insert(payment_record).execute()
        
        if not result.data:
            raise ValidationException("Failed to create payment")

        return self._format_payment_response(result.data[0])

    async def record_deposit_payment(self, deposit_data: RecordDepositPayment) -> PaymentResponse:
        """Record deposit payment"""
        
        # Find booking's deposit invoice
        deposit_invoice = self.db.table("billing_invoices")\
            .select("*")\
            .eq("booking_id", str(deposit_data.booking_id))\
            .eq("invoice_type", "deposit")\
            .execute()
            
        if not deposit_invoice.data:
            raise NotFoundException("No deposit invoice found for booking")

        invoice_id = deposit_invoice.data[0]["id"]
        payment_code = await self._generate_payment_code()

        payment_create = PaymentCreate(
            invoice_id=UUID(invoice_id),
            booking_id=deposit_data.booking_id,
            amount=deposit_data.amount,
            payment_method=deposit_data.payment_method,
            payment_details=deposit_data.payment_details,
            reference_number=deposit_data.reference_number,
            payment_category=PaymentCategory.DEPOSIT,
            is_deposit=True,
            notes=deposit_data.notes
        )

        payment = await self.create_payment(payment_code, payment_create)

        # Update invoice and booking status
        await self._update_invoice_payment_status(UUID(invoice_id))
        await self._check_booking_payment_completion(deposit_data.booking_id)

        return payment

    # Payment Summary
    async def get_booking_payment_summary(self, booking_id: UUID) -> BookingPaymentSummary:
        """Get comprehensive payment summary for booking"""
        
        booking = await self._get_booking(booking_id)
        
        # Get all invoices
        invoices = await self.get_invoices(
            InvoiceSearchParams(booking_id=booking_id, limit=100)
        )
        
        # Get all payments
        payments = await self.get_payments(
            PaymentSearchParams(booking_id=booking_id, limit=100)
        )
        
        # Get payment schedules
        schedules = await self.get_payment_schedules(booking_id)

        # Calculate summary
        total_booking_amount = Decimal(booking.get("total_amount", 0))
        total_invoiced = sum(inv.total_amount for inv in invoices)
        total_paid = sum(pay.amount for pay in payments if not pay.is_refund)
        total_refunded = sum(pay.amount for pay in payments if pay.is_refund)
        total_pending = total_invoiced - total_paid + total_refunded
        total_remaining = total_booking_amount - total_invoiced
        
        payment_progress = (float(total_paid) / float(total_booking_amount)) * 100 if total_booking_amount > 0 else 0

        summary = PaymentSummary(
            total_booking_amount=total_booking_amount,
            total_invoiced=total_invoiced,
            total_paid=total_paid,
            total_pending=total_pending,
            total_remaining=total_remaining,
            payment_progress_percentage=payment_progress,
            is_fully_paid=(total_paid >= total_booking_amount)
        )

        booking_info = BookingInfo(
            id=booking_id,
            booking_code=booking.get("booking_code", ""),
            total_amount=total_booking_amount,
            status=booking.get("status", "")
        )

        return BookingPaymentSummary(
            booking=booking_info,
            payment_summary=summary,
            invoices=invoices,
            payments=payments,
            payment_schedule=schedules
        )

    # QR Code Payment Integration
    async def generate_qr_code(self, qr_data: GenerateQRCode) -> QRCodeResponse:
        """Generate VietQR code for payment"""
        
        booking = await self._get_booking(qr_data.booking_id)
        
        # Generate unique QR code ID
        qr_code_id = self._generate_qr_id()
        
        # Create transfer content
        transfer_content = f"{booking.get('booking_code', '')}-{qr_code_id}"
        
        # Generate QR code via VietQR API
        qr_result = await self._call_vietqr_api(
            qr_data.amount,
            transfer_content,
            self.seapay_config
        )
        
        # Calculate expiry time
        expires_at = datetime.now() + timedelta(minutes=qr_data.expiry_minutes)
        
        # Store QR payment record
        qr_payment_data = {
            "qr_code_id": qr_code_id,
            "qr_code_url": qr_result.get("qr_code_url"),
            "invoice_id": str(qr_data.invoice_id),
            "booking_id": str(qr_data.booking_id),
            "bank_account": self.seapay_config['bank_account'],
            "bank_name": "Vietcombank",
            "account_holder": self.seapay_config['account_holder'],
            "expected_amount": float(qr_data.amount),
            "currency": "VND",
            "status": "pending",
            "qr_generated_at": datetime.now().isoformat(),
            "expires_at": expires_at.isoformat()
        }
        
        result = self.db.table("billing_qr_payments").insert(qr_payment_data).execute()
        qr_payment_id = result.data[0]["id"]
        
        payment_info = QRPaymentInfo(
            bank="Vietcombank",
            account_number=self.seapay_config['bank_account'],
            account_holder=self.seapay_config['account_holder'],
            amount=qr_data.amount,
            transfer_content=transfer_content,
            qr_code_id=qr_code_id
        )
        
        return QRCodeResponse(
            qr_payment_id=UUID(qr_payment_id),
            qr_code_url=qr_result.get("qr_code_url", ""),
            qr_code_data=qr_result.get("qr_code_data", ""),
            payment_info=payment_info,
            expires_at=expires_at
        )

    async def process_seapay_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, str]:
        """Process SEAPay webhook for bank transfer notifications"""
        
        # Verify webhook signature
        signature = webhook_data.get("signature", "")
        if not self._verify_seapay_signature(webhook_data, signature):
            raise ValidationException("Invalid webhook signature")
        
        # Log webhook for auditing
        webhook_log = {
            "webhook_id": webhook_data.get("id"),
            "event_type": webhook_data.get("event"),
            "transaction_id": webhook_data["data"]["transaction_id"],
            "account_number": webhook_data["data"]["account_number"],
            "amount": float(webhook_data["data"]["amount"]),
            "transaction_content": webhook_data["data"]["content"],
            "transaction_date": webhook_data["data"]["transaction_date"],
            "payload": webhook_data,
            "is_valid_signature": True,
            "processed": False
        }
        
        self.db.table("billing_seapay_webhooks").insert(webhook_log).execute()
        
        # Extract QR code from transfer content
        transaction_content = webhook_data["data"]["content"]
        qr_code_id = self._extract_qr_code_from_content(transaction_content)
        
        if not qr_code_id:
            return {"status": "no_match", "message": "No QR code found in transaction content"}
        
        # Find matching QR payment
        qr_payment = self.db.table("billing_qr_payments")\
            .select("*")\
            .eq("qr_code_id", qr_code_id)\
            .eq("status", "pending")\
            .execute()
        
        if not qr_payment.data:
            return {"status": "no_match", "message": "No matching QR payment found"}
        
        qr_payment_record = qr_payment.data[0]
        received_amount = Decimal(webhook_data["data"]["amount"])
        expected_amount = Decimal(qr_payment_record["expected_amount"])
        
        # Determine payment status based on amount comparison
        status = self._determine_qr_payment_status(received_amount, expected_amount)
        
        # Update QR payment record
        update_data = {
            "received_amount": float(received_amount),
            "bank_transaction_id": webhook_data["data"]["transaction_id"],
            "transaction_content": transaction_content,
            "matched_code": qr_code_id,
            "sender_account": webhook_data["data"].get("sender_account"),
            "sender_name": webhook_data["data"].get("sender_name"),
            "status": status,
            "payment_received_at": datetime.now().isoformat(),
            "webhook_payload": webhook_data
        }
        
        self.db.table("billing_qr_payments")\
            .update(update_data)\
            .eq("id", qr_payment_record["id"])\
            .execute()
        
        # Process payment based on status
        if status == "matched":
            await self._process_successful_qr_payment(qr_payment_record, webhook_data)
        elif status == "overpaid":
            await self._process_overpayment(qr_payment_record, webhook_data)
        elif status == "underpaid":
            await self._process_underpayment(qr_payment_record, webhook_data)
        
        return {"status": "processed", "payment_status": status}

    async def get_qr_payment_status(self, qr_payment_id: UUID) -> QRStatusResponse:
        """Get QR payment status"""
        
        result = self.db.table("billing_qr_payments")\
            .select("*")\
            .eq("id", str(qr_payment_id))\
            .execute()
        
        if not result.data:
            raise NotFoundException("QR payment not found")
        
        qr_payment = result.data[0]
        
        # Get associated invoice status
        invoice = self.db.table("billing_invoices")\
            .select("status")\
            .eq("id", qr_payment["invoice_id"])\
            .execute()
        
        invoice_status = invoice.data[0]["status"] if invoice.data else "unknown"
        
        payment_details = {
            "expected_amount": qr_payment["expected_amount"],
            "received_amount": qr_payment["received_amount"],
            "amount_difference": qr_payment.get("amount_difference", 0),
            "is_exact_match": qr_payment["status"] == "matched"
        }
        
        transaction = None
        if qr_payment["bank_transaction_id"]:
            transaction = {
                "bank_transaction_id": qr_payment["bank_transaction_id"],
                "sender_name": qr_payment["sender_name"],
                "payment_received_at": qr_payment["payment_received_at"]
            }
        
        return QRStatusResponse(
            qr_payment_id=qr_payment_id,
            status=QRPaymentStatus(qr_payment["status"]),
            payment_details=payment_details,
            transaction=transaction,
            invoice_status=InvoiceStatus(invoice_status)
        )

    # Payment Schedules
    async def create_payment_schedule(self, schedule_data: CreatePaymentSchedule) -> List[PaymentScheduleResponse]:
        """Create payment schedule for booking"""
        
        booking = await self._get_booking(schedule_data.booking_id)
        total_amount = Decimal(booking.get("total_amount", 0))
        
        schedules = []
        
        if schedule_data.auto_generate and schedule_data.schedule_config:
            schedules = await self._generate_auto_schedule(
                schedule_data.booking_id,
                total_amount,
                schedule_data.schedule_config,
                booking
            )
        elif schedule_data.custom_schedule:
            schedules = await self._create_custom_schedule(
                schedule_data.booking_id,
                total_amount,
                schedule_data.custom_schedule,
                booking
            )
        
        return schedules

    async def get_payment_schedules(self, booking_id: UUID) -> List[PaymentScheduleResponse]:
        """Get payment schedules for booking"""
        
        result = self.db.table("billing_payment_schedules")\
            .select("*")\
            .eq("booking_id", str(booking_id))\
            .order("schedule_number")\
            .execute()
        
        return [self._format_schedule_response(schedule) for schedule in result.data]

    # Refunds
    async def process_refund(self, payment_id: UUID, refund_data: ProcessRefund) -> PaymentResponse:
        """Process payment refund"""
        
        # Get original payment
        original_payment = self.db.table("billing_payments")\
            .select("*")\
            .eq("id", str(payment_id))\
            .execute()
        
        if not original_payment.data:
            raise NotFoundException("Original payment not found")
        
        payment_record = original_payment.data[0]
        
        # Validate refund amount
        if refund_data.refund_amount > Decimal(payment_record["amount"]):
            raise ValidationException("Refund amount exceeds original payment")
        
        # Check approval if required (example: amounts > 1,000,000 VND)
        if refund_data.refund_amount > 1000000 and not refund_data.approval:
            raise ValidationException("Approval required for large refunds")
        
        # Create refund payment
        refund_code = await self._generate_payment_code("RF")
        
        refund_payment = PaymentCreate(
            invoice_id=UUID(payment_record["invoice_id"]) if payment_record["invoice_id"] else None,
            booking_id=UUID(payment_record["booking_id"]),
            amount=refund_data.refund_amount,
            payment_method=PaymentMethod(payment_record["payment_method"]),
            payment_category=PaymentCategory.REFUND,
            is_refund=True,
            refund_reason=refund_data.refund_reason,
            original_payment_id=payment_id,
            notes=f"Refund for payment {payment_record['payment_code']}"
        )
        
        refund = await self.create_payment(refund_code, refund_payment)
        
        # Update original payment and invoice status
        if payment_record["invoice_id"]:
            await self._update_invoice_payment_status(UUID(payment_record["invoice_id"]))
        
        return refund

    # Reports
    async def get_revenue_report(self, date_from: date, date_to: date) -> RevenueReport:
        """Generate revenue report"""
        
        # Get invoices in date range
        invoices = self.db.table("billing_invoices")\
            .select("*")\
            .gte("invoice_date", date_from.isoformat())\
            .lte("invoice_date", date_to.isoformat())\
            .execute()
        
        # Get payments in date range
        payments = self.db.table("billing_payments")\
            .select("*")\
            .gte("payment_date", date_from.isoformat())\
            .lte("payment_date", date_to.isoformat())\
            .execute()
        
        # Calculate summary
        total_invoiced = sum(Decimal(inv["total_amount"]) for inv in invoices.data)
        total_collected = sum(Decimal(pay["amount"]) for pay in payments.data if not pay["is_refund"])
        total_refunded = sum(Decimal(pay["amount"]) for pay in payments.data if pay["is_refund"])
        total_pending = sum(Decimal(inv["balance_due"]) for inv in invoices.data)
        total_overdue = sum(Decimal(inv["balance_due"]) for inv in invoices.data 
                          if inv["status"] == "overdue")
        
        collection_rate = (float(total_collected) / float(total_invoiced)) * 100 if total_invoiced > 0 else 0
        
        summary = RevenueSummary(
            total_invoiced=total_invoiced,
            total_collected=total_collected - total_refunded,
            total_pending=total_pending,
            total_overdue=total_overdue,
            collection_rate=collection_rate
        )
        
        # Revenue by payment method
        by_method = RevenueByMethod(
            cash=sum(Decimal(p["amount"]) for p in payments.data if p["payment_method"] == "cash"),
            bank_transfer=sum(Decimal(p["amount"]) for p in payments.data if p["payment_method"] == "bank_transfer"),
            credit_card=sum(Decimal(p["amount"]) for p in payments.data if p["payment_method"] == "credit_card"),
            e_wallet=sum(Decimal(p["amount"]) for p in payments.data if p["payment_method"] == "e_wallet"),
            other=sum(Decimal(p["amount"]) for p in payments.data if p["payment_method"] not in ["cash", "bank_transfer", "credit_card", "e_wallet"])
        )
        
        # Revenue by invoice type
        by_type = RevenueByType(
            deposit=sum(Decimal(inv["total_amount"]) for inv in invoices.data if inv["invoice_type"] == "deposit"),
            partial=sum(Decimal(inv["total_amount"]) for inv in invoices.data if inv["invoice_type"] == "partial"),
            final=sum(Decimal(inv["total_amount"]) for inv in invoices.data if inv["invoice_type"] == "final"),
            additional=sum(Decimal(inv["total_amount"]) for inv in invoices.data if inv["invoice_type"] == "additional")
        )
        
        # Outstanding bookings (simplified - would need join with bookings table)
        outstanding = []
        
        return RevenueReport(
            period={"from": date_from.isoformat(), "to": date_to.isoformat()},
            summary=summary,
            by_payment_method=by_method,
            by_invoice_type=by_type,
            outstanding_bookings=outstanding
        )

    # Helper Methods
    async def _get_booking(self, booking_id: UUID) -> Dict[str, Any]:
        """Get booking by ID"""
        result = self.db.table("bookings").select("*").eq("id", str(booking_id)).execute()
        if not result.data:
            raise NotFoundException(f"Booking {booking_id} not found")
        return result.data[0]

    async def _calculate_deposit_amount(self, booking: Dict[str, Any], calculation: DepositCalculation) -> Decimal:
        """Calculate deposit amount based on rules"""
        total_amount = Decimal(booking.get("total_amount", 0))
        
        if calculation.override_amount:
            return calculation.override_amount
        
        if calculation.method == DepositCalculationType.PERCENTAGE:
            return total_amount * (calculation.value / 100) if calculation.value else total_amount * Decimal("0.3")
        elif calculation.method == DepositCalculationType.FIXED_AMOUNT:
            return calculation.value or Decimal("1000000")
        elif calculation.method == DepositCalculationType.NIGHTS_BASED:
            # Simplified calculation - would need room rates
            nights = calculation.value or 2
            return total_amount / Decimal(booking.get("total_nights", 1)) * nights
        
        return total_amount * Decimal("0.3")  # Default 30%

    async def _generate_invoice_number(self, invoice_type: str) -> str:
        """Generate unique invoice number"""
        prefix = "INV"
        if invoice_type == "deposit":
            prefix = "DEP"
        elif invoice_type == "partial":
            prefix = "PAR"
        
        timestamp = datetime.now().strftime("%Y%m%d")
        
        # Get count of invoices today
        today = date.today()
        count_result = self.db.table("billing_invoices")\
            .select("id", count="exact")\
            .gte("created_at", f"{today}T00:00:00")\
            .lt("created_at", f"{today}T23:59:59")\
            .execute()
        
        count = (count_result.count or 0) + 1
        
        return f"{prefix}-{timestamp}-{count:04d}"

    async def _generate_payment_code(self, prefix: str = "PAY") -> str:
        """Generate unique payment code"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"{prefix}-{timestamp}"

    def _generate_qr_id(self) -> str:
        """Generate unique QR code ID"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        hash_obj = hashlib.md5(timestamp.encode())
        return f"QR{hash_obj.hexdigest()[:6].upper()}"

    async def _call_vietqr_api(self, amount: Decimal, content: str, config: Dict[str, str]) -> Dict[str, str]:
        """Call VietQR API to generate QR code"""
        # Simplified mock implementation
        return {
            "qr_code_url": f"https://api.vietqr.io/image/{config['bank_account']}/{amount}/{content}",
            "qr_code_data": f"VietQR_data_for_{amount}_{content}"
        }

    def _verify_seapay_signature(self, payload: Dict[str, Any], signature: str) -> bool:
        """Verify SEAPay webhook signature"""
        payload_str = json.dumps(payload, separators=(',', ':'))
        expected_signature = hmac.new(
            self.seapay_config['webhook_secret'].encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)

    def _extract_qr_code_from_content(self, content: str) -> Optional[str]:
        """Extract QR code ID from transfer content"""
        patterns = [
            r'QR[A-Z0-9]{6}',
            r'-([A-Z]{2}[0-9]{6})',
            r'([A-Z]{2}[0-9]{6})[\s\-]',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content.upper())
            if match:
                return match.group(1) if match.groups() else match.group(0)
        
        return None

    def _determine_qr_payment_status(self, received: Decimal, expected: Decimal) -> str:
        """Determine QR payment status based on amounts"""
        tolerance = self.seapay_config['payment_tolerance']
        difference = abs(received - expected)
        
        if difference <= tolerance:
            return "matched"
        elif received > expected:
            return "overpaid"
        elif received < expected:
            return "underpaid"
        else:
            return "failed"

    async def _update_invoice_payment_status(self, invoice_id: UUID):
        """Update invoice payment status based on payments"""
        # Get all payments for invoice
        payments = self.db.table("billing_payments")\
            .select("amount, is_refund")\
            .eq("invoice_id", str(invoice_id))\
            .execute()
        
        total_paid = sum(
            Decimal(p["amount"]) for p in payments.data 
            if not p["is_refund"]
        ) - sum(
            Decimal(p["amount"]) for p in payments.data 
            if p["is_refund"]
        )
        
        # Get invoice
        invoice = self.db.table("billing_invoices")\
            .select("total_amount")\
            .eq("id", str(invoice_id))\
            .execute()
        
        if invoice.data:
            total_amount = Decimal(invoice.data[0]["total_amount"])
            
            if total_paid >= total_amount:
                status = "paid"
                paid_date = datetime.now().isoformat()
            elif total_paid > 0:
                status = "partial"
                paid_date = None
            else:
                status = "pending"
                paid_date = None
            
            self.db.table("billing_invoices")\
                .update({
                    "paid_amount": float(total_paid),
                    "status": status,
                    "paid_date": paid_date
                })\
                .eq("id", str(invoice_id))\
                .execute()

    async def _check_booking_payment_completion(self, booking_id: UUID):
        """Check if booking is fully paid and update status"""
        summary = await self.get_booking_payment_summary(booking_id)
        
        if summary.payment_summary.is_fully_paid:
            self.db.table("bookings")\
                .update({"status": "fully_paid"})\
                .eq("id", str(booking_id))\
                .execute()

    async def _process_successful_qr_payment(self, qr_payment: Dict[str, Any], webhook_data: Dict[str, Any]):
        """Process successful QR payment"""
        # Create payment record
        payment_code = await self._generate_payment_code()
        
        payment_create = PaymentCreate(
            invoice_id=UUID(qr_payment["invoice_id"]),
            booking_id=UUID(qr_payment["booking_id"]),
            amount=Decimal(qr_payment["received_amount"]),
            payment_method=PaymentMethod.BANK_TRANSFER,
            payment_details={
                "bank_transaction_id": webhook_data["data"]["transaction_id"],
                "sender_name": webhook_data["data"].get("sender_name"),
                "qr_code_id": qr_payment["qr_code_id"]
            },
            payment_category=PaymentCategory.PARTIAL,
            reference_number=webhook_data["data"]["transaction_id"],
            notes=f"QR payment via {qr_payment['qr_code_id']}"
        )
        
        await self.create_payment(payment_code, payment_create)
        
        # Update invoice and booking status
        await self._update_invoice_payment_status(UUID(qr_payment["invoice_id"]))
        await self._check_booking_payment_completion(UUID(qr_payment["booking_id"]))

    async def _process_overpayment(self, qr_payment: Dict[str, Any], webhook_data: Dict[str, Any]):
        """Handle overpayment scenario"""
        # Process payment for expected amount
        await self._process_successful_qr_payment(qr_payment, webhook_data)
        
        # Log overpayment for manual handling
        excess_amount = Decimal(qr_payment["received_amount"]) - Decimal(qr_payment["expected_amount"])
        
        # Could create credit record or notify finance team
        print(f"Overpayment detected: {excess_amount} VND for booking {qr_payment['booking_id']}")

    async def _process_underpayment(self, qr_payment: Dict[str, Any], webhook_data: Dict[str, Any]):
        """Handle underpayment scenario"""
        # Process partial payment
        payment_code = await self._generate_payment_code()
        
        payment_create = PaymentCreate(
            invoice_id=UUID(qr_payment["invoice_id"]),
            booking_id=UUID(qr_payment["booking_id"]),
            amount=Decimal(qr_payment["received_amount"]),
            payment_method=PaymentMethod.BANK_TRANSFER,
            payment_details={
                "bank_transaction_id": webhook_data["data"]["transaction_id"],
                "sender_name": webhook_data["data"].get("sender_name"),
                "qr_code_id": qr_payment["qr_code_id"],
                "underpayment": True
            },
            payment_category=PaymentCategory.PARTIAL,
            reference_number=webhook_data["data"]["transaction_id"],
            notes=f"Partial QR payment via {qr_payment['qr_code_id']}"
        )
        
        await self.create_payment(payment_code, payment_create)
        
        # Update invoice status (will show as partial)
        await self._update_invoice_payment_status(UUID(qr_payment["invoice_id"]))
        
        # Could create additional invoice for shortage amount
        shortage = Decimal(qr_payment["expected_amount"]) - Decimal(qr_payment["received_amount"])
        print(f"Underpayment: {shortage} VND shortage for booking {qr_payment['booking_id']}")

    def _format_invoice_response(self, invoice_data: Dict[str, Any]) -> InvoiceResponse:
        """Format invoice data to response model"""
        items = [
            InvoiceItemResponse(**item) 
            for item in invoice_data.get("billing_invoice_items", [])
        ]
        
        return InvoiceResponse(
            id=UUID(invoice_data["id"]),
            invoice_number=invoice_data["invoice_number"],
            invoice_type=InvoiceType(invoice_data["invoice_type"]),
            booking_id=UUID(invoice_data["booking_id"]),
            customer_id=UUID(invoice_data["customer_id"]) if invoice_data["customer_id"] else None,
            currency=invoice_data["currency"],
            subtotal=Decimal(invoice_data["subtotal"]),
            service_charge=Decimal(invoice_data["service_charge"]),
            tax_rate=Decimal(invoice_data["tax_rate"]),
            tax_amount=Decimal(invoice_data["tax_amount"]),
            discount_amount=Decimal(invoice_data["discount_amount"]),
            discount_reason=invoice_data["discount_reason"],
            total_amount=Decimal(invoice_data["total_amount"]),
            paid_amount=Decimal(invoice_data.get("paid_amount", 0)),
            balance_due=Decimal(invoice_data.get("balance_due", invoice_data["total_amount"])),
            status=InvoiceStatus(invoice_data["status"]),
            invoice_date=datetime.fromisoformat(invoice_data["invoice_date"]).date(),
            due_date=datetime.fromisoformat(invoice_data["due_date"]).date(),
            paid_date=datetime.fromisoformat(invoice_data["paid_date"]) if invoice_data.get("paid_date") else None,
            notes=invoice_data["notes"],
            internal_notes=invoice_data["internal_notes"],
            payment_terms=invoice_data["payment_terms"],
            items=items,
            created_by=UUID(invoice_data["created_by"]) if invoice_data.get("created_by") else None,
            created_at=datetime.fromisoformat(invoice_data["created_at"]),
            updated_at=datetime.fromisoformat(invoice_data["updated_at"])
        )

    def _format_payment_response(self, payment_data: Dict[str, Any]) -> PaymentResponse:
        """Format payment data to response model"""
        return PaymentResponse(
            id=UUID(payment_data["id"]),
            payment_code=payment_data["payment_code"],
            invoice_id=UUID(payment_data["invoice_id"]) if payment_data["invoice_id"] else None,
            booking_id=UUID(payment_data["booking_id"]),
            amount=Decimal(payment_data["amount"]),
            currency=payment_data["currency"],
            payment_method=PaymentMethod(payment_data["payment_method"]),
            payment_details=payment_data["payment_details"],
            reference_number=payment_data["reference_number"],
            payment_date=datetime.fromisoformat(payment_data["payment_date"]),
            payment_status=PaymentStatus(payment_data["payment_status"]),
            payment_category=PaymentCategory(payment_data["payment_category"]),
            is_deposit=payment_data["is_deposit"],
            is_refund=payment_data["is_refund"],
            refund_reason=payment_data["refund_reason"],
            original_payment_id=UUID(payment_data["original_payment_id"]) if payment_data["original_payment_id"] else None,
            notes=payment_data["notes"],
            received_by=UUID(payment_data["received_by"]) if payment_data.get("received_by") else None,
            created_at=datetime.fromisoformat(payment_data["created_at"]),
            updated_at=datetime.fromisoformat(payment_data["updated_at"])
        )

    def _format_schedule_response(self, schedule_data: Dict[str, Any]) -> PaymentScheduleResponse:
        """Format schedule data to response model"""
        return PaymentScheduleResponse(
            id=UUID(schedule_data["id"]),
            booking_id=UUID(schedule_data["booking_id"]),
            schedule_number=schedule_data["schedule_number"],
            description=schedule_data["description"],
            amount=Decimal(schedule_data["amount"]),
            due_date=datetime.fromisoformat(schedule_data["due_date"]).date(),
            status=ScheduleStatus(schedule_data["status"]),
            invoice_id=UUID(schedule_data["invoice_id"]) if schedule_data["invoice_id"] else None,
            paid_date=datetime.fromisoformat(schedule_data["paid_date"]) if schedule_data.get("paid_date") else None,
            reminder_sent=schedule_data.get("reminder_sent", False),
            reminder_sent_at=datetime.fromisoformat(schedule_data["reminder_sent_at"]) if schedule_data.get("reminder_sent_at") else None,
            notes=schedule_data["notes"],
            created_by=UUID(schedule_data["created_by"]) if schedule_data.get("created_by") else None,
            created_at=datetime.fromisoformat(schedule_data["created_at"]),
            updated_at=datetime.fromisoformat(schedule_data["updated_at"])
        )

    async def get_payments(self, params: PaymentSearchParams) -> List[PaymentResponse]:
        """Get payments with filtering"""
        query = self.db.table("billing_payments").select("*")
        
        if params.booking_id:
            query = query.eq("booking_id", str(params.booking_id))
        if params.invoice_id:
            query = query.eq("invoice_id", str(params.invoice_id))
        if params.payment_method:
            query = query.eq("payment_method", params.payment_method)
        if params.payment_category:
            query = query.eq("payment_category", params.payment_category)
        if params.status:
            query = query.eq("payment_status", params.status)
        if params.date_from:
            query = query.gte("payment_date", params.date_from.isoformat())
        if params.date_to:
            query = query.lte("payment_date", params.date_to.isoformat())
        if params.search:
            query = query.ilike("payment_code", f"%{params.search}%")

        # Order and pagination
        query = query.order(params.sort_by, desc=(params.order == "desc"))
        query = query.range((params.page - 1) * params.limit, params.page * params.limit - 1)

        result = query.execute()
        return [self._format_payment_response(payment) for payment in result.data]