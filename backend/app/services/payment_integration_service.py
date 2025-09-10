"""
Payment Integration Service for SeaPay Integration

Handles bank account management, QR code generation, webhook processing,
and automatic payment verification.
"""
import hashlib
import hmac
import json
import re
import secrets
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID, uuid4
import logging
import requests
from urllib.parse import urlencode

from supabase import Client

from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
    BusinessRuleException
)
from app.schemas.payment_integration import *
from app.services.billing_service_enhanced import BillingServiceEnhanced

logger = logging.getLogger(__name__)


class PaymentIntegrationService:
    """Service for handling SeaPay payment integration"""
    
    def __init__(self, db: Client, redis_client=None):
        self.db = db
        self.redis_client = redis_client
        self.billing_service = BillingServiceEnhanced(db, redis_client)
        
        # Configuration
        self.qr_code_base_url = "https://qr.sepay.vn/img"
        self.default_expiry_hours = 24
        self.webhook_timeout = 30
        self.webhook_retry_attempts = 3
        self.payment_tolerance = Decimal("1000")  # ±1000 VND tolerance

    # ================================================================
    # Bank Account Management
    # ================================================================
    
    async def create_bank_account(self, account_data: BankAccountCreate, user_id: UUID) -> BankAccountResponse:
        """Create a new bank account"""
        try:
            # Check for duplicate account
            existing = self.db.table("bank_accounts").select("*").eq(
                "bank_code", account_data.bank_code
            ).eq("account_number", account_data.account_number).execute()
            
            if existing.data:
                raise ConflictException(f"Bank account {account_data.account_number} already exists for {account_data.bank_code}")
            
            # If this is set as default, unset other defaults
            if account_data.is_default:
                await self._unset_default_accounts()
            
            # Generate account ID
            account_id = f"acc_{secrets.token_hex(8)}"
            
            # Create account record
            create_data = {
                **account_data.dict(),
                "account_id": account_id,
                "status": "active",
                "created_by": str(user_id)
            }
            
            result = self.db.table("bank_accounts").insert(create_data).execute()
            
            if not result.data:
                raise ValidationException("Failed to create bank account")
            
            return BankAccountResponse(**result.data[0])
            
        except Exception as e:
            logger.error(f"Error creating bank account: {str(e)}")
            raise

    async def list_bank_accounts(self, params: BankAccountSearchParams) -> BankAccountListResponse:
        """List bank accounts with filtering"""
        try:
            query = self.db.table("bank_accounts").select("*")
            
            # Apply filters
            if params.is_seapay_integrated is not None:
                query = query.eq("is_seapay_integrated", params.is_seapay_integrated)
            
            if params.status:
                query = query.eq("status", params.status.value)
            
            # Apply pagination
            offset = (params.page - 1) * params.limit
            query = query.range(offset, offset + params.limit - 1)
            query = query.order("created_at", desc=True)
            
            result = query.execute()
            
            accounts = [BankAccountResponse(**account) for account in result.data]
            
            return BankAccountListResponse(
                data=accounts,
                pagination={
                    "page": params.page,
                    "limit": params.limit,
                    "total": len(result.data)
                }
            )
            
        except Exception as e:
            logger.error(f"Error listing bank accounts: {str(e)}")
            raise

    async def get_bank_account(self, account_id: str) -> BankAccountResponse:
        """Get bank account by ID"""
        result = self.db.table("bank_accounts").select("*").eq("account_id", account_id).execute()
        
        if not result.data:
            raise NotFoundException(f"Bank account {account_id} not found")
        
        return BankAccountResponse(**result.data[0])

    async def update_bank_account(self, account_id: str, update_data: BankAccountUpdate, user_id: UUID) -> BankAccountResponse:
        """Update bank account"""
        try:
            # Check account exists
            await self.get_bank_account(account_id)
            
            # If setting as default, unset other defaults
            if update_data.is_default:
                await self._unset_default_accounts()
            
            update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
            update_dict["updated_by"] = str(user_id)
            
            result = self.db.table("bank_accounts").update(update_dict).eq(
                "account_id", account_id
            ).execute()
            
            if not result.data:
                raise ValidationException("Failed to update bank account")
            
            return BankAccountResponse(**result.data[0])
            
        except Exception as e:
            logger.error(f"Error updating bank account: {str(e)}")
            raise

    async def delete_bank_account(self, account_id: str) -> Dict[str, Any]:
        """Delete bank account"""
        try:
            # Check for active QR codes
            qr_codes = self.db.table("payment_qr_codes").select("id").eq(
                "bank_account_id", account_id
            ).eq("status", "pending").execute()
            
            if qr_codes.data:
                raise BusinessRuleException("Cannot delete bank account with active QR codes")
            
            result = self.db.table("bank_accounts").delete().eq("account_id", account_id).execute()
            
            if not result.data:
                raise NotFoundException(f"Bank account {account_id} not found")
            
            return {"success": True, "message": "Bank account deleted successfully"}
            
        except Exception as e:
            logger.error(f"Error deleting bank account: {str(e)}")
            raise

    async def get_default_bank_account(self) -> BankAccountResponse:
        """Get the default bank account"""
        result = self.db.table("bank_accounts").select("*").eq("is_default", True).eq(
            "status", "active"
        ).execute()
        
        if not result.data:
            raise NotFoundException("No default bank account configured")
        
        return BankAccountResponse(**result.data[0])

    async def _unset_default_accounts(self):
        """Helper to unset all default accounts"""
        self.db.table("bank_accounts").update({"is_default": False}).eq("is_default", True).execute()

    # ================================================================
    # QR Code Management
    # ================================================================
    
    async def generate_qr_code(self, qr_request: QRCodeGenerateRequest, user_id: UUID) -> QRCodeResponse:
        """Generate payment QR code"""
        try:
            # Get bank account (default if not specified)
            if qr_request.account_id:
                bank_account = await self.get_bank_account(qr_request.account_id)
            else:
                bank_account = await self.get_default_bank_account()
            
            if not bank_account.is_seapay_integrated:
                raise ValidationException("Bank account is not integrated with SeaPay")
            
            # Generate random verification code
            random_code = f"{secrets.randbelow(999999):06d}"
            
            # Create payment content
            payment_content = f"{qr_request.invoice_code} {random_code}"
            
            # Calculate expiry
            expires_at = datetime.utcnow() + timedelta(hours=qr_request.expiry_hours)
            
            # Generate QR code ID
            qr_code_id = f"qr_{secrets.token_hex(8)}"
            
            # Build QR image URL
            qr_params = {
                "acc": bank_account.account_number,
                "bank": bank_account.bank_code,
                "amount": str(int(qr_request.amount)),
                "des": payment_content
            }
            qr_image_url = f"{self.qr_code_base_url}?{urlencode(qr_params)}"
            
            # Store QR code record
            qr_data = {
                "qr_code_id": qr_code_id,
                "bank_account_id": str(bank_account.id),
                "invoice_id": str(qr_request.invoice_id) if qr_request.invoice_id else None,
                "booking_id": str(qr_request.booking_id) if qr_request.booking_id else None,
                "amount": float(qr_request.amount),
                "invoice_code": qr_request.invoice_code,
                "random_code": random_code,
                "payment_content": payment_content,
                "qr_image_url": qr_image_url,
                "description": qr_request.description,
                "expires_at": expires_at.isoformat(),
                "created_by": str(user_id)
            }
            
            result = self.db.table("payment_qr_codes").insert(qr_data).execute()
            
            if not result.data:
                raise ValidationException("Failed to create QR code")
            
            return QRCodeResponse(
                qr_code_id=qr_code_id,
                qr_image_url=qr_image_url,
                payment_content=payment_content,
                random_code=random_code,
                amount=qr_request.amount,
                bank_account=bank_account.account_number,
                bank_code=bank_account.bank_code,
                expires_at=expires_at,
                status=QRCodeStatus.PENDING
            )
            
        except Exception as e:
            logger.error(f"Error generating QR code: {str(e)}")
            raise

    async def get_qr_code_status(self, qr_code_id: str) -> QRCodeStatusResponse:
        """Get QR code payment status"""
        result = self.db.table("payment_qr_codes").select("*").eq("qr_code_id", qr_code_id).execute()
        
        if not result.data:
            raise NotFoundException(f"QR code {qr_code_id} not found")
        
        qr_data = result.data[0]
        
        # Check if expired - use timezone-aware datetime comparison
        from datetime import timezone
        if qr_data["status"] == "pending":
            expires_at = datetime.fromisoformat(qr_data["expires_at"].replace("Z", "+00:00"))
            now_utc = datetime.now(timezone.utc)
            
            if expires_at < now_utc:
                # Update status to expired
                self.db.table("payment_qr_codes").update({"status": "expired"}).eq("qr_code_id", qr_code_id).execute()
                qr_data["status"] = "expired"
        
        return QRCodeStatusResponse(
            qr_code_id=qr_code_id,
            status=QRCodeStatus(qr_data["status"]),
            payment_confirmed_at=datetime.fromisoformat(qr_data["payment_confirmed_at"].replace("Z", "+00:00")) if qr_data["payment_confirmed_at"] else None,
            transaction_id=qr_data.get("transaction_id"),
            expires_at=datetime.fromisoformat(qr_data["expires_at"].replace("Z", "+00:00"))
        )

    async def cancel_qr_code(self, qr_code_id: str) -> Dict[str, Any]:
        """Cancel a pending QR code"""
        result = self.db.table("payment_qr_codes").update({
            "status": "cancelled"
        }).eq("qr_code_id", qr_code_id).eq("status", "pending").execute()
        
        if not result.data:
            raise NotFoundException("QR code not found or cannot be cancelled")
        
        return {"success": True, "message": "QR code cancelled successfully"}

    # ================================================================
    # Webhook Processing
    # ================================================================
    
    async def process_webhook_payload(self, payload: WebhookPayload) -> Dict[str, Any]:
        """Process incoming webhook payment notification"""
        try:
            # Store raw transaction
            transaction_id = await self._store_transaction(payload)
            
            # Parse payment content
            parsed_content = self._parse_payment_content(payload.content)
            
            if not parsed_content.is_valid:
                logger.warning(f"Could not parse payment content: {payload.content}")
                return {
                    "success": True,
                    "transaction_id": transaction_id,
                    "verification_status": "failed",
                    "message": "Could not parse payment content"
                }
            
            # Find matching QR code
            matching_result = await self._find_matching_qr_code(parsed_content, payload.transferAmount)
            
            if matching_result.matched:
                # Process verified payment
                await self._process_verified_payment(transaction_id, matching_result, payload)
                
                return {
                    "success": True,
                    "transaction_id": transaction_id,
                    "verification_status": "verified",
                    "qr_code_id": str(matching_result.qr_code_id),
                    "message": "Payment verified and processed"
                }
            else:
                logger.info(f"Payment not matched: {matching_result.reason}")
                return {
                    "success": True,
                    "transaction_id": transaction_id,
                    "verification_status": "failed",
                    "message": matching_result.reason or "Payment verification failed"
                }
                
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            raise

    async def _store_transaction(self, payload: WebhookPayload) -> str:
        """Store raw transaction from webhook"""
        # Find bank account
        bank_result = self.db.table("bank_accounts").select("id").eq(
            "account_number", payload.accountNumber
        ).eq("bank_code", payload.gateway).execute()
        
        if not bank_result.data:
            raise NotFoundException(f"Bank account {payload.accountNumber} not found")
        
        bank_account_id = bank_result.data[0]["id"]
        
        # Parse transaction date
        transaction_date = datetime.strptime(payload.transactionDate, "%Y-%m-%d %H:%M:%S")
        
        transaction_data = {
            "transaction_id": payload.id,
            "bank_account_id": str(bank_account_id),
            "amount": float(payload.transferAmount),
            "accumulated": float(payload.accumulated) if payload.accumulated else None,
            "account_number": payload.accountNumber,
            "gateway": payload.gateway,
            "content": payload.content,
            "transaction_date": transaction_date.isoformat(),
            "transfer_type": payload.transferType.value,
            "reference_code": payload.referenceCode,
            "description": payload.description
        }
        
        result = self.db.table("payment_transactions").insert(transaction_data).execute()
        
        if not result.data:
            raise ValidationException("Failed to store transaction")
        
        return payload.id

    def _parse_payment_content(self, content: str) -> ParsedPaymentContent:
        """Parse payment content to extract invoice code and random code"""
        try:
            # Remove extra spaces and normalize
            normalized = content.strip().upper()
            normalized = re.sub(r'\s+', ' ', normalized)
            
            # Pattern: INVOICE_CODE RANDOM_CODE [optional text]
            pattern = r'([A-Z0-9]+)\s+(\d{6})'
            match = re.search(pattern, normalized)
            
            if match:
                return ParsedPaymentContent(
                    invoice_code=match.group(1),
                    random_code=match.group(2),
                    is_valid=True,
                    raw_content=content
                )
            
            return ParsedPaymentContent(
                is_valid=False,
                raw_content=content
            )
            
        except Exception as e:
            logger.error(f"Error parsing payment content: {str(e)}")
            return ParsedPaymentContent(
                is_valid=False,
                raw_content=content
            )

    async def _find_matching_qr_code(self, parsed_content: ParsedPaymentContent, amount: Decimal) -> PaymentMatchingResult:
        """Find QR code that matches the payment"""
        try:
            # Find QR codes with matching invoice code and random code
            result = self.db.table("payment_qr_codes").select("*").eq(
                "invoice_code", parsed_content.invoice_code
            ).eq("random_code", parsed_content.random_code).eq("status", "pending").execute()
            
            if not result.data:
                return PaymentMatchingResult(
                    matched=False,
                    reason=f"No pending QR code found for {parsed_content.invoice_code} {parsed_content.random_code}"
                )
            
            qr_code = result.data[0]
            
            # Check expiry
            expires_at = datetime.fromisoformat(qr_code["expires_at"].replace("Z", "+00:00"))
            if datetime.utcnow() > expires_at:
                return PaymentMatchingResult(
                    matched=False,
                    qr_code_id=UUID(qr_code["id"]),
                    invoice_code=parsed_content.invoice_code,
                    random_code=parsed_content.random_code,
                    expiry_valid=False,
                    reason="QR code has expired"
                )
            
            # Check amount (with tolerance)
            expected_amount = Decimal(str(qr_code["amount"]))
            amount_diff = abs(amount - expected_amount)
            amount_matches = amount_diff <= self.payment_tolerance
            
            if not amount_matches:
                return PaymentMatchingResult(
                    matched=False,
                    qr_code_id=UUID(qr_code["id"]),
                    invoice_code=parsed_content.invoice_code,
                    random_code=parsed_content.random_code,
                    amount_matches=False,
                    expiry_valid=True,
                    reason=f"Amount mismatch: expected {expected_amount}, got {amount}"
                )
            
            return PaymentMatchingResult(
                matched=True,
                qr_code_id=UUID(qr_code["id"]),
                invoice_code=parsed_content.invoice_code,
                random_code=parsed_content.random_code,
                amount_matches=True,
                content_matches=True,
                expiry_valid=True
            )
            
        except Exception as e:
            logger.error(f"Error finding matching QR code: {str(e)}")
            return PaymentMatchingResult(
                matched=False,
                reason=f"Error during matching: {str(e)}"
            )

    async def _process_verified_payment(self, transaction_id: str, matching_result: PaymentMatchingResult, payload: WebhookPayload):
        """Process a verified payment"""
        try:
            # Update QR code status
            now = datetime.utcnow()
            self.db.table("payment_qr_codes").update({
                "status": "paid",
                "payment_confirmed_at": now.isoformat(),
                "transaction_id": transaction_id
            }).eq("id", str(matching_result.qr_code_id)).execute()
            
            # Get QR code details
            qr_result = self.db.table("payment_qr_codes").select("*").eq(
                "id", str(matching_result.qr_code_id)
            ).execute()
            
            if not qr_result.data:
                return
            
            qr_data = qr_result.data[0]
            
            # Create payment record in billing system
            if qr_data.get("invoice_id"):
                await self._create_billing_payment_record(qr_data, payload, transaction_id)
            
            # Update transaction status
            self.db.table("payment_transactions").update({
                "qr_code_id": str(matching_result.qr_code_id),
                "parsed_invoice_code": matching_result.invoice_code,
                "parsed_random_code": matching_result.random_code,
                "verification_status": "verified",
                "processed_at": now.isoformat(),
                "verification_notes": "Automatically verified via webhook"
            }).eq("transaction_id", transaction_id).execute()
            
        except Exception as e:
            logger.error(f"Error processing verified payment: {str(e)}")
            raise

    async def _create_billing_payment_record(self, qr_data: Dict, payload: WebhookPayload, transaction_id: str):
        """Create payment record in billing system"""
        try:
            from app.schemas.billing_enhanced import RecordPayment
            
            # Create payment record
            payment_data = RecordPayment(
                invoice_id=UUID(qr_data["invoice_id"]),
                amount=Decimal(str(payload.transferAmount)),
                payment_method="bank_transfer",
                payment_date=datetime.strptime(payload.transactionDate, "%Y-%m-%d %H:%M:%S").date(),
                transaction_reference=payload.referenceCode or transaction_id,
                notes=f"Automatic payment via SeaPay QR code {qr_data['qr_code_id']}"
            )
            
            # Use billing service to record payment
            payment_response = await self.billing_service.record_payment(
                payment_data, 
                qr_data.get("created_by") or "system"
            )
            
            # Link QR code to payment record
            if payment_response:
                self.db.table("billing_payments").update({
                    "payment_qr_code_id": qr_data["id"],
                    "transaction_id": transaction_id
                }).eq("id", str(payment_response.id)).execute()
                
                # Update transaction with payment record ID
                self.db.table("payment_transactions").update({
                    "payment_record_id": str(payment_response.id)
                }).eq("transaction_id", transaction_id).execute()
            
        except Exception as e:
            logger.error(f"Error creating billing payment record: {str(e)}")
            # Don't re-raise as the payment verification was successful

    # ================================================================
    # Utility Methods
    # ================================================================
    
    async def get_supported_banks(self) -> BankListResponse:
        """Get list of supported banks from database"""
        try:
            # Get service client for database access
            from app.core.database import SupabaseDB
            db = SupabaseDB.get_service_client()
            
            # Query supported banks from database
            result = db.table('supported_banks').select('*').order('short_name').execute()
            
            if not result.data:
                # If no data in database, return empty list
                return BankListResponse(data=[])
            
            # Convert database records to SupportedBank objects
            banks = []
            for bank_data in result.data:
                bank = SupportedBank(
                    code=bank_data['code'],
                    bin=bank_data['bin'],
                    short_name=bank_data['short_name'],
                    supported=bank_data['supported']
                )
                banks.append(bank)
            
            return BankListResponse(data=banks)
            
        except Exception as e:
            logger.error(f"Error getting supported banks: {str(e)}")
            raise

    async def cleanup_expired_qr_codes(self) -> Dict[str, int]:
        """Clean up expired QR codes (scheduled task)"""
        try:
            now = datetime.utcnow().isoformat()
            
            # Update expired QR codes
            result = self.db.table("payment_qr_codes").update({
                "status": "expired"
            }).eq("status", "pending").lt("expires_at", now).execute()
            
            expired_count = len(result.data) if result.data else 0
            
            logger.info(f"Marked {expired_count} QR codes as expired")
            
            return {
                "expired_count": expired_count,
                "processed_at": now
            }
            
        except Exception as e:
            logger.error(f"Error cleaning up expired QR codes: {str(e)}")
            raise