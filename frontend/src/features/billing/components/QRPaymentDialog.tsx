import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import type { QRPayment, CreateQRPayment } from '@/types/billing-enhanced'
import { QrCode, Copy, Download, RefreshCw, Clock, CheckCircle, Building2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { socketService } from '@/lib/socket'
import type { PaymentStatusUpdate, QRExpiredEvent } from '@/lib/socket'

interface BankAccount {
  id: string
  account_id: string
  bank_code: string
  bank_name: string
  account_number: string
  account_name: string
  is_seapay_integrated: boolean
  is_default: boolean
  status: 'active' | 'inactive' | 'suspended'
}

interface QRCode {
  qr_code_id: string
  qr_image_url: string
  payment_content: string
  amount: number
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  expires_at: string
  bank_accounts: {
    account_number: string
    bank_code: string
    bank_name: string
  }
}

interface QRPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  invoiceNumber: string
  bookingId?: string
  amount: number
  onPaymentCreated: () => void
}

export function QRPaymentDialog({ 
  open, 
  onOpenChange, 
  invoiceId,
  invoiceNumber,
  bookingId,
  amount,
  onPaymentCreated 
}: QRPaymentDialogProps) {
  const [qrCode, setQrCode] = useState<QRCode | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { toast } = useToast()
  const { token } = useAuthStore()

  useEffect(() => {
    if (open) {
      loadBankAccounts()
      checkExistingQR()
      
      // Connect to WebSocket for real-time updates
      socketService.connect()
      socketService.joinInvoice(invoiceNumber)
      
      // Listen for payment status updates
      socketService.onPaymentStatusUpdate((update: PaymentStatusUpdate) => {
        if (update.invoice_code === invoiceNumber && qrCode?.qr_code_id === update.qr_code_id) {
          console.log('🔄 Received payment update via WebSocket:', update)
          
          setQrCode(prev => prev ? {
            ...prev,
            status: update.status
          } : null)
          
          if (update.status === 'paid') {
            toast({
              title: '✅ Payment Confirmed!',
              description: `Payment of ${formatCurrency(update.amount || amount)} has been received.`,
            })
            
            // Notify parent component
            onPaymentCreated()
            
            // Close dialog after a short delay
            setTimeout(() => {
              onOpenChange(false)
            }, 2000)
          }
        }
      })
      
      // Listen for QR expiration events
      socketService.onQRExpired((event: QRExpiredEvent) => {
        if (event.invoice_code === invoiceNumber && qrCode?.qr_code_id === event.qr_code_id) {
          console.log('⏰ QR code expired via WebSocket:', event)
          
          setQrCode(prev => prev ? {
            ...prev,
            status: 'expired'
          } : null)
          setCountdown(0)
          
          toast({
            title: '⏰ QR Code Expired',
            description: 'The QR code has expired. Please generate a new one.',
            variant: 'destructive'
          })
        }
      })
      
    } else {
      // Clean up socket connections when dialog closes
      socketService.leaveInvoice(invoiceNumber)
      socketService.offPaymentStatusUpdate()
      socketService.offQRExpired()
    }
    
    // Cleanup on unmount
    return () => {
      if (!open) {
        socketService.leaveInvoice(invoiceNumber)
        socketService.offPaymentStatusUpdate()
        socketService.offQRExpired()
      }
    }
  }, [open, invoiceId, invoiceNumber, qrCode?.qr_code_id, amount, onPaymentCreated, onOpenChange])

  useEffect(() => {
    // When bank account changes, regenerate QR code if one exists
    if (selectedBankId && qrCode && qrCode.status === 'pending') {
      generateQRCodeForBank(selectedBankId)
    }
  }, [selectedBankId])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    } else if (countdown === 0 && qrCode?.status === 'pending') {
      // When countdown reaches 0, mark as expired
      setQrCode(prev => prev ? { ...prev, status: 'expired' } : null)
    }
    return () => clearTimeout(timer)
  }, [countdown, qrCode?.status])

  // Refresh countdown from server time every 30 seconds to stay accurate
  useEffect(() => {
    if (!qrCode || qrCode.status !== 'pending') return

    const refreshTimer = setInterval(() => {
      updateCountdown(qrCode.expires_at)
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(refreshTimer)
  }, [qrCode])

  const loadBankAccounts = async () => {
    try {
      const response = await fetch('/api/v1/payment-integration/bank-accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const activeAccounts = data.data.filter((account: BankAccount) => 
          account.status === 'active' && account.is_seapay_integrated
        )
        setBankAccounts(activeAccounts)
        
        // Set default bank account
        const defaultAccount = activeAccounts.find((account: BankAccount) => account.is_default)
        if (defaultAccount) {
          setSelectedBankId(defaultAccount.account_id)
        } else if (activeAccounts.length > 0) {
          setSelectedBankId(activeAccounts[0].account_id)
        }
      }
    } catch (error) {
      console.error('Failed to load bank accounts:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bank accounts',
        variant: 'destructive',
      })
    }
  }

  const checkExistingQR = async () => {
    try {
      setLoading(true)
      // Search for existing QR codes for this invoice
      const response = await fetch(`/api/v1/payment-integration/qr-codes?invoice_code=${invoiceNumber}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const validQR = data.data.find((qr: QRCode) => 
          qr.status === 'pending' && new Date(qr.expires_at) > new Date()
        )
        
        if (validQR) {
          console.log('🔍 Found valid QR code:', {
            qr_code_id: validQR.qr_code_id,
            status: validQR.status,
            expires_at: validQR.expires_at,
            now: new Date().toISOString()
          })
          
          setQrCode(validQR)
          // Always update countdown when QR code is found
          if (validQR.status === 'pending') {
            updateCountdown(validQR.expires_at)
          } else {
            setCountdown(0)
          }
          // Set the bank account that was used for this QR code
          const matchingAccount = bankAccounts.find(account => 
            account.bank_code === validQR.bank_accounts.bank_code &&
            account.account_number === validQR.bank_accounts.account_number
          )
          if (matchingAccount) {
            setSelectedBankId(matchingAccount.account_id)
          }
        } else {
          // No valid QR code exists, auto-generate one
          await generateQRCodeAuto()
        }
      }
    } catch (error) {
      console.error('Failed to check existing QR:', error)
      // If check fails, try to generate new QR code
      await generateQRCodeAuto()
    } finally {
      setLoading(false)
    }
  }

  const generateQRCodeAuto = async () => {
    if (selectedBankId) {
      await generateQRCodeForBank(selectedBankId)
    }
  }

  const generateQRCodeForBank = async (bankAccountId: string) => {
    try {
      setGenerating(true)
      
      // Cancel existing QR code if it exists
      if (qrCode && qrCode.status === 'pending') {
        try {
          await fetch(`/api/v1/payment-integration/qr-codes/${qrCode.qr_code_id}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        } catch (cancelError) {
          console.warn('Failed to cancel existing QR code:', cancelError)
        }
      }
      
      const qrData = {
        account_id: bankAccountId,
        invoice_code: invoiceNumber,
        invoice_id: invoiceId,
        booking_id: bookingId || invoiceId,
        amount: amount,
        expiry_hours: 24, // 24 hour expiry (1 day)
        description: `Payment for invoice ${invoiceNumber}`
      }
      
      const response = await fetch('/api/v1/payment-integration/qr-codes/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(qrData)
      })
      
      if (response.ok) {
        const newQrCode = await response.json()
        
        // Transform the response to match our expected format
        const transformedQR: QRCode = {
          qr_code_id: newQrCode.qr_code_id,
          qr_image_url: newQrCode.qr_image_url,
          payment_content: newQrCode.payment_content,
          amount: newQrCode.amount,
          status: 'pending',
          expires_at: newQrCode.expires_at,
          bank_accounts: {
            account_number: newQrCode.bank_account,
            bank_code: newQrCode.bank_code,
            bank_name: bankAccounts.find(b => b.account_id === bankAccountId)?.bank_name || ''
          }
        }
        
        console.log('✨ New QR code generated:', {
          qr_code_id: newQrCode.qr_code_id,
          expires_at: newQrCode.expires_at,
          now: new Date().toISOString()
        })
        
        setQrCode(transformedQR)
        // Ensure countdown is always set for new QR codes
        updateCountdown(newQrCode.expires_at)
        
        toast({
          title: 'Success',
          description: 'QR code generated successfully',
        })
      } else {
        throw new Error('Failed to generate QR code')
      }
      
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate QR code. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const updateCountdown = (expiresAt: string) => {
    try {
      const now = new Date().getTime()
      const expires = new Date(expiresAt).getTime()
      const diff = Math.max(0, Math.floor((expires - now) / 1000))
      
      // Debug logging to check time calculation
      console.log('🕒 Countdown calculation:', {
        expiresAt,
        now: new Date().toISOString(),
        expires: new Date(expiresAt).toISOString(),
        diffSeconds: diff,
        diffMinutes: Math.floor(diff / 60),
        isValid: !isNaN(expires) && !isNaN(now)
      })
      
      // Only set countdown if we have a valid time difference
      if (!isNaN(diff) && isFinite(diff)) {
        setCountdown(diff)
      } else {
        console.warn('⚠️ Invalid countdown calculation, setting to 0')
        setCountdown(0)
      }
    } catch (error) {
      console.error('❌ Error in updateCountdown:', error)
      setCountdown(0)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const copyTransferContent = async () => {
    if (qrCode?.payment_content) {
      try {
        await navigator.clipboard.writeText(qrCode.payment_content)
        toast({
          title: 'Copied',
          description: 'Transfer content copied to clipboard',
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to copy to clipboard',
          variant: 'destructive',
        })
      }
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
    if (qrCode) {
      try {
        setLoading(true)
        const response = await fetch(`/api/v1/payment-integration/qr-codes/${qrCode.qr_code_id}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const statusData = await response.json()
          
          setQrCode(prev => prev ? {
            ...prev,
            status: statusData.status
          } : null)
          
          if (statusData.status === 'paid') {
            toast({
              title: 'Payment Received',
              description: 'Payment has been confirmed!',
            })
            onPaymentCreated()
          }
        }
      } catch (error) {
        console.error('Failed to refresh QR status:', error)
      } finally {
        setLoading(false)
      }
    }
  }
  
  const handleBankAccountChange = (bankAccountId: string) => {
    setSelectedBankId(bankAccountId)
    // Regenerate QR code immediately for new bank account
    if (qrCode) {
      generateQRCodeForBank(bankAccountId)
    }
  }
  
  const downloadQRCode = async () => {
    if (!qrCode?.qr_image_url) return
    
    try {
      // Fetch the QR code image
      const response = await fetch(qrCode.qr_image_url)
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `qr-payment-${invoiceNumber}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Success',
        description: 'QR code downloaded successfully',
      })
    } catch (error) {
      console.error('Failed to download QR code:', error)
      toast({
        title: 'Error',
        description: 'Failed to download QR code',
        variant: 'destructive',
      })
    }
  }
  
  const getSelectedBankAccount = (): BankAccount | undefined => {
    return bankAccounts.find(account => account.account_id === selectedBankId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Payment - Invoice {invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Generate and manage QR codes for Vietnamese bank transfer payments. 
            {qrCode?.status === 'pending' && countdown > 0 && ` QR code expires in ${formatTime(countdown)}.`}
            {qrCode?.status === 'paid' && ' Payment has been confirmed!'}
            {qrCode?.status === 'expired' && ' QR code has expired, please generate a new one.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6 pb-4">
          {/* Bank Account Selector */}
          {bankAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bank Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="bank-account">Select receiving bank account</Label>
                  <Select
                    value={selectedBankId}
                    onValueChange={handleBankAccountChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose bank account for payment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{account.bank_code}</span>
                            <span className="text-muted-foreground ml-2">
                              {account.account_number} - {account.bank_name}
                            </span>
                            {account.is_default && (
                              <Badge variant="outline" className="ml-2 text-xs">Default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBankId && qrCode && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span>Changing bank account will regenerate the QR code</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status and Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Payment Information</span>
                {qrCode?.status === 'paid' && (
                  <Badge className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Paid
                  </Badge>
                )}
                {qrCode?.status === 'pending' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {countdown > 0 ? `Expires in ${formatTime(countdown)}` : 'Expired'}
                  </Badge>
                )}
                {qrCode?.status === 'expired' && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Expired
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
          {qrCode ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    {/* QR Code Image */}
                    <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      {qrCode.qr_image_url ? (
                        <img 
                          src={qrCode.qr_image_url} 
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
                        onClick={downloadQRCode}
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
                      <span className="font-medium">{qrCode.bank_accounts.bank_code} - {qrCode.bank_accounts.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account Number:</span>
                      <span className="font-mono select-all">{qrCode.bank_accounts.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account Name:</span>
                      <span className="font-medium select-all">{getSelectedBankAccount()?.account_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="font-bold text-lg select-all">{formatCurrency(qrCode.amount)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground mb-1">Transfer Content:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {qrCode.payment_content}
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
                    <li>4. <strong>CRITICAL:</strong> Use the exact transfer content: <code className="text-xs bg-gray-100 px-1 rounded font-mono">{qrCode.payment_content}</code></li>
                    <li>5. Complete the transfer</li>
                    <li>6. Payment will be automatically verified within 2-5 minutes</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              {loading ? (
                <>
                  <RefreshCw className="mx-auto h-16 w-16 text-muted-foreground mb-4 animate-spin" />
                  <h3 className="text-lg font-medium mb-2">Loading QR Payment</h3>
                  <p className="text-muted-foreground">
                    Checking for existing QR codes and preparing payment...
                  </p>
                </>
              ) : generating ? (
                <>
                  <RefreshCw className="mx-auto h-16 w-16 text-muted-foreground mb-4 animate-spin" />
                  <h3 className="text-lg font-medium mb-2">Generating QR Payment</h3>
                  <p className="text-muted-foreground">
                    Creating QR code for instant bank transfer payment...
                  </p>
                </>
              ) : (
                <>
                  <QrCode className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">QR Payment Ready</h3>
                  <p className="text-muted-foreground mb-6">
                    QR code will be automatically generated when you open this dialog
                  </p>
                  <Button 
                    onClick={generateQRCodeAuto} 
                    disabled={!selectedBankId}
                    size="lg"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate QR Code
                  </Button>
                  {!selectedBankId && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Please select a bank account first
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}