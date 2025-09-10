"""
Payment Integration API Endpoints

Handles SeaPay integration including bank accounts, QR codes, and webhooks.
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse

from app.api.deps import (
    get_current_user,
    require_permission,
    UserScopedDbDep,
    AuthenticatedDbDep
)
from app.services.payment_integration_service import PaymentIntegrationService
from app.schemas.payment_integration import *
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
    BusinessRuleException
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# ================================================================
# Bank Account Management Endpoints
# ================================================================

@router.post("/bank-accounts", response_model=BankAccountResponse)
async def create_bank_account(
    account_data: BankAccountCreate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """Create a new bank account for payment processing"""
    service = PaymentIntegrationService(db)
    return await service.create_bank_account(account_data, UUID(current_user['id']))

@router.get("/bank-accounts", response_model=BankAccountListResponse)
async def list_bank_accounts(
    db: AuthenticatedDbDep,
    page: int = 1,
    limit: int = 20,
    is_seapay_integrated: Optional[bool] = None,
    status: Optional[BankAccountStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all bank accounts with filtering"""
    service = PaymentIntegrationService(db)
    params = BankAccountSearchParams(
        page=page,
        limit=limit,
        is_seapay_integrated=is_seapay_integrated,
        status=status
    )
    return await service.list_bank_accounts(params)

@router.get("/bank-accounts/{account_id}", response_model=BankAccountResponse)
async def get_bank_account(
    account_id: str,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get bank account details"""
    service = PaymentIntegrationService(db)
    return await service.get_bank_account(account_id)

@router.put("/bank-accounts/{account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    account_id: str,
    update_data: BankAccountUpdate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("billing", "update"))
):
    """Update bank account"""
    service = PaymentIntegrationService(db)
    return await service.update_bank_account(account_id, update_data, UUID(current_user['id']))

@router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(
    account_id: str,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("billing", "delete"))
):
    """Delete bank account"""
    service = PaymentIntegrationService(db)
    return await service.delete_bank_account(account_id)

@router.get("/bank-accounts/default", response_model=BankAccountResponse)
async def get_default_bank_account(
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get the default bank account"""
    service = PaymentIntegrationService(db)
    return await service.get_default_bank_account()

# ================================================================
# QR Code Generation Endpoints
# ================================================================

@router.post("/qr-codes/generate", response_model=QRCodeResponse)
async def generate_qr_code(
    qr_request: QRCodeGenerateRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("billing", "create"))
):
    """Generate payment QR code with SeaPay integration"""
    service = PaymentIntegrationService(db)
    return await service.generate_qr_code(qr_request, UUID(current_user['id']))

