"""POS Service - Point of Sale operations"""
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, date, timedelta
from decimal import Decimal
import asyncio
import json

from app.core.exceptions import NotFoundException, BusinessRuleException, ValidationException
from app.schemas.pos import (
    CreateTransactionRequest,
    TransactionResponse,
    TransactionItemResponse,
    ProcessPaymentRequest,
    PaymentResponse,
    QRPaymentInitResponse,
    PaymentStatus,
    TransactionStatus,
    CustomerType,
    PaymentMethod,
    TransactionType,
    VoidTransactionRequest,
    PrintReceiptRequest,
    ReceiptResponse,
    OpenShiftRequest,
    ShiftResponse,
    CloseShiftRequest,
    ShiftSummaryResponse,
    POSCategoryCreate,
    POSCategoryResponse,
    QuickProductResponse,
    DailySummaryResponse
)

class POSService:
    def __init__(self, db):
        self.db = db  # Supabase client
    
    # ============= Shift Management =============
    
    async def open_shift(
        self,
        request: OpenShiftRequest,
        user_id: UUID
    ) -> ShiftResponse:
        """Open new POS shift"""
        # Check for existing open shift
        existing = self._get_current_shift(user_id)
        if existing:
            raise BusinessRuleException("You already have an open shift")
        
        # Generate shift code
        now = datetime.now()
        shift_code = f"SHIFT-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        
        # Create shift
        shift_data = {
            'shift_code': shift_code,
            'terminal_id': request.terminal_id,
            'shift_date': now.date().isoformat(),  # Add shift_date
            'opened_by': str(user_id),
            'opening_cash': float(request.opening_cash),
            'status': 'open',
            'opened_at': datetime.utcnow().isoformat()
        }
        
        result = self.db.table('pos_shifts').insert(shift_data).execute()
        if not result.data:
            raise BusinessRuleException("Failed to open shift")
        
        return ShiftResponse(**result.data[0])
    
    def _get_current_shift(self, user_id: UUID) -> Optional[Dict]:
        """Get current open shift for user"""
        result = self.db.table("pos_shifts") \
            .select("*") \
            .eq("opened_by", str(user_id)) \
            .eq("status", "open") \
            .order("opened_at", desc=True) \
            .limit(1) \
            .execute()
        
        return result.data[0] if result.data else None
    
    def _get_shift(self, shift_id: UUID) -> Dict:
        """Get shift by ID"""
        result = self.db.table("pos_shifts") \
            .select("*") \
            .eq("id", str(shift_id)) \
            .execute()
        
        if not result.data:
            raise NotFoundException("Shift not found")
        return result.data[0]
    
    async def close_shift(
        self,
        shift_id: UUID,
        request: CloseShiftRequest,
        user_id: UUID
    ) -> ShiftSummaryResponse:
        """Close POS shift with reconciliation"""
        shift = self._get_shift(shift_id)
        
        if shift['status'] != 'open':
            raise BusinessRuleException("Shift is not open")
        
        if shift['opened_by'] != str(user_id):
            raise BusinessRuleException("You can only close your own shift")
        
        # Calculate shift summary
        summary = await self._generate_shift_summary(shift_id)
        
        # Update shift
        update_data = {
            'status': 'closed',
            'closed_by': str(user_id),
            'closed_at': datetime.utcnow().isoformat(),
            'closing_cash': float(request.closing_cash),
            'cash_difference': float(request.closing_cash - summary.total_cash),
            'notes': request.notes
        }
        
        self.db.table('pos_shifts').update(update_data).eq('id', str(shift_id)).execute()
        
        return summary
    
    async def _generate_shift_summary(self, shift_id: UUID) -> ShiftSummaryResponse:
        """Generate comprehensive shift summary"""
        shift = self._get_shift(shift_id)
        
        # Get all transactions for shift
        transactions_result = self.db.table('pos_transactions').select('*').eq(
            'shift_id', str(shift_id)
        ).execute()
        transactions = transactions_result.data if transactions_result.data else []
        
        # Calculate totals by payment method
        payment_totals = {
            'cash': 0,
            'credit_card': 0,
            'debit_card': 0,
            'bank_transfer': 0,
            'room_charge': 0,
            'qr_code': 0
        }
        
        total_sales = 0
        total_refunds = 0
        transaction_count = 0
        
        for trans in transactions:
            if trans['status'] != 'void':
                transaction_count += 1
                amount = float(trans['total_amount'])
                
                if trans['status'] == 'refunded':
                    total_refunds += amount
                else:
                    total_sales += amount
                    
                    payment_method = trans.get('payment_method', 'cash')
                    if payment_method in payment_totals:
                        payment_totals[payment_method] += amount
        
        # Get product sales
        items_result = self.db.table('pos_transaction_items').select(
            '*, pos_transactions!inner(shift_id, status)'
        ).eq('pos_transactions.shift_id', str(shift_id)).execute()
        
        product_sales = {}
        if items_result.data:
            for item in items_result.data:
                if item['pos_transactions']['status'] != 'void':
                    product_name = item.get('product_name', 'Unknown')
                    if product_name not in product_sales:
                        product_sales[product_name] = {
                            'quantity': 0,
                            'total': 0
                        }
                    product_sales[product_name]['quantity'] += item['quantity']
                    product_sales[product_name]['total'] += float(item.get('line_total', 0))
        
        return ShiftSummaryResponse(
            shift_id=shift['id'],
            shift_code=shift['shift_code'],
            terminal_id=shift['terminal_id'],
            opened_by=shift['opened_by'],
            opened_at=shift['opened_at'],
            closed_by=shift.get('closed_by'),
            closed_at=shift.get('closed_at'),
            opening_cash=float(shift['opening_cash']),
            closing_cash=float(shift.get('closing_cash', 0)),
            total_sales=total_sales,
            total_refunds=total_refunds,
            net_sales=total_sales - total_refunds,
            transaction_count=transaction_count,
            payment_breakdown=payment_totals,
            total_cash=payment_totals['cash'] + float(shift['opening_cash']),
            cash_difference=float(shift.get('cash_difference', 0)),
            product_sales=product_sales
        )
    
    # ============= Transaction Management =============
    
    async def create_transaction(
        self,
        request: CreateTransactionRequest,
        cashier_id: UUID
    ) -> TransactionResponse:
        """Create new POS transaction"""
        # Get current shift
        shift = self._get_current_shift(cashier_id)
        if not shift:
            raise BusinessRuleException("No active shift found. Please open a shift first.")
        
        # Generate transaction code
        transaction_number = self._generate_transaction_code()
        
        # Calculate totals from items
        subtotal = 0
        for item in request.items:
            subtotal += item.quantity * item.unit_price
        
        tax_amount = subtotal * 0.1  # 10% VAT
        service_charge = request.service_charge or 0
        discount_amount = request.discount_amount or 0
        total_amount = subtotal + tax_amount + service_charge - discount_amount
        
        # Create transaction
        transaction_data = {
            'shift_id': str(shift['id']),
            'transaction_number': transaction_number,
            'transaction_date': datetime.now().date().isoformat(),  # Add transaction_date
            'customer_type': request.customer_type,
            'customer_name': request.customer_name,
            'customer_phone': request.customer_phone,
            'room_number': request.room_number,
            'booking_id': str(request.booking_id) if request.booking_id else None,
            'terminal_id': shift['terminal_id'],
            'cashier_id': str(cashier_id),
            'status': TransactionStatus.ACTIVE,
            'payment_status': PaymentStatus.PENDING,
            'subtotal': subtotal,
            'tax_amount': tax_amount,
            'service_charge': service_charge,
            'discount_amount': discount_amount,
            'total_amount': total_amount,
            'created_at': datetime.utcnow().isoformat()
        }
        
        result = self.db.table('pos_transactions').insert(transaction_data).execute()
        if not result.data:
            raise BusinessRuleException("Failed to create transaction")
        transaction = result.data[0]
        
        # Add items to transaction
        items = []
        for item_request in request.items:
            item_data = {
                'transaction_id': transaction['id'],
                'product_id': str(item_request.product_id),
                'quantity': item_request.quantity,
                'unit_price': float(item_request.unit_price),
                'line_total': float(item_request.quantity * item_request.unit_price),
                'modifiers': item_request.modifiers,
                'notes': item_request.notes
            }
            
            item_result = self.db.table('pos_transaction_items').insert(item_data).execute()
            if item_result.data:
                items.append(item_result.data[0])
        
        # Return complete transaction
        return await self._get_transaction_with_items(transaction['id'])
    
    def _generate_transaction_code(self) -> str:
        """Generate unique transaction code"""
        today = datetime.now().strftime('%Y%m%d')
        pattern = f'TRX-{today}-%'
        
        # Get last transaction number for today using ilike for pattern matching
        result = self.db.table('pos_transactions').select('transaction_number').ilike(
            'transaction_number', pattern.replace('%', '*')
        ).order('created_at', desc=True).limit(1).execute()
        
        if result.data:
            last_code = result.data[0]['transaction_number']
            sequence = int(last_code.split('-')[-1]) + 1
        else:
            sequence = 1
        
        return f"TRX-{today}-{sequence:04d}"
    
    def _get_transaction(self, transaction_id: UUID) -> Dict:
        """Get transaction details"""
        result = self.db.table('pos_transactions').select('*').eq('id', str(transaction_id)).execute()
        if not result.data:
            raise NotFoundException("Transaction not found")
        return result.data[0]
    
    async def _get_transaction_with_items(self, transaction_id: UUID) -> TransactionResponse:
        """Get transaction with all items"""
        # Get transaction
        transaction = self._get_transaction(transaction_id)
        
        # Get items (without join for simplicity)
        items_result = self.db.table('pos_transaction_items').select('*').eq(
            'transaction_id', str(transaction_id)
        ).execute()
        items = items_result.data if items_result.data else []
        
        # Get products info for items
        for item in items:
            product_result = self.db.table('products').select('name, sku').eq(
                'id', item['product_id']
            ).execute()
            if product_result.data:
                item['product_name'] = product_result.data[0]['name']
                item['product_code'] = product_result.data[0].get('sku')
        
        return TransactionResponse(
            id=transaction['id'],
            shift_id=transaction['shift_id'],
            transaction_code=transaction.get('transaction_number', ''),  # Map transaction_number to transaction_code
            customer_type=transaction['customer_type'],
            customer_name=transaction['customer_name'],
            customer_phone=transaction['customer_phone'],
            room_number=transaction['room_number'],
            booking_id=transaction['booking_id'],
            terminal_id=transaction['terminal_id'],
            cashier_id=transaction['cashier_id'],
            status=transaction['status'],
            payment_status=transaction['payment_status'],
            payment_method=transaction.get('payment_method'),
            subtotal=float(transaction['subtotal']),
            tax_amount=float(transaction['tax_amount']),
            service_charge=float(transaction['service_charge']),
            discount_amount=float(transaction['discount_amount']),
            total_amount=float(transaction['total_amount']),
            total_paid=float(transaction.get('total_paid', 0)),
            change_amount=float(transaction.get('change_amount', 0)),
            items=[
                TransactionItemResponse(
                    id=item['id'],
                    product_id=item['product_id'],
                    product_name=item.get('product_name'),
                    product_code=item.get('product_code'),
                    quantity=item['quantity'],
                    unit_price=float(item['unit_price']),
                    line_total=float(item['line_total']),
                    modifiers=item.get('modifiers'),
                    notes=item.get('notes')
                ) for item in items
            ],
            created_at=transaction['created_at'],
            completed_at=transaction.get('completed_at'),
            updated_at=transaction.get('updated_at', transaction['created_at'])
        )
    
    async def process_payment(
        self,
        transaction_id: UUID,
        request: ProcessPaymentRequest,
        cashier_id: UUID
    ) -> PaymentResponse:
        """Process payment for transaction"""
        # Get transaction
        transaction = self._get_transaction(transaction_id)
        
        if transaction['payment_status'] == PaymentStatus.COMPLETED:
            raise BusinessRuleException("Transaction already paid")
        
        if transaction['status'] == TransactionStatus.VOID:
            raise BusinessRuleException("Cannot process payment for void transaction")
        
        payment_amount = request.amount or transaction['total_amount']
        
        # Create payment record
        payment_code = f"PAY-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        
        payment_data = {
            'transaction_id': str(transaction_id),
            'payment_code': payment_code,
            'payment_method': request.payment_method,
            'amount': float(payment_amount),
            'payment_details': request.payment_details or {},
            'status': 'completed',
            'processed_by': str(cashier_id),
            'processed_at': datetime.utcnow().isoformat()
        }
        
        payment_result = self.db.table('pos_payments').insert(payment_data).execute()
        if not payment_result.data:
            raise BusinessRuleException("Failed to process payment")
        
        # Update transaction
        update_data = {
            'payment_status': PaymentStatus.COMPLETED,
            'payment_method': request.payment_method,
            'status': TransactionStatus.COMPLETED,
            'total_paid': float(payment_amount),
            'change_amount': float(payment_amount - transaction['total_amount']),
            'completed_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        self.db.table('pos_transactions').update(update_data).eq('id', str(transaction_id)).execute()
        
        return PaymentResponse(
            success=True,
            payment_id=payment_result.data[0]['id'],
            payment_code=payment_code,
            amount=float(payment_amount),
            change_amount=float(payment_amount - transaction['total_amount']),
            receipt_url=f"/api/v1/pos/receipts/{transaction_id}"
        )
    
    async def void_transaction(
        self,
        transaction_id: UUID,
        request: VoidTransactionRequest,
        user_id: UUID
    ) -> TransactionResponse:
        """Void a transaction"""
        transaction = self._get_transaction(transaction_id)
        
        if transaction['status'] == TransactionStatus.VOID:
            raise BusinessRuleException("Transaction already voided")
        
        if transaction['status'] == TransactionStatus.COMPLETED:
            raise BusinessRuleException("Cannot void completed transaction. Use refund instead.")
        
        # Update transaction status
        update_data = {
            'status': TransactionStatus.VOID,
            'void_reason': request.reason,
            'void_by': str(user_id),
            'void_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        self.db.table('pos_transactions').update(update_data).eq('id', str(transaction_id)).execute()
        
        return await self._get_transaction_with_items(transaction_id)
    
    async def print_receipt(
        self,
        transaction_id: UUID,
        request: PrintReceiptRequest
    ) -> ReceiptResponse:
        """Print or reprint receipt"""
        transaction = await self._get_transaction_with_items(transaction_id)
        
        # Generate receipt data
        receipt_data = {
            'transaction_id': str(transaction_id),
            'receipt_type': request.receipt_type,
            'receipt_number': transaction.transaction_code,  # This will use the mapped value
            'printed_at': datetime.utcnow().isoformat(),
            'printer_id': request.printer_id
        }
        
        # In real implementation, send to printer
        # For now, just return receipt response
        return ReceiptResponse(
            success=True,
            receipt_url=f"/api/v1/pos/receipts/{transaction_id}",
            printed_at=datetime.utcnow()
        )
    
    # ============= Categories & Products =============
    
    async def get_categories(
        self,
        is_active: Optional[bool] = None,
        is_featured: Optional[bool] = None,
        parent_id: Optional[UUID] = None
    ) -> List[POSCategoryResponse]:
        """Get POS categories"""
        query = self.db.table('pos_categories').select('*')
        
        if is_active is not None:
            query = query.eq('is_active', is_active)
        if is_featured is not None:
            query = query.eq('is_featured', is_featured)
        if parent_id:
            query = query.eq('parent_id', str(parent_id))
        
        result = query.order('display_order').execute()
        
        return [POSCategoryResponse(**cat) for cat in (result.data or [])]
    
    async def create_category(
        self,
        request: POSCategoryCreate,
        user_id: UUID
    ) -> POSCategoryResponse:
        """Create new POS category"""
        category_data = {
            'category_name': request.category_name,
            'description': request.description,
            'parent_id': str(request.parent_id) if request.parent_id else None,
            'display_order': request.display_order or 0,
            'color_code': request.color_code,
            'icon': request.icon,
            'is_active': request.is_active,
            'is_featured': request.is_featured,
            'created_by': str(user_id),
            'created_at': datetime.utcnow().isoformat()
        }
        
        result = self.db.table('pos_categories').insert(category_data).execute()
        if not result.data:
            raise BusinessRuleException("Failed to create category")
        
        return POSCategoryResponse(**result.data[0])
    
    async def get_quick_products(
        self,
        category_id: Optional[UUID] = None,
        is_available: bool = True
    ) -> List[QuickProductResponse]:
        """Get products for quick access in POS"""
        query = self.db.table('products').select('*')
        
        # Note: category_id and is_available filtering disabled
        # since these columns don't exist in products table
        
        result = query.order('name').execute()
        products = result.data or []
        
        return [
            QuickProductResponse(
                id=product['id'],
                code=product.get('sku', ''),
                name=product['name'],
                category=product.get('type', 'goods'),
                price=float(product.get('selling_price', 0)),
                unit=product.get('unit', 'pcs'),
                is_available=True,  # Default to true since column doesn't exist
                stock_quantity=0,  # Default to 0 since column doesn't exist
                image_url=product.get('image_url'),
                has_modifiers=False,  # Simplified for now
                modifiers=[]
            ) for product in products
        ]
    
    # ============= Reports =============
    
    async def get_daily_summary(
        self,
        date: date,
        terminal_id: Optional[str] = None,
        cashier_id: Optional[UUID] = None
    ) -> DailySummaryResponse:
        """Get daily sales summary"""
        # Get date range
        start_date = datetime.combine(date, datetime.min.time())
        end_date = datetime.combine(date, datetime.max.time())
        
        # Build query
        query = self.db.table('pos_transactions').select('*')
        query = query.gte('created_at', start_date.isoformat())
        query = query.lte('created_at', end_date.isoformat())
        
        if terminal_id:
            query = query.eq('terminal_id', terminal_id)
        if cashier_id:
            query = query.eq('cashier_id', str(cashier_id))
        
        result = query.execute()
        transactions = result.data or []
        
        # Calculate summary
        total_sales = 0
        total_refunds = 0
        transaction_count = 0
        payment_breakdown = {}
        hourly_sales = {}
        
        for trans in transactions:
            if trans['status'] != 'void':
                transaction_count += 1
                amount = float(trans['total_amount'])
                
                if trans['status'] == 'refunded':
                    total_refunds += amount
                else:
                    total_sales += amount
                    
                    # Payment method breakdown
                    payment_method = trans.get('payment_method', 'cash')
                    if payment_method not in payment_breakdown:
                        payment_breakdown[payment_method] = 0
                    payment_breakdown[payment_method] += amount
                    
                    # Hourly breakdown
                    hour = datetime.fromisoformat(trans['created_at']).hour
                    if hour not in hourly_sales:
                        hourly_sales[hour] = 0
                    hourly_sales[hour] += amount
        
        return DailySummaryResponse(
            date=date,
            total_sales=total_sales,
            total_refunds=total_refunds,
            net_sales=total_sales - total_refunds,
            transaction_count=transaction_count,
            average_transaction=total_sales / transaction_count if transaction_count > 0 else 0,
            payment_breakdown=payment_breakdown,
            hourly_sales=hourly_sales
        )