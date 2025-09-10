/**
 * WebSocket client for real-time payment updates
 */

interface PaymentStatusUpdate {
  qr_code_id: string
  invoice_code: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  transaction_id?: string
  amount?: number
  timestamp: string
}

interface QRExpiredEvent {
  qr_code_id: string
  invoice_code: string
  status: 'expired'
  timestamp: string
}

interface WebSocketMessage {
  type: string
  [key: string]: any
}

class WebSocketService {
  private socket: WebSocket | null = null
  private currentInvoice: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private connectionId: string | null = null

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return this.socket
    }

    try {
      this.socket = new WebSocket('ws://localhost:8000/ws')
      
      this.socket.onopen = () => {
        console.log('🔌 WebSocket connected')
        this.reconnectAttempts = 0
      }

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('🔌 Error parsing WebSocket message:', error)
        }
      }

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason)
        this.socket = null
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          setTimeout(() => {
            console.log(`🔌 Reconnecting... attempt ${this.reconnectAttempts}`)
            this.connect()
          }, this.reconnectDelay * this.reconnectAttempts)
        }
      }

      this.socket.onerror = (error) => {
        console.error('🔌 WebSocket error:', error)
      }

    } catch (error) {
      console.error('🔌 Error creating WebSocket connection:', error)
    }

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      this.currentInvoice = null
      this.connectionId = null
    }
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'connected':
        console.log('🔌 Server confirmation:', message.message)
        this.connectionId = message.connection_id
        break
        
      case 'joined_invoice':
        console.log('🏠 Joined invoice room:', message.invoice_code)
        break
        
      case 'left_invoice':
        console.log('🏠 Left invoice room:', message.invoice_code)
        break
        
      case 'payment_status_update':
        console.log('💸 Payment status update received:', message)
        if (this.paymentUpdateCallback) {
          this.paymentUpdateCallback(message as PaymentStatusUpdate)
        }
        break
        
      case 'qr_expired':
        console.log('⏰ QR expired event received:', message)
        if (this.qrExpiredCallback) {
          this.qrExpiredCallback(message as QRExpiredEvent)
        }
        break
        
      case 'error':
        console.error('🔌 WebSocket error message:', message.message)
        break
        
      default:
        console.log('🔌 Unknown message type:', message.type, message)
    }
  }

  private sendMessage(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    } else {
      console.error('🔌 WebSocket is not connected')
    }
  }

  joinInvoice(invoiceCode: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect()
      // Wait for connection and try again
      setTimeout(() => {
        this.joinInvoice(invoiceCode)
      }, 100)
      return
    }

    if (this.currentInvoice === invoiceCode) {
      return // Already joined this invoice
    }

    // Leave previous invoice if any
    if (this.currentInvoice) {
      this.leaveInvoice(this.currentInvoice)
    }

    this.sendMessage({
      type: 'join_invoice',
      invoice_code: invoiceCode
    })
    
    this.currentInvoice = invoiceCode
  }

  leaveInvoice(invoiceCode: string) {
    if (this.socket?.readyState === WebSocket.OPEN && this.currentInvoice === invoiceCode) {
      this.sendMessage({
        type: 'leave_invoice',
        invoice_code: invoiceCode
      })
      this.currentInvoice = null
    }
  }

  private paymentUpdateCallback: ((update: PaymentStatusUpdate) => void) | null = null
  private qrExpiredCallback: ((event: QRExpiredEvent) => void) | null = null

  onPaymentStatusUpdate(callback: (update: PaymentStatusUpdate) => void) {
    this.paymentUpdateCallback = callback
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect()
    }
  }

  onQRExpired(callback: (event: QRExpiredEvent) => void) {
    this.qrExpiredCallback = callback
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect()
    }
  }

  offPaymentStatusUpdate() {
    this.paymentUpdateCallback = null
  }

  offQRExpired() {
    this.qrExpiredCallback = null
  }

  removeAllListeners() {
    this.paymentUpdateCallback = null
    this.qrExpiredCallback = null
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || false
  }

  ping() {
    this.sendMessage({ type: 'ping' })
  }
}

// Export singleton instance
export const socketService = new WebSocketService()
export type { PaymentStatusUpdate, QRExpiredEvent }