@router.get("/qr-codes/{qr_code_id}/status", response_model=QRCodeStatusResponse)
async def get_qr_code_status(
    qr_code_id: str,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Check QR code payment status"""
    service = PaymentIntegrationService(db)
    return await service.get_qr_code_status(qr_code_id)

@router.post("/qr-codes/{qr_code_id}/cancel")
async def cancel_qr_code(
    qr_code_id: str,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("billing", "update"))
):
    """Cancel a pending QR code"""
    service = PaymentIntegrationService(db)
    return await service.cancel_qr_code(qr_code_id)

@router.get("/qr-codes")
async def list_qr_codes(
    db: AuthenticatedDbDep,
    page: int = 1,
    limit: int = 20,
    status: Optional[QRCodeStatus] = None,
    invoice_code: Optional[str] = None,
    booking_id: Optional[UUID] = None,
    current_user: dict = Depends(get_current_user)
):
    """List QR codes with filtering"""
    try:
        query = db.table("payment_qr_codes").select("""
            qr_code_id,
            amount,
            invoice_code,
            payment_content,
            qr_image_url,
            status,
            expires_at,
            payment_confirmed_at,
            created_at,
            bank_accounts!inner(
                account_number,
                bank_code,
                bank_name
            )
        """)
        
        # Apply filters
        if status:
            query = query.eq("status", status.value)
        if invoice_code:
            query = query.ilike("invoice_code", f"%{invoice_code}%")
        if booking_id:
            query = query.eq("booking_id", str(booking_id))
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        query = query.order("created_at", desc=True)
        
        result = query.execute()
        
        return {
            "success": True,
            "data": result.data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": len(result.data)
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing QR codes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ================================================================
# Webhook Endpoints
# ================================================================

@router.post("/webhooks/seapay")
async def seapay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AuthenticatedDbDep
):
    """Handle SeaPay webhook notifications"""
    try:
        # Get raw payload
        body = await request.body()
        
        # Parse JSON payload
        try:
            import json
            payload_dict = json.loads(body.decode())
            logger.info(f"Received webhook payload: {payload_dict}")
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in webhook payload: {body}")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
        # Validate payload structure
        try:
            payload = WebhookPayload(**payload_dict)
        except Exception as e:
            logger.error(f"Invalid webhook payload structure: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid payload structure: {str(e)}")
        
        # Process webhook in background
        service = PaymentIntegrationService(db)
        background_tasks.add_task(
            process_webhook_background,
            service,
            payload
        )
        
        # Return immediate response
        return {
            "success": True,
            "message": "Webhook received and queued for processing",
            "transaction_id": payload.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def process_webhook_background(service: PaymentIntegrationService, payload: WebhookPayload):
    """Background task to process webhook"""
    try:
        result = await service.process_webhook_payload(payload)
        logger.info(f"Webhook processed: {result}")
        
        # Emit WebSocket update if payment was successfully verified
        if result.get('verification_status') == 'verified' and result.get('qr_code_id'):
            from app.core.websocket import websocket_manager
            
            # Parse content to get invoice code
            invoice_code = None
            if 'invoice_code' in result:
                invoice_code = result['invoice_code']
            else:
                # Try to extract from message content
                import re
                content = payload.content.strip().upper()
                content = re.sub(r'\s+', ' ', content)
                pattern = r'([A-Z0-9\-]+)'
                match = re.search(pattern, content)
                if match:
                    invoice_code = match.group(1)
            
            if invoice_code:
                await websocket_manager.emit_payment_update(
                    qr_code_id=result['qr_code_id'],
                    invoice_code=invoice_code,
                    status='paid',
                    transaction_id=result['transaction_id'],
                    amount=float(payload.transferAmount)
                )
        
    except Exception as e:
        logger.error(f"Error processing webhook in background: {str(e)}")

# ================================================================
# Payment Verification Endpoints
# ================================================================

@router.post("/payments/verify", response_model=PaymentVerificationResponse)
async def verify_payment(
    verification_request: PaymentVerificationRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """Manually verify a payment transaction"""
    try:
        service = PaymentIntegrationService(db)
        
        # Parse payment content
        parsed_content = service._parse_payment_content(verification_request.message)
        
        if not parsed_content.is_valid:
            return PaymentVerificationResponse(
                verified=False,
                transaction_id=verification_request.transaction_id,
                qr_code_id=verification_request.qr_code_id,
                amount_matched=False,
                content_matched=False
            )
        
        # Find matching QR code
        matching_result = await service._find_matching_qr_code(
            parsed_content, 
            verification_request.amount
        )
        
        if matching_result.matched:
            # Update QR code if found
            now = datetime.utcnow()
            db.table("payment_qr_codes").update({
                "status": "paid",
                "payment_confirmed_at": now.isoformat(),
                "transaction_id": verification_request.transaction_id
            }).eq("id", str(matching_result.qr_code_id)).execute()
            
            return PaymentVerificationResponse(
                verified=True,
                transaction_id=verification_request.transaction_id,
                qr_code_id=str(matching_result.qr_code_id),
                invoice_code=matching_result.invoice_code,
                random_code=matching_result.random_code,
                amount_matched=matching_result.amount_matches,
                content_matched=matching_result.content_matches,
                verified_at=now
            )
        else:
            return PaymentVerificationResponse(
                verified=False,
                transaction_id=verification_request.transaction_id,
                qr_code_id=verification_request.qr_code_id,
                invoice_code=parsed_content.invoice_code,
                random_code=parsed_content.random_code,
                amount_matched=matching_result.amount_matches,
                content_matched=matching_result.content_matches
            )
            
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ================================================================
# Utility Endpoints
# ================================================================

@router.get("/banks", response_model=BankListResponse)
async def get_supported_banks():
    """Get list of supported banks"""
    try:
        # Create service without dependencies for this utility endpoint
        service = PaymentIntegrationService(None)
        return await service.get_supported_banks()
    except Exception as e:
        logger.error(f"Error getting supported banks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions")
async def list_transactions(
    db: AuthenticatedDbDep,
    page: int = 1,
    limit: int = 50,
    verification_status: Optional[TransactionVerificationStatus] = None,
    gateway: Optional[str] = None,
    processed: Optional[bool] = None,
    current_user: dict = Depends(require_permission("billing", "read"))
):
    """List payment transactions"""
    try:
        query = db.table("payment_transactions").select("""
            *,
            bank_accounts!inner(
                account_number,
                bank_code,
                bank_name
            )
        """)
        
        # Apply filters
        if verification_status:
            query = query.eq("verification_status", verification_status.value)
        if gateway:
            query = query.eq("gateway", gateway)
        if processed is not None:
            if processed:
                query = query.is_("processed_at", "not.null")
            else:
                query = query.is_("processed_at", "null")
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        query = query.order("transaction_date", desc=True)
        
        result = query.execute()
        
        return {
            "success": True,
            "data": result.data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": len(result.data)
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/maintenance/cleanup-expired")
async def cleanup_expired_qr_codes(
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("system", "admin"))
):
    """Clean up expired QR codes (maintenance endpoint)"""
    service = PaymentIntegrationService(db)
    return await service.cleanup_expired_qr_codes()

# ================================================================
# Error handling is managed at the app level in main.py
# Individual routers cannot have exception handlers
# ================================================================