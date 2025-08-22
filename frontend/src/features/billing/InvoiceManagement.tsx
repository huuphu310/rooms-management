import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import { InvoiceDetailsDialog } from './components/InvoiceDetailsDialog'
import { CreateInvoiceDialog } from './components/CreateInvoiceDialog'
import type { 
  Invoice, 
  InvoiceSearchParams, 
  InvoiceStatus, 
  InvoiceType 
} from '@/types/billing-enhanced'
import { 
  Search, 
  Plus, 
  Eye, 
  Download, 
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  Filter
} from 'lucide-react'

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useState<InvoiceSearchParams>({
    page: 1,
    limit: 50,
    sort_by: 'created_at',
    order: 'desc'
  })
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadInvoices()
  }, [searchParams])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const data = await billingEnhancedApi.getInvoices(searchParams)
      setInvoices(data)
    } catch (error) {
      console.error('Failed to load invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (search: string) => {
    setSearchParams(prev => ({ ...prev, search, page: 1 }))
  }

  const handleStatusFilter = (status: string) => {
    const statusValue = status === 'all' ? undefined : status as InvoiceStatus
    setSearchParams(prev => ({ ...prev, status: statusValue, page: 1 }))
    setActiveTab(status)
  }

  const handleTypeFilter = (type: string) => {
    const typeValue = type === 'all' ? undefined : type as InvoiceType
    setSearchParams(prev => ({ ...prev, invoice_type: typeValue, page: 1 }))
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-orange-600' },
      partial: { variant: 'outline' as const, icon: AlertCircle, color: 'text-blue-600' },
      paid: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      overdue: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
      refunded: { variant: 'outline' as const, icon: Receipt, color: 'text-gray-600' },
      cancelled: { variant: 'outline' as const, icon: AlertCircle, color: 'text-gray-600' }
    }
    
    const config = variants[status]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTypeBadge = (type: InvoiceType) => {
    const colors = {
      deposit: 'bg-blue-100 text-blue-800',
      partial: 'bg-orange-100 text-orange-800',
      final: 'bg-green-100 text-green-800',
      additional: 'bg-purple-100 text-purple-800'
    }
    
    return (
      <Badge className={colors[type]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

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

  const getFilteredInvoices = () => {
    switch (activeTab) {
      case 'pending':
        return invoices.filter(invoice => invoice.status === 'pending')
      case 'paid':
        return invoices.filter(invoice => invoice.status === 'paid')
      case 'overdue':
        return invoices.filter(invoice => invoice.status === 'overdue')
      case 'deposits':
        return invoices.filter(invoice => invoice.invoice_type === 'deposit')
      default:
        return invoices
    }
  }

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowDetailsDialog(true)
  }

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const blob = await billingEnhancedApi.downloadInvoicePDF(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download PDF:', error)
    }
  }

  const handleSendReminder = async (invoiceId: string) => {
    try {
      await billingEnhancedApi.sendPaymentReminder(invoiceId)
      // Show success message
    } catch (error) {
      console.error('Failed to send reminder:', error)
    }
  }

  const getPendingCount = () => invoices.filter(i => i.status === 'pending').length
  const getPaidCount = () => invoices.filter(i => i.status === 'paid').length
  const getOverdueCount = () => invoices.filter(i => i.status === 'overdue').length
  const getDepositsCount = () => invoices.filter(i => i.invoice_type === 'deposit').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoice Management</h2>
          <p className="text-muted-foreground">
            Create, manage, and track all invoices and billing
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleStatusFilter('pending')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getPendingCount()}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleStatusFilter('paid')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getPaidCount()}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleStatusFilter('overdue')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getOverdueCount()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex-1 relative min-w-[300px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or booking code..."
                className="pl-10"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            
            <Select onValueChange={handleTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Invoice Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="final">Final</SelectItem>
                <SelectItem value="additional">Additional</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({invoices.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({getPendingCount()})</TabsTrigger>
              <TabsTrigger value="paid">Paid ({getPaidCount()})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({getOverdueCount()})</TabsTrigger>
              <TabsTrigger value="deposits">Deposits ({getDepositsCount()})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredInvoices().map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {invoice.invoice_number}
                          </code>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(invoice.invoice_type)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.booking_id.slice(0, 8)}...</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(invoice.invoice_date)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                            {invoice.balance_due > 0 && (
                              <p className="text-sm text-muted-foreground">
                                Balance: {formatCurrency(invoice.balance_due)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(invoice.paid_amount)}</p>
                            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                              <div 
                                className="bg-green-600 h-1 rounded-full"
                                style={{ 
                                  width: `${(invoice.paid_amount / invoice.total_amount) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell>
                          <div className={
                            new Date(invoice.due_date) < new Date() && invoice.status !== 'paid'
                              ? 'text-red-600 font-medium' : ''
                          }>
                            {formatDate(invoice.due_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(invoice.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendReminder(invoice.id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <InvoiceDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          invoice={selectedInvoice}
          onInvoiceUpdated={loadInvoices}
        />
      )}

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onInvoiceCreated={loadInvoices}
      />
    </div>
  )
}