import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import type { Payment } from '@/types/billing-enhanced'
import { CreditCard, Plus, Filter, Download, Search, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { RecordDirectPaymentDialog } from './components/RecordDirectPaymentDialog'
import { useToast } from '@/components/ui/use-toast'

export default function PaymentManagement() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadPayments()
    }
  }, [])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const data = await billingEnhancedApi.getPayments()
      setPayments(data)
    } catch (error) {
      console.error('Failed to load payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentRecorded = () => {
    toast({
      title: 'Success',
      description: 'Payment has been recorded successfully',
    })
    loadPayments() // Reload payments list
  }

  const handleRecordPaymentClick = () => {
    setIsPaymentDialogOpen(true)
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

  const getPaymentMethodBadge = (method: string) => {
    const methodColors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800',
      card: 'bg-blue-100 text-blue-800',
      bank_transfer: 'bg-purple-100 text-purple-800',
      e_wallet: 'bg-orange-100 text-orange-800',
      qr_code: 'bg-indigo-100 text-indigo-800',
      check: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={methodColors[method] || 'bg-gray-100 text-gray-800'}>
        {method.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transaction_reference?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter
    
    return matchesSearch && matchesMethod
  })

  const getStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayPayments = payments.filter(p => p.payment_date === today)
    const totalToday = todayPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

    return {
      total: payments.length,
      totalAmount,
      todayCount: todayPayments.length,
      totalToday
    }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payment Management</h2>
          <p className="text-muted-foreground">
            Track and manage all payment transactions
          </p>
        </div>
        <Button onClick={handleRecordPaymentClick}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Payments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalToday)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice ID or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {(['all', 'cash', 'card', 'bank_transfer', 'e_wallet', 'qr_code'] as const).map((filter) => (
            <Button
              key={filter}
              variant={methodFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMethodFilter(filter)}
            >
              {filter === 'all' ? 'All' : filter.replace('_', ' ')}
            </Button>
          ))}
        </div>

        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Transactions ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payments Found</h3>
              <p className="text-muted-foreground mb-4">
                No payments match your current filters
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
                <Button onClick={handleRecordPaymentClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.invoice_id?.slice(0, 8) || '-'}
                    </TableCell>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodBadge(payment.payment_method)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.transaction_reference || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Completed</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <RecordDirectPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  )
}