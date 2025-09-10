"""WebSocket testing endpoints"""
from fastapi import APIRouter, Depends
from app.core.websocket import websocket_manager
from app.api.deps import get_current_user,
    UserScopedDbDep,
    AuthenticatedDbDep

router = APIRouter()

@router.post("/test-payment-update")
async def test_payment_update(
    qr_code_id: str = "test_qr_123",
    invoice_code: str = "TEST-INV-001", 
    current_user: dict = Depends(get_current_user)
):
    """Test endpoint to manually trigger payment update WebSocket event"""
    try:
        await websocket_manager.emit_payment_update(
            qr_code_id=qr_code_id,
            invoice_code=invoice_code,
            status='paid',
            transaction_id='test_tx_456',
            amount=100000.0
        )
        
        return {
            "success": True,
            "message": f"Payment update emitted for {invoice_code}",
            "qr_code_id": qr_code_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/test-qr-expired") 
async def test_qr_expired(
    qr_code_id: str = "test_qr_123",
    invoice_code: str = "TEST-INV-001",
    current_user: dict = Depends(get_current_user)
):
    """Test endpoint to manually trigger QR expiration WebSocket event"""
    try:
        await websocket_manager.emit_qr_expired(
            qr_code_id=qr_code_id,
            invoice_code=invoice_code
        )
        
        return {
            "success": True,
            "message": f"QR expiration emitted for {invoice_code}",
            "qr_code_id": qr_code_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }