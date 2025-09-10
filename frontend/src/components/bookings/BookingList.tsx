import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  MoreHorizontal, 
  Search, 
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Eye,
  Edit,
  CreditCard,
  Home,
  Clock,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { bookingsApi, type Booking, type BookingListParams } from '@/lib/api/bookings'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { RecordDirectPaymentDialog } from '@/features/billing/components/RecordDirectPaymentDialog'

interface BookingListProps {
  onViewBooking: (booking: Booking) => void
  onEditBooking: (booking: Booking) => void
  onCheckIn: (booking: Booking) => void
  onCheckOut: (booking: Booking) => void
  onAssignRoom?: (booking: Booking) => void
}

export function BookingList({ 
  onViewBooking, 
  onEditBooking,
  onCheckIn,
  onCheckOut,
  onAssignRoom 
}: BookingListProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState<BookingListParams>({
    page: 1,
    limit: 20
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  // Update filters when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const statusFilter = tab === 'all' ? undefined : 
                        tab === 'unassigned' ? 'confirmed' : 
                        tab === 'in_house' ? 'checked_in' : tab
    
    // Create new filters object
    const newFilters: BookingListParams = {
      ...filters,
      status: statusFilter as any,
      page: 1
    }
    
    // Remove room_id for most tabs, don't set it at all for unassigned
    // Backend should handle filtering unassigned rooms based on status=confirmed and no room assigned
    if (tab !== 'unassigned' && 'room_id' in newFilters) {
      delete newFilters.room_id
    }
    
    setFilters(newFilters)
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', filters, activeTab],
    queryFn: () => bookingsApi.list(filters)
  })

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      check_in_date: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      check_out_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      page: 1
    }))
  }

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : status as any,
      page: 1
    }))
  }

  const handleConfirm = async (booking: Booking) => {
    try {
      await bookingsApi.confirm(booking.id)
      toast({
        title: t('bookingConfirmed'),
        description: `${t('bookingCode')}: ${booking.booking_code}`
      })
      refetch()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToConfirmBooking'),
        variant: 'destructive'
      })
    }
  }

  const handleCancel = async (booking: Booking) => {
    try {
      await bookingsApi.cancel(booking.id, {
        reason: 'Cancelled by staff'
      })
      toast({
        title: t('bookingCancelled'),
        description: `${t('bookingCode')}: ${booking.booking_code}`
      })
      refetch()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToCancelBooking'),
        variant: 'destructive'
      })
    }
  }

  const handleNoShow = async (booking: Booking) => {
    try {
      await bookingsApi.markNoShow(booking.id)
      toast({
        title: t('markedAsNoShow'),
        description: `${t('bookingCode')}: ${booking.booking_code}`
      })
      refetch()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToMarkNoShow'),
        variant: 'destructive'
      })
    }
  }

  const handleRecordPayment = (booking: Booking) => {
    setSelectedBookingForPayment(booking)
    setShowPaymentDialog(true)
  }

  const handlePaymentRecorded = () => {
    setShowPaymentDialog(false)
    setSelectedBookingForPayment(null)
    refetch()
    toast({
      title: t('success'),
      description: t('paymentRecorded')
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmed: 'bg-green-100 text-green-800 border-green-300',
      guaranteed: 'bg-blue-100 text-blue-800 border-blue-300',
      checked_in: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      checked_out: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      no_show: 'bg-orange-100 text-orange-800 border-orange-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      fully_paid: '✓',
      deposit_paid: '◐',
      partially_paid: '◔',
      pending: '○',
      refunded: '↩'
    }
    return icons[status] || '?'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all" className="flex items-center gap-2">
            {t('all')}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('pending')}
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('unassigned')}
          </TabsTrigger>
          <TabsTrigger value="in_house" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            {t('inHouse')}
          </TabsTrigger>
          <TabsTrigger value="checked_out" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            {t('checkedOut')}
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {t('cancelled')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg shadow">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('searchByCodeNameEmail')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                      </>
                    ) : (
                      format(dateRange.from, 'MMM dd, yyyy')
                    )
                  ) : (
                    <span>{t('selectDateRange')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange as any}
                  onSelect={setDateRange as any}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button onClick={handleSearch}>{t('search')}</Button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bookingCode')}</TableHead>
              <TableHead>{t('guest')}</TableHead>
              <TableHead>{t('assignedRoom') || 'Assigned Room'}</TableHead>
              <TableHead>{t('checkIn')}</TableHead>
              <TableHead>{t('checkOut')}</TableHead>
              <TableHead>{t('nights')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('payment')}</TableHead>
              <TableHead>{t('total')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  {t('loading')}...
                </TableCell>
              </TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  {t('noBookingsFound')}
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((booking: Booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.booking_code}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{booking.guest_name}</div>
                      {booking.guest_email && (
                        <div className="text-sm text-gray-500">{booking.guest_email}</div>
                      )}
                      {booking.guest_phone && (
                        <div className="text-sm text-gray-500">{booking.guest_phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {booking.room_id ? (
                        <div className="flex items-center gap-1">
                          <Home className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">
                            {booking.room_number || `Room ${booking.room_id.slice(0, 8)}...`}
                          </span>
                          {booking.room_type && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                              {booking.room_type}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">{t('notAssigned') || 'Not assigned'}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{format(new Date(booking.check_in_date), 'MMM dd, yyyy')}</div>
                      <div className="text-sm text-gray-500">{booking.check_in_time}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{format(new Date(booking.check_out_date), 'MMM dd, yyyy')}</div>
                      <div className="text-sm text-gray-500">{booking.check_out_time}</div>
                    </div>
                  </TableCell>
                  <TableCell>{booking.nights}</TableCell>
                  <TableCell>
                    <Badge className={cn(getStatusColor(booking.status))}>
                      {t(booking.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-lg">{getPaymentStatusIcon(booking.payment_status)}</span>
                      <div>
                        <div className="text-sm font-medium">{t(booking.payment_status)}</div>
                        {booking.balance_due > 0 && (
                          <div className="text-xs text-red-600">
                            {formatCurrency(booking.balance_due)} {t('due')}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatCurrency(booking.total_amount)}</div>
                      {booking.total_paid > 0 && (
                        <div className="text-sm text-green-600">
                          {formatCurrency(booking.total_paid)} {t('paid')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onViewBooking(booking)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('viewDetails')}
                        </DropdownMenuItem>
                        
                        {booking.status === 'pending' as any && (
                          <>
                            <DropdownMenuItem onClick={() => handleConfirm(booking)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {t('confirm')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditBooking(booking)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('edit')}
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {booking.status === 'confirmed' as any && (
                          <>
                            {!booking.room_id && onAssignRoom && (
                              <DropdownMenuItem onClick={() => onAssignRoom(booking)}>
                                <Home className="mr-2 h-4 w-4" />
                                {t('assignRoom')}
                              </DropdownMenuItem>
                            )}
                            {booking.room_id && (
                              <DropdownMenuItem onClick={() => onCheckIn(booking)}>
                                <LogIn className="mr-2 h-4 w-4" />
                                {t('checkIn')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleNoShow(booking)}>
                              <XCircle className="mr-2 h-4 w-4" />
                              {t('markNoShow')}
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {booking.status === 'checked_in' as any && (
                          <DropdownMenuItem onClick={() => onCheckOut(booking)}>
                            <LogOut className="mr-2 h-4 w-4" />
                            {t('checkOut')}
                          </DropdownMenuItem>
                        )}
                        
                        {booking.balance_due > 0 && (
                          <DropdownMenuItem onClick={() => handleRecordPayment(booking)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            {t('recordPayment')}
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {!['cancelled', 'checked_out'].includes(booking.status) && (
                          <DropdownMenuItem 
                            onClick={() => handleCancel(booking)}
                            className="text-red-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            {t('cancel')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-700">
              {t('showing')} {((data.pagination.page - 1) * data.pagination.limit) + 1} - {' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} {' '}
              {t('of')} {data.pagination.total} {t('bookings')}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page! - 1 }))}
                disabled={data.pagination.page === 1}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                disabled={data.pagination.page === data.pagination.total_pages}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </div>
        </TabsContent>
      </Tabs>
      
      {/* Payment Recording Dialog */}
      {selectedBookingForPayment && (
        <RecordDirectPaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          preselectedBooking={selectedBookingForPayment}
          preselectedBookingId={selectedBookingForPayment.id}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  )
}