import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RecordPaymentDialog } from './RecordPaymentDialog'
import { QRPaymentDialog } from './QRPaymentDialog'
import type { Invoice } from '@/types/billing-enhanced'
import { Receipt, Download, Send, QrCode } from 'lucide-react'

interface InvoiceDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice
  onInvoiceUpdated: () => void
}

export function InvoiceDetailsDialog({ 
  open, 
  onOpenChange, 
  invoice, 
  onInvoiceUpdated 
}: InvoiceDetailsDialogProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showQRDialog, setShowQRDialog] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Invoice Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Invoice Type:</span>
                  <Badge>{invoice.invoice_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                    {invoice.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Issue Date:</span>
                  <span>{formatDate(invoice.invoice_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span>{formatDate(invoice.due_date)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Payment Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span className="font-medium text-green-600">{formatCurrency(invoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance Due:</span>
                  <span className="font-medium text-red-600">{formatCurrency(invoice.balance_due)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{ 
                      width: `${(invoice.paid_amount / invoice.total_amount) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <h4 className="font-medium mb-2">Invoice Items</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{item.item_type}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell>{formatCurrency(item.tax_amount)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({invoice.tax_rate}%):</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service Charge:</span>
              <span>{formatCurrency(invoice.service_charge)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount:</span>
              <span>-{formatCurrency(invoice.discount_amount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h4 className="font-medium mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            {(invoice.status === 'pending' || invoice.status === 'overdue') && (
              <Button variant="outline">
                <Send className="mr-2 h-4 w-4" />
                Send Reminder
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowQRDialog(true)}>
              <QrCode className="mr-2 h-4 w-4" />
              QR Payment
            </Button>
            <Button onClick={() => setShowPaymentDialog(true)}>
              Record Payment
            </Button>
          </div>
        </div>
      </DialogContent>

      <RecordPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        balanceDue={invoice.balance_due}
        onPaymentRecorded={() => {
          onInvoiceUpdated()
          setShowPaymentDialog(false)
        }}
      />

      <QRPaymentDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        amount={invoice.balance_due}
        onPaymentCreated={() => {
          onInvoiceUpdated()
          setShowQRDialog(false)
        }}
      />
    </Dialog>
  )
}