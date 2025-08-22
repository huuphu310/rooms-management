import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import type { QRPayment, CreateQRPayment } from '@/types/billing-enhanced'
import { QrCode, Copy, Download, RefreshCw, Clock, CheckCircle } from 'lucide-react'

interface QRPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  invoiceNumber: string
  amount: number
  onPaymentCreated: () => void
}

export function QRPaymentDialog({ 
  open, 
  onOpenChange, 
  invoiceId,
  invoiceNumber,
  amount,
  onPaymentCreated 
}: QRPaymentDialogProps) {
  const [qrPayment, setQrPayment] = useState<QRPayment | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (open) {
      checkExistingQR()
    }
  }, [open, invoiceId])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const checkExistingQR = async () => {
    try {
      setLoading(true)
      const qrPayments = await billingEnhancedApi.getQRPayments()
      const existing = qrPayments.find(qr => 
        qr.invoice_id === invoiceId && 
        qr.status === 'active' &&
        new Date(qr.expires_at) > new Date()
      )
      
      if (existing) {
        setQrPayment(existing)
        updateCountdown(existing.expires_at)
      }
    } catch (error) {
      console.error('Failed to check existing QR:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    try {
      setGenerating(true)
      
      const qrData: CreateQRPayment = {
        invoice_id: invoiceId,
        expected_amount: amount,
        bank_code: 'VCB', // Default to VietComBank
        expires_in_minutes: 30
      }
      
      const newQrPayment = await billingEnhancedApi.createQRPayment(qrData)
      setQrPayment(newQrPayment)
      updateCountdown(newQrPayment.expires_at)
      
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    } finally {
      setGenerating(false)
    }
  }

  const updateCountdown = (expiresAt: string) => {
    const now = new Date().getTime()
    const expires = new Date(expiresAt).getTime()
    const diff = Math.max(0, Math.floor((expires - now) / 1000))
    setCountdown(diff)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const copyTransferContent = async () => {
    if (qrPayment?.transfer_content) {
      await navigator.clipboard.writeText(qrPayment.transfer_content)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const refreshStatus = async () => {
    if (qrPayment) {
      try {
        setLoading(true)
        const updated = await billingEnhancedApi.getQRPayment(qrPayment.id)
        setQrPayment(updated)
        
        if (updated.status === 'paid') {
          onPaymentCreated()
        }
      } catch (error) {
        console.error('Failed to refresh QR status:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Payment - Invoice {invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Payment Information</span>
                {qrPayment?.status === 'paid' && (
                  <Badge className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Paid
                  </Badge>
                )}
                {qrPayment?.status === 'active' && countdown > 0 && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Expires in {formatTime(countdown)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount to Pay</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">Vietnamese Bank Transfer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          {qrPayment ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    {/* QR Code Image */}
                    <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      {qrPayment.qr_code ? (
                        <img 
                          src={`data:image/png;base64,${qrPayment.qr_code}`} 
                          alt="QR Code" 
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                          <QrCode className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copyTransferContent}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Transfer Content
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download QR
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={refreshStatus}
                        disabled={loading}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transfer Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bank Transfer Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Bank:</span>
                      <span className="font-medium">{qrPayment.bank_code} - VietComBank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account Number:</span>
                      <span className="font-mono">{qrPayment.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account Name:</span>
                      <span className="font-medium">{qrPayment.account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="font-bold text-lg">{formatCurrency(qrPayment.expected_amount)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground mb-1">Transfer Content:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {qrPayment.transfer_content}
                        </code>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={copyTransferContent}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Important: Use this exact content for automatic payment matching
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="text-sm space-y-2">
                    <li>1. Open your banking app on your phone</li>
                    <li>2. Scan the QR code above OR manually enter bank details</li>
                    <li>3. Verify the amount: <strong>{formatCurrency(amount)}</strong></li>
                    <li>4. Use the exact transfer content: <code className="text-xs bg-gray-100 px-1 rounded">{qrPayment.transfer_content}</code></li>
                    <li>5. Complete the transfer</li>
                    <li>6. Payment will be automatically verified within 2-5 minutes</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <QrCode className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Generate QR Payment</h3>
              <p className="text-muted-foreground mb-6">
                Create a QR code for instant bank transfer payment
              </p>
              <Button 
                onClick={generateQRCode} 
                disabled={generating}
                size="lg"
              >
                {generating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}