import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import type { PaymentSchedule } from '@/types/billing-enhanced'
import { Calendar, Plus, Search, Filter, AlertCircle, Clock } from 'lucide-react'

export default function PaymentSchedules() {
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadSchedules()
    }
  }, [])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const data = await billingEnhancedApi.getPaymentSchedules()
      setSchedules(data)
    } catch (error) {
      console.error('Failed to load payment schedules:', error)
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
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    
    if (status === 'paid') {
      return <Badge variant="default">Paid</Badge>
    }
    
    if (status === 'pending' && due < today) {
      return <Badge variant="destructive">Overdue</Badge>
    }
    
    if (status === 'pending') {
      return <Badge variant="secondary">Pending</Badge>
    }
    
    return <Badge variant="outline">{status}</Badge>
  }

  const getStatusIcon = (status: string, dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    
    if (status === 'pending' && due < today) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    
    if (status === 'pending') {
      return <Clock className="h-4 w-4 text-yellow-500" />
    }
    
    return null
  }

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.booking_id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (statusFilter === 'all') return matchesSearch
    
    if (statusFilter === 'overdue') {
      const today = new Date()
      const due = new Date(schedule.due_date)
      return matchesSearch && schedule.status === 'pending' && due < today
    }
    
    return matchesSearch && schedule.status === statusFilter
  })

  const getStats = () => {
    const today = new Date()
    const pending = schedules.filter(s => s.status === 'pending')
    const overdue = pending.filter(s => new Date(s.due_date) < today)
    const totalPending = pending.reduce((sum, s) => sum + s.scheduled_amount, 0)
    const totalOverdue = overdue.reduce((sum, s) => sum + s.scheduled_amount, 0)

    return {
      total: schedules.length,
      pending: pending.length,
      overdue: overdue.length,
      paid: schedules.filter(s => s.status === 'paid').length,
      totalPending,
      totalOverdue
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
          <h2 className="text-3xl font-bold tracking-tight">Payment Schedules</h2>
          <p className="text-muted-foreground">
            Manage installment payments and due dates
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Schedule
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalPending)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalOverdue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Badge className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice or booking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {(['all', 'pending', 'overdue', 'paid'] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter)}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Payment Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payment Schedules ({filteredSchedules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payment Schedules</h3>
              <p className="text-muted-foreground mb-4">
                No payment schedules match your current filters
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(schedule.status, schedule.due_date)}
                        <span className="font-medium">{schedule.invoice_id.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.booking_id?.slice(0, 8) || '-'}
                    </TableCell>
                    <TableCell>
                      {schedule.installment_number} of {schedule.total_installments}
                    </TableCell>
                    <TableCell>{formatDate(schedule.due_date)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(schedule.scheduled_amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(schedule.status, schedule.due_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {schedule.status === 'pending' && (
                          <Button size="sm">Record Payment</Button>
                        )}
                        <Button size="sm" variant="outline">View</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}