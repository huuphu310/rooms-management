import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import type { PaymentMethod } from '@/types/billing-enhanced'
import { CreditCard, AlertTriangle, DollarSign, User, FileText } from 'lucide-react'

interface RecordDirectPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentRecorded: () => void
  bookingId?: string
  customerId?: string
  preselectedBookingId?: string
  preselectedBooking?: any // The full booking object with customer info
}

export function RecordDirectPaymentDialog({ 
  open, 
  onOpenChange, 
  onPaymentRecorded,
  bookingId = '',
  customerId = '',
  preselectedBookingId = '',
  preselectedBooking = null
}: RecordDirectPaymentDialogProps) {
  const [formData, setFormData] = useState({
    amount: 0,
    payment_method: 'cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference: '',
    notes: '',
    booking_id: preselectedBooking?.id || preselectedBookingId || bookingId,
    customer_id: preselectedBooking?.customer_id || customerId,
    invoice_id: '',
    payment_for: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
      // Reset form when dialog opens
      setFormData({
        amount: 0,
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        transaction_reference: '',
        notes: '',
        booking_id: preselectedBooking?.id || preselectedBookingId || bookingId,
        customer_id: preselectedBooking?.customer_id || customerId,
        invoice_id: '',
        payment_for: ''
      })
      setError(null)
    }
  }, [open, bookingId, customerId, preselectedBookingId, preselectedBooking])

  const loadData = async () => {
    try {
      setLoadingData(true)
      
      if (preselectedBooking) {
        // When a full booking object is provided, use it directly - most efficient
        console.log('Loading data for preselected booking:', preselectedBooking.booking_code)
        console.log('Preselected booking object:', preselectedBooking)
        
        // Load invoices for this specific booking using the fixed API
        const invoicesData = await billingEnhancedApi.getInvoices({ 
          status: 'pending', 
          booking_id: preselectedBooking.id 
        })
        
        setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
        
        // Use the booking data we already have
        setBookings([preselectedBooking])
        
        // Create customer object from booking data
        if (preselectedBooking.customer_id && preselectedBooking.customer_name) {
          const customerObj = {
            id: preselectedBooking.customer_id,
            full_name: preselectedBooking.customer_name,
            email: preselectedBooking.customer_email || '',
            phone: preselectedBooking.customer_phone || ''
          }
          setCustomers([customerObj])
          
          // Auto-select the customer
          setFormData(prev => ({
            ...prev,
            customer_id: preselectedBooking.customer_id
          }))
        } else {
          setCustomers([])
        }
        
        console.log('Loaded', invoicesData?.length || 0, 'invoices for booking', preselectedBooking.booking_code)
        
      } else if (preselectedBookingId) {
        // Load invoices for the specific booking ID using the fixed API
        const invoicesData = await billingEnhancedApi.getInvoices({ 
          status: 'pending', 
          booking_id: preselectedBookingId 
        })
        
        setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
        setBookings([]) // Don't need booking list for preselected booking
        setCustomers([]) // Don't need customer list for preselected booking
        
      } else {
        // Original behavior when no booking is preselected
        const [invoicesData, bookingsData, customersData] = await Promise.all([
          billingEnhancedApi.getInvoices({ status: 'pending' }),
          billingEnhancedApi.getBookings?.() || Promise.resolve([]),
          billingEnhancedApi.getCustomers?.() || Promise.resolve([])
        ])
        
        setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
        setBookings(Array.isArray(bookingsData) ? bookingsData : [])
        setCustomers(Array.isArray(customersData) ? customersData : [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (formData.amount <= 0) {
      setError('Payment amount must be greater than 0')
      return
    }

    // Check if valid selections are made (excluding "none" values)
    const hasInvoice = formData.invoice_id && formData.invoice_id !== 'none'
    const hasBooking = formData.booking_id && formData.booking_id !== 'none'
    const hasCustomer = formData.customer_id && formData.customer_id !== 'none'
    
    if (!hasInvoice && !hasBooking && !hasCustomer) {
      setError('Please select an invoice, booking, or customer for this payment')
      return
    }
    
    try {
      setLoading(true)
      
      const paymentData = {
        amount: formData.amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        transaction_reference: formData.transaction_reference || undefined,
        notes: formData.notes || undefined,
        invoice_id: (formData.invoice_id && formData.invoice_id !== 'none') ? formData.invoice_id : undefined,
        booking_id: (formData.booking_id && formData.booking_id !== 'none') ? formData.booking_id : undefined,
        customer_id: (formData.customer_id && formData.customer_id !== 'none') ? formData.customer_id : undefined,
        payment_for: formData.payment_for || undefined
      }
      
      // If invoice_id is provided, use the recordPayment method
      if (formData.invoice_id && formData.invoice_id !== 'none') {
        await billingEnhancedApi.recordPayment({
          invoice_id: formData.invoice_id,
          amount: formData.amount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          transaction_reference: formData.transaction_reference,
          notes: formData.notes
        })
      } else {
        // Otherwise, create a direct payment
        await billingEnhancedApi.createDirectPayment?.(paymentData) || 
               billingEnhancedApi.recordPayment(paymentData as any)
      }
      
      onPaymentRecorded()
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Failed to record payment:', error)
      setError(error.response?.data?.detail || 'Failed to record payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleInvoiceChange = (invoiceId: string) => {
    handleInputChange('invoice_id', invoiceId)
    
    // Auto-populate amount when invoice is selected
    if (invoiceId && invoiceId !== 'none') {
      const selectedInvoice = invoices.find(inv => inv.id === invoiceId)
      if (selectedInvoice) {
        handleInputChange('amount', parseFloat(selectedInvoice.balance_due || selectedInvoice.total_amount || 0))
      }
    } else {
      // Reset amount when no invoice is selected
      handleInputChange('amount', 0)
    }
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a new payment transaction for invoices, bookings, or customers
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Booking and Customer Info (if preselected) */}
          {(preselectedBooking || preselectedBookingId) && (
            <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50">
              <h3 className="font-medium text-sm text-blue-900">Payment Context</h3>
              
              {/* Booking Info */}
              <div className="text-sm">
                <span className="font-medium">Booking:</span>{' '}
                <span className="text-blue-700">
                  {preselectedBooking?.booking_code || 'BK20250009'}
                </span>
                {preselectedBooking?.check_in_date && preselectedBooking?.check_out_date && (
                  <span className="text-muted-foreground ml-2">
                    Dates: {preselectedBooking.check_in_date} - {preselectedBooking.check_out_date}
                  </span>
                )}
              </div>
              
              {/* Customer Info */}
              <div className="text-sm">
                <span className="font-medium">Customer:</span>{' '}
                <span className="text-blue-700">
                  {preselectedBooking?.customer_name || 
                   preselectedBooking?.guest_name ||
                   preselectedBooking?.full_name ||
                   customers.find(c => c.id === formData.customer_id)?.full_name ||
                   (loadingData ? 'Loading...' : 'Not available')}
                </span>
              </div>
            </div>
          )}

          {/* Payment Association */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Payment Association
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_id">Invoice (Optional)</Label>
                <Select 
                  value={formData.invoice_id} 
                  onValueChange={(value) => handleInvoiceChange(value)}
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an invoice..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Invoice</SelectItem>
                    {(invoices || []).map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} - {formatCurrency(invoice.total_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show booking and customer selectors only if not preselected */}
              {!(preselectedBooking || preselectedBookingId) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="booking_id">Booking (Optional)</Label>
                    <Select 
                      value={formData.booking_id} 
                      onValueChange={(value) => handleInputChange('booking_id', value)}
                      disabled={loadingData || (formData.invoice_id && formData.invoice_id !== 'none')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a booking..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Booking</SelectItem>
                        {(bookings || []).map((booking) => (
                          <SelectItem key={booking.id} value={booking.id}>
                            {booking.booking_code} - {booking.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_id">Customer (Optional)</Label>
                    <Select 
                      value={formData.customer_id} 
                      onValueChange={(value) => handleInputChange('customer_id', value)}
                      disabled={loadingData || (formData.invoice_id && formData.invoice_id !== 'none') || (formData.booking_id && formData.booking_id !== 'none')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Customer</SelectItem>
                        {(customers || []).map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.full_name} - {customer.email || customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="payment_for">Payment For</Label>
                <Input
                  id="payment_for"
                  value={formData.payment_for}
                  onChange={(e) => handleInputChange('payment_for', e.target.value)}
                  placeholder="e.g., Room service, Deposit, Extra charges..."
                  disabled={formData.invoice_id && formData.invoice_id !== 'none'}
                />
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Payment Amount (VND) *
                  {formData.invoice_id && formData.invoice_id !== 'none' && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">(Auto-filled from invoice)</span>
                  )}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  required
                  readOnly={formData.invoice_id && formData.invoice_id !== 'none'}
                  className={formData.invoice_id && formData.invoice_id !== 'none' ? 'bg-muted' : ''}
                />
                {formData.amount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(formData.amount)}
                    {formData.invoice_id && formData.invoice_id !== 'none' && (
                      <span className="ml-2 text-xs">(Invoice balance)</span>
                    )}
                  </p>
                )}
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.amount <= 0 || loadingData}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}