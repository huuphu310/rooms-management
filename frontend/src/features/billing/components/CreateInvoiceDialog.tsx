import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import type { InvoiceType, CreateDepositInvoice, CreatePartialInvoice } from '@/types/billing-enhanced'
import { Receipt, Plus } from 'lucide-react'

interface CreateInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvoiceCreated: () => void
}

export function CreateInvoiceDialog({ 
  open, 
  onOpenChange, 
  onInvoiceCreated 
}: CreateInvoiceDialogProps) {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('deposit')
  const [formData, setFormData] = useState({
    booking_id: '',
    due_date: '',
    notes: '',
    deposit_percentage: 30,
    amount: 0
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      if (invoiceType === 'deposit') {
        const depositData: CreateDepositInvoice = {
          booking_id: formData.booking_id,
          deposit_calculation: {
            method: 'percentage',
            value: formData.deposit_percentage
          },
          due_date: formData.due_date,
          notes: formData.notes
        }
        
        await billingEnhancedApi.createDepositInvoice(depositData)
      } else {
        const partialData: CreatePartialInvoice = {
          booking_id: formData.booking_id,
          invoice_type: invoiceType,
          items: [{
            description: `${invoiceType.charAt(0).toUpperCase() + invoiceType.slice(1)} payment`,
            amount: formData.amount,
            item_type: 'custom'
          }],
          due_date: formData.due_date,
          notes: formData.notes
        }
        
        await billingEnhancedApi.createPartialInvoice(partialData)
      }
      
      onInvoiceCreated()
      onOpenChange(false)
      
    } catch (error) {
      console.error('Failed to create invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create New Invoice
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Type Selection */}
          <div className="space-y-2">
            <Label>Invoice Type</Label>
            <Select value={invoiceType} onValueChange={(value: InvoiceType) => setInvoiceType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit Invoice</SelectItem>
                <SelectItem value="partial">Partial Payment</SelectItem>
                <SelectItem value="final">Final Payment</SelectItem>
                <SelectItem value="additional">Additional Charges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="booking_id">Booking ID *</Label>
              <Input
                id="booking_id"
                value={formData.booking_id}
                onChange={(e) => handleInputChange('booking_id', e.target.value)}
                placeholder="Enter booking ID"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Invoice Type Specific Fields */}
          {invoiceType === 'deposit' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deposit Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit_percentage">Deposit Percentage (%)</Label>
                    <Input
                      id="deposit_percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.deposit_percentage}
                      onChange={(e) => handleInputChange('deposit_percentage', parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage of booking total to collect as deposit
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (VND) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    placeholder="Enter payment amount"
                    required
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes for this invoice..."
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
              disabled={loading || !formData.booking_id || !formData.due_date}
            >
              {loading ? 'Creating...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}