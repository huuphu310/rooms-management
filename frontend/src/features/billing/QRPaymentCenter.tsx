import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import { QrCode, Plus, Eye, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface QRPayment {
  id: string
  qr_payment_id: string
  invoice_code: string
  amount: number
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  bank_account: string
  qr_image_url?: string
  transfer_content?: string
  expires_at: string
  created_at: string
  paid_at?: string
}

export default function QRPaymentCenter() {
  const [qrPayments, setQrPayments] = useState<QRPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'expired'>('all')
  const [dateFilter, setDateFilter] = useState('7days')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadQRPayments()
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when date filter changes
    loadQRPayments()
  }, [dateFilter])

  useEffect(() => {
    loadQRPayments()
  }, [currentPage])

  const loadQRPayments = async () => {
    try {
      setLoading(true)
      
      // Calculate date range based on filter
      const now = new Date()
      const daysMap: Record<string, number> = {
        '1day': 1,
        '7days': 7,
        '30days': 30,
        '90days': 90
      }
      const days = daysMap[dateFilter] || 7
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      
      const response = await billingEnhancedApi.getQRCodes({
        page: currentPage,
        limit: itemsPerPage,
        date_from: startDate.toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0]
      })
      
      console.log('QR Payments API response:', response)
      
      // Handle different possible response structures
      let paymentsData = []
      let total = 0
      
      if (Array.isArray(response)) {
        paymentsData = response
        total = response.length
      } else if (response.data && Array.isArray(response.data)) {
        paymentsData = response.data
        total = response.total || response.data.length
      } else if (response.qr_codes && Array.isArray(response.qr_codes)) {
        paymentsData = response.qr_codes
        total = response.total || response.qr_codes.length
      } else {
        console.warn('Unexpected API response structure:', response)
      }
      
      console.log('Processed payments data:', paymentsData)
      console.log('Total records:', total)
      setQrPayments(paymentsData)
      setTotalPages(Math.ceil(total / itemsPerPage) || 1)
    } catch (error) {
      console.error('Failed to load QR payments:', error)
      setQrPayments([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string, clickable = false) => {
    const variants = {
      pending: { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
      paid: { variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-200' },
      expired: { variant: 'outline' as const, className: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
      cancelled: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800 hover:bg-red-200' }
    }
    
    const config = variants[status as keyof typeof variants] || variants.pending
    
    return (
      <Badge 
        variant={config.variant} 
        className={`${config.className} ${clickable ? 'cursor-pointer' : ''}`}
        onClick={clickable ? () => {
          setStatusFilter(status as any)
          setCurrentPage(1)
        } : undefined}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredPayments = qrPayments.filter(payment => {
    const matchesSearch = (payment.invoice_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (payment.qr_payment_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && payment.status === statusFilter
  })

  const getStats = () => {
    const pending = qrPayments.filter(p => p.status === 'pending')
    const paid = qrPayments.filter(p => p.status === 'paid')
    const expired = qrPayments.filter(p => p.status === 'expired')

    return {
      total: qrPayments.length,
      pending: pending.length,
      paid: paid.length,
      expired: expired.length
    }
  }

  const stats = getStats()

  const handleViewQRPayment = (payment: QRPayment) => {
    // TODO: Implement QR payment details view
    console.log('Viewing QR payment:', payment)
    // This could open a modal with QR code image, payment details, etc.
  }

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
          <h2 className="text-3xl font-bold tracking-tight">QR Payment Center</h2>
          <p className="text-muted-foreground">
            Generate and manage VietQR codes for instant bank transfers
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Generate QR Code
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setStatusFilter('all')
                setCurrentPage(1)
              }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total QR Codes</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setStatusFilter('pending')
                setCurrentPage(1)
              }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setStatusFilter('paid')
                setCurrentPage(1)
              }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <QrCode className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice code or QR ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Last 7 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1day">Last 1 day</SelectItem>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex gap-2">
          {(['all', 'pending', 'paid', 'expired'] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter(filter)
                setCurrentPage(1)
              }}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* QR Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Payment Codes ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {qrPayments.length === 0 ? 'No QR Payments' : 'No Matching QR Payments'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {qrPayments.length === 0 
                  ? 'Generate VietQR codes for bank transfer payments with automatic reconciliation'
                  : 'No QR payments match your current filters'
                }
              </p>
              <Button onClick={() => setCurrentPage(1)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate QR Code
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transfer Content</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment, index) => (
                  <TableRow key={payment.id || payment.qr_payment_id || index}>
                    <TableCell>
                      <span className="font-medium">{payment.invoice_code || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status, true)}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {payment.transfer_content || payment.invoice_code || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.created_at ? formatDate(payment.created_at) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className={
                        payment.expires_at && new Date(payment.expires_at) < new Date() && payment.status === 'pending'
                          ? 'text-red-600 font-medium' : ''
                      }>
                        {payment.expires_at ? formatDate(payment.expires_at) : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewQRPayment(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination - Always show when there are items */}
          {(qrPayments.length > 0 || totalPages > 1) && (
            <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, qrPayments.length)} of {qrPayments.length} entries
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-muted-foreground mr-4">
                  Page {currentPage} of {Math.max(1, totalPages)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}