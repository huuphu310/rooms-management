import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import type { PaymentMethod, RecordPayment } from '@/types/billing-enhanced'
import { CreditCard, DollarSign } from 'lucide-react'

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  invoiceNumber: string
  balanceDue: number
  onPaymentRecorded: () => void
}

export function RecordPaymentDialog({ 
  open, 
  onOpenChange, 
  invoiceId,
  invoiceNumber,
  balanceDue,
  onPaymentRecorded 
}: RecordPaymentDialogProps) {
  const [formData, setFormData] = useState({
    amount: balanceDue,
    payment_method: 'cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        amount: balanceDue
      }))
    }
  }, [open, balanceDue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const paymentData: RecordPayment = {
        invoice_id: invoiceId,
        amount: formData.amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        transaction_reference: formData.transaction_reference || undefined,
        notes: formData.notes || undefined
      }
      
      await billingEnhancedApi.recordPayment(paymentData)
      
      onPaymentRecorded()
      onOpenChange(false)
      
    } catch (error) {
      console.error('Failed to record payment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment - Invoice {invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Balance Due:</span>
                  <span className="font-medium text-red-600">{formatCurrency(balanceDue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Amount:</span>
                  <span className="font-medium text-green-600">{formatCurrency(formData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span className="font-medium">
                    {formatCurrency(Math.max(0, balanceDue - formData.amount))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount (VND) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                max={balanceDue}
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(value: PaymentMethod) => handleInputChange('payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="e_wallet">E-Wallet</SelectItem>
                  <SelectItem value="qr_code">QR Code Payment</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => handleInputChange('payment_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_reference">Transaction Reference</Label>
              <Input
                id="transaction_reference"
                value={formData.transaction_reference}
                onChange={(e) => handleInputChange('transaction_reference', e.target.value)}
                placeholder="Transaction ID, check number, etc."
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes for this payment..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.amount <= 0 || formData.amount > balanceDue}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}