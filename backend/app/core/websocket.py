"""WebSocket manager for real-time updates using FastAPI WebSockets"""
from typing import Dict, Set, Optional
import logging
import json
import asyncio
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.invoice_rooms: Dict[str, Set[str]] = {}  # invoice_code -> set of connection_ids
        
    async def connect(self, websocket: WebSocket, connection_id: str):
        """Accept connection and store it"""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        logger.info(f"🔌 WebSocket connected: {connection_id}")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connected",
            "message": "Connected to payment updates",
            "connection_id": connection_id
        }, websocket)
    
    def disconnect(self, connection_id: str):
        """Remove connection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            
        # Remove from all invoice rooms
        for invoice_code, connections in self.invoice_rooms.items():
            connections.discard(connection_id)
            
        logger.info(f"🔌 WebSocket disconnected: {connection_id}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific websocket"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {str(e)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connections"""
        if not self.active_connections:
            return
            
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {str(e)}")
                disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected:
            self.disconnect(connection_id)
    
    async def send_to_invoice_room(self, invoice_code: str, message: dict):
        """Send message to all connections in an invoice room"""
        if invoice_code not in self.invoice_rooms:
            return
            
        disconnected = []
        for connection_id in self.invoice_rooms[invoice_code].copy():
            if connection_id in self.active_connections:
                try:
                    websocket = self.active_connections[connection_id]
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending to invoice room {invoice_code}, connection {connection_id}: {str(e)}")
                    disconnected.append(connection_id)
            else:
                disconnected.append(connection_id)
        
        # Clean up disconnected connections from room
        for connection_id in disconnected:
            self.invoice_rooms[invoice_code].discard(connection_id)
    
    def join_invoice_room(self, connection_id: str, invoice_code: str):
        """Join connection to invoice room"""
        if invoice_code not in self.invoice_rooms:
            self.invoice_rooms[invoice_code] = set()
        self.invoice_rooms[invoice_code].add(connection_id)
        logger.info(f"Connection {connection_id} joined invoice room: {invoice_code}")
    
    def leave_invoice_room(self, connection_id: str, invoice_code: str):
        """Remove connection from invoice room"""
        if invoice_code in self.invoice_rooms:
            self.invoice_rooms[invoice_code].discard(connection_id)
            logger.info(f"Connection {connection_id} left invoice room: {invoice_code}")

class WebSocketManager:
    """High-level WebSocket manager for payment updates"""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
    
    async def emit_payment_update(
        self, 
        qr_code_id: str, 
        invoice_code: str,
        status: str, 
        transaction_id: Optional[str] = None,
        amount: Optional[float] = None
    ):
        """Emit payment status update to connected clients"""
        try:
            event_data = {
                'type': 'payment_status_update',
                'qr_code_id': qr_code_id,
                'invoice_code': invoice_code, 
                'status': status,
                'transaction_id': transaction_id,
                'amount': amount,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Send to all connected clients
            await self.connection_manager.broadcast(event_data)
            
            # Send to specific invoice room
            await self.connection_manager.send_to_invoice_room(invoice_code, event_data)
            
            logger.info(f"💸 Payment status update emitted: {qr_code_id} -> {status}")
            
        except Exception as e:
            logger.error(f"Error emitting payment update: {str(e)}")
    
    async def emit_qr_expired(self, qr_code_id: str, invoice_code: str):
        """Emit QR code expiration event"""
        try:
            event_data = {
                'type': 'qr_expired',
                'qr_code_id': qr_code_id,
                'invoice_code': invoice_code,
                'status': 'expired',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.connection_manager.broadcast(event_data)
            await self.connection_manager.send_to_invoice_room(invoice_code, event_data)
            
            logger.info(f"⏰ QR expiration emitted: {qr_code_id}")
            
        except Exception as e:
            logger.error(f"Error emitting QR expiration: {str(e)}")

# Global WebSocket manager instance
websocket_manager = WebSocketManager()