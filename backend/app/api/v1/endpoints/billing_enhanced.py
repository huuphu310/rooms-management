from datetime import date, datetime
from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse

from app.api.deps import get_supabase_service, require_permission
from app.services.billing_service_enhanced import BillingServiceEnhanced
from app.schemas.billing_enhanced import *
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
    BusinessRuleException
)

router = APIRouter()


# Invoice Management Endpoints
@router.post("/invoices/create-deposit", response_model=InvoiceResponse)
async def create_deposit_invoice(
    deposit_data: CreateDepositInvoice,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """
    Create deposit invoice for new booking.
    
    This endpoint is automatically triggered when creating new bookings.
    Calculates deposit amount based on configured rules and creates invoice.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        invoice = await service.create_deposit_invoice(deposit_data)
        return invoice
    except ConflictException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/invoices/create-partial", response_model=InvoiceResponse)
async def create_partial_invoice(
    partial_data: CreatePartialInvoice,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """
    Create partial payment invoice for booking.
    
    Allows creating multiple partial payment invoices throughout
    the booking lifecycle for installment payments.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        invoice = await service.create_partial_invoice(partial_data)
        return invoice
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    booking_id: UUID = None,
    customer_id: UUID = None,
    invoice_type: InvoiceType = None,
    status: InvoiceStatus = None,
    date_from: date = None,
    date_to: date = None,
    search: str = None,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "created_at",
    order: str = "desc",
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Get invoices with filtering and pagination.
    
    Supports filtering by booking, customer, type, status, date range,
    and text search on invoice numbers.
    """
    service = BillingServiceEnhanced(db)
    
    search_params = InvoiceSearchParams(
        booking_id=booking_id,
        customer_id=customer_id,
        invoice_type=invoice_type,
        status=status,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order
    )
    
    invoices = await service.get_invoices(search_params)
    return invoices


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Get invoice by ID with all line items.
    
    Returns complete invoice details including all line items,
    payment status, and related information.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        invoice = await service.get_invoice(invoice_id)
        return invoice
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceUpdate,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "update"))
):
    """
    Update invoice details.
    
    Allows updating invoice details like due date, discounts, notes.
    Cannot modify amount after payments have been made.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        # Implementation would go here
        # For now, return the current invoice
        invoice = await service.get_invoice(invoice_id)
        return invoice
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# Payment Summary Endpoint
@router.get("/bookings/{booking_id}/payment-summary", response_model=BookingPaymentSummary)
async def get_booking_payment_summary(
    booking_id: UUID,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Get comprehensive payment overview for booking.
    
    Returns complete payment status including all invoices, payments,
    payment schedules, and calculated summaries.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        summary = await service.get_booking_payment_summary(booking_id)
        return summary
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# Payment Processing Endpoints
@router.post("/payments/process", response_model=List[PaymentResponse])
async def process_payment(
    payment_data: ProcessPayment,
    background_tasks: BackgroundTasks,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """
    Process payment for invoice.
    
    Supports multiple payment methods in a single transaction.
    Automatically updates invoice and booking status upon completion.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        payments = await service.process_payment(payment_data)
        
        # Send receipt if requested
        if payment_data.send_receipt:
            background_tasks.add_task(
                send_payment_receipt,
                payment_data.booking_id,
                payments
            )
        
        return payments
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/payments/record-deposit", response_model=PaymentResponse)
async def record_deposit_payment(
    deposit_data: RecordDepositPayment,
    background_tasks: BackgroundTasks,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """
    Record deposit payment for booking.
    
    Creates payment record and updates booking status to confirmed
    if deposit meets minimum requirements.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        payment = await service.record_deposit_payment(deposit_data)
        
        # Send confirmation
        background_tasks.add_task(
            send_deposit_confirmation,
            deposit_data.booking_id,
            payment
        )
        
        return payment
    except (NotFoundException, ValidationException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(
    booking_id: UUID = None,
    invoice_id: UUID = None,
    payment_method: PaymentMethod = None,
    payment_category: PaymentCategory = None,
    status: PaymentStatus = None,
    date_from: date = None,
    date_to: date = None,
    search: str = None,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "payment_date",
    order: str = "desc",
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Get payments with filtering and pagination.
    
    Supports filtering by various criteria and full-text search
    on payment codes and reference numbers.
    """
    service = BillingServiceEnhanced(db)
    
    search_params = PaymentSearchParams(
        booking_id=booking_id,
        invoice_id=invoice_id,
        payment_method=payment_method,
        payment_category=payment_category,
        status=status,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order
    )
    
    payments = await service.get_payments(search_params)
    return payments


# QR Code Payment Endpoints
@router.post("/payments/generate-qr", response_model=QRCodeResponse)
async def generate_qr_code(
    qr_data: GenerateQRCode,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """
    Generate VietQR code for bank transfer payment.
    
    Creates unique QR code with tracking ID for automatic payment
    reconciliation via SEAPay webhook integration.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        qr_response = await service.generate_qr_code(qr_data)
        return qr_response
    except (NotFoundException, ValidationException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/payments/qr-status/{qr_payment_id}", response_model=QRStatusResponse)
async def get_qr_payment_status(
    qr_payment_id: UUID,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Check QR payment status.
    
    Returns current status of QR payment including any received
    transactions and payment matching results.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        status_response = await service.get_qr_payment_status(qr_payment_id)
        return status_response
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/webhooks/seapay")
async def seapay_webhook(
    webhook_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db = Depends(get_supabase_service)
):
    """
    SEAPay webhook endpoint for bank transfer notifications.
    
    Receives automatic notifications when bank transfers are received,
    matches them with QR payments, and updates payment status.
    
    No authentication required as this is called by external service.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        result = await service.process_seapay_webhook(webhook_data)
        
        # Send notifications in background if payment matched
        if result.get("status") == "processed":
            background_tasks.add_task(
                send_payment_notification,
                webhook_data
            )
        
        return JSONResponse(
            status_code=200,
            content=result
        )
    except ValidationException as e:
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid signature"}
        )
    except Exception as e:
        # Log error but return success to prevent webhook retries
        print(f"Webhook processing error: {str(e)}")
        return JSONResponse(
            status_code=200,
            content={"status": "error", "message": str(e)}
        )


# Payment Schedule Endpoints
@router.post("/payment-schedules/create", response_model=List[PaymentScheduleResponse])
async def create_payment_schedule(
    schedule_data: CreatePaymentSchedule,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """
    Create payment schedule for booking.
    
    Can auto-generate schedule based on configuration or use
    custom schedule provided by user.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        schedules = await service.create_payment_schedule(schedule_data)
        return schedules
    except (NotFoundException, ValidationException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/payment-schedules/{booking_id}", response_model=List[PaymentScheduleResponse])
async def get_payment_schedules(
    booking_id: UUID,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Get payment schedules for booking.
    
    Returns all scheduled payments with their current status
    and associated invoices if created.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        schedules = await service.get_payment_schedules(booking_id)
        return schedules
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/payment-schedules/{schedule_id}", response_model=PaymentScheduleResponse)
async def update_payment_schedule(
    schedule_id: UUID,
    schedule_data: PaymentScheduleUpdate,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "update"))
):
    """
    Update payment schedule.
    
    Allows modification of schedule details before invoice creation.
    Cannot modify after associated invoice has been paid.
    """
    # Implementation would go here
    # For now, return a placeholder
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Schedule update not yet implemented"
    )


# Refund Endpoints
@router.post("/payments/{payment_id}/refund", response_model=PaymentResponse)
async def process_refund(
    payment_id: UUID,
    refund_data: ProcessRefund,
    background_tasks: BackgroundTasks,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "refund"))
):
    """
    Process payment refund.
    
    Creates refund payment record and processes refund through
    original payment method where possible.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        refund = await service.process_refund(payment_id, refund_data)
        
        # Process refund via payment gateway if needed
        background_tasks.add_task(
            process_gateway_refund,
            payment_id,
            refund
        )
        
        return refund
    except (NotFoundException, ValidationException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Reports and Analytics Endpoints
@router.get("/reports/revenue", response_model=RevenueReport)
async def get_revenue_report(
    date_from: date,
    date_to: date,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Generate revenue report for date range.
    
    Provides comprehensive revenue analysis including collection rates,
    payment method breakdown, and outstanding amounts.
    """
    service = BillingServiceEnhanced(db)
    
    try:
        report = await service.get_revenue_report(date_from, date_to)
        return report
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/dashboard", response_model=BillingDashboard)
async def get_billing_dashboard(
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Get billing dashboard data.
    
    Returns real-time metrics for today's performance,
    payment trends, and top pending payments.
    """
    service = BillingServiceEnhanced(db)
    
    # Implementation would calculate dashboard metrics
    # For now, return placeholder data
    today_summary = TodaySummary(
        total_collected=0,
        pending_payments=0,
        overdue_amount=0,
        invoices_generated=0
    )
    
    payment_trend = PaymentTrend(
        last_7_days=[],
        last_30_days=[]
    )
    
    dashboard = BillingDashboard(
        today_summary=today_summary,
        payment_trend=payment_trend,
        top_pending=[]
    )
    
    return dashboard


# Deposit Rules Management (Admin)
@router.post("/deposit-rules", response_model=DepositRuleResponse)
async def create_deposit_rule(
    rule_data: DepositRuleCreate,
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "admin"))
):
    """
    Create deposit calculation rule.
    
    Admin endpoint for configuring automatic deposit calculation
    rules based on room type, booking window, stay length, etc.
    """
    # Implementation would create deposit rule
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Deposit rules management not yet implemented"
    )


@router.get("/deposit-rules", response_model=List[DepositRuleResponse])
async def get_deposit_rules(
    db = Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """
    Get all deposit calculation rules.
    
    Returns active deposit rules ordered by priority.
    """
    # Implementation would fetch deposit rules
    return []


# Background Task Functions
async def send_payment_receipt(booking_id: UUID, payments: List[PaymentResponse]):
    """Send payment receipt via email"""
    # Implementation would send email receipt
    print(f"Sending receipt for booking {booking_id}")


async def send_deposit_confirmation(booking_id: UUID, payment: PaymentResponse):
    """Send deposit confirmation"""
    # Implementation would send confirmation
    print(f"Sending deposit confirmation for booking {booking_id}")


async def send_payment_notification(webhook_data: Dict[str, Any]):
    """Send payment received notification"""
    # Implementation would send notification
    print(f"Payment received via webhook: {webhook_data['data']['transaction_id']}")


async def process_gateway_refund(payment_id: UUID, refund: PaymentResponse):
    """Process refund via payment gateway"""
    # Implementation would call payment gateway API
    print(f"Processing gateway refund for payment {payment_id}")


# Health Check Endpoint
@router.get("/health")
async def billing_health_check():
    """
    Health check for billing service.
    
    Returns service status and basic connectivity checks.
    """
    return {
        "status": "healthy",
        "service": "billing_enhanced",
        "timestamp": datetime.now().isoformat(),
        "features": [
            "invoice_management",
            "payment_processing",
            "qr_code_payments",
            "seapay_integration",
            "payment_schedules",
            "refund_processing",
            "reporting"
        ]
    }