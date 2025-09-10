import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { BookingList } from '@/components/bookings/BookingList'
import { BookingForm } from '@/components/bookings/BookingForm'
import { CheckInDialog } from '@/components/bookings/CheckInDialog'
import { CheckOutDialog } from '@/components/bookings/CheckOutDialog'
import { AssignRoomDialog } from '@/components/bookings/AssignRoomDialog'
import { CheckoutModal } from '@/features/checkout/CheckoutModal'
import { bookingsApi, type Booking, type BookingCreate } from '@/lib/api/bookings'
import { useQueryClient } from '@tanstack/react-query'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

export default function BookingsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false)
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAssignRoomDialogOpen, setIsAssignRoomDialogOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

  const handleCreateBooking = async (data: BookingCreate) => {
    try {
      await bookingsApi.create(data)
      toast({
        title: t('success'),
        description: t('bookingCreatedSuccessfully'),
      })
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.response?.data?.detail || t('failedToCreateBooking'),
        variant: 'destructive',
      })
    }
  }

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsViewDialogOpen(true)
  }

  const handleEditBooking = (booking: Booking) => {
    // TODO: Implement edit functionality
    toast({
      title: t('info'),
      description: t('editFeatureComingSoon'),
    })
  }

  const handleCheckIn = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsCheckInDialogOpen(true)
  }

  const handleCheckOut = (booking: Booking) => {
    setSelectedBooking(booking)
    // Use the new folio-based checkout modal for checked-in bookings
    if (booking.status === 'checked_in') {
      setIsCheckoutModalOpen(true)
    } else {
      setIsCheckOutDialogOpen(true)
    }
  }

  const handleAssignRoom = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsAssignRoomDialogOpen(true)
  }

  const handleCheckInSuccess = () => {
    toast({
      title: t('success'),
      description: t('checkInSuccessful'),
    })
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const handleCheckOutSuccess = () => {
    toast({
      title: t('success'),
      description: t('checkOutSuccessful'),
    })
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const handleAssignRoomSuccess = () => {
    toast({
      title: t('success'),
      description: t('roomAssignedSuccessfully'),
    })
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
    setIsAssignRoomDialogOpen(false)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('bookings.bookingManagement')}</h1>
          <p className="text-gray-600 mt-1">{t('bookings.manageYourBookings')}</p>
        </div>
        <PermissionGuard module="bookings" action="create">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('bookings.newBooking')}
          </Button>
        </PermissionGuard>
      </div>

      <BookingList
        onViewBooking={handleViewBooking}
        onEditBooking={handleEditBooking}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onAssignRoom={handleAssignRoom}
      />

      {/* Create Booking Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t('bookings.createNewBooking')}</DialogTitle>
            <DialogDescription>
              {t('bookings.fillInTheFormBelowToCreateANewBooking')}
            </DialogDescription>
          </DialogHeader>
          <BookingForm
            onSubmit={handleCreateBooking}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View Booking Dialog */}
      {selectedBooking && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('bookings.bookingDetails')}</DialogTitle>
              <DialogDescription>
                {t('bookings.viewBookingInformation')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Booking Header */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedBooking.booking_code}</h3>
                    <p className="text-sm text-gray-600">
                      {t('bookings.bookedOn')}: {new Date(selectedBooking.booking_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedBooking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    selectedBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedBooking.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                    selectedBooking.status === 'checked_out' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {t(selectedBooking.status)}
                  </span>
                </div>
              </div>

              {/* Guest Information */}
              <div>
                <h4 className="font-semibold mb-2">{t('bookings.guestInformation')}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">{t('bookings.guestName')}:</span>
                    <span className="ml-2 font-medium">{selectedBooking.guest_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('bookings.email')}:</span>
                    <span className="ml-2 font-medium">{selectedBooking.guest_email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('bookings.phone')}:</span>
                    <span className="ml-2 font-medium">{selectedBooking.guest_phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('bookings.country')}:</span>
                    <span className="ml-2 font-medium">{selectedBooking.guest_country || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div>
                <h4 className="font-semibold mb-2">{t('bookings.bookingDetails')}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">{t('bookings.checkIn')}:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedBooking.check_in_date).toLocaleDateString()} {selectedBooking.check_in_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('bookings.checkOut')}:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedBooking.check_out_date).toLocaleDateString()} {selectedBooking.check_out_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('bookings.nights')}:</span>
                    <span className="ml-2 font-medium">{selectedBooking.nights}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('bookings.guests')}:</span>
                    <span className="ml-2 font-medium">
                      {selectedBooking.adults} {t('bookings.adults')}
                      {selectedBooking.children > 0 && `, ${selectedBooking.children} ${t('bookings.children')}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('bookings.room')}:</span>
                    <span className="ml-2 font-medium">{selectedBooking.room_id || t('notAssigned')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('bookings.source')}:</span>
                    <span className="ml-2 font-medium">{t(selectedBooking.source)}</span>
                  </div>
                </div>
              </div>

              {/* Pricing Details */}
              <div>
                <h4 className="font-semibold mb-2">{t('common.pricingDetails')}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('bookings.roomCharge')}:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(selectedBooking.total_room_charge)}
                    </span>
                  </div>
                  {selectedBooking.extra_person_charge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('bookings.extraPersonCharge')}:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND'
                        }).format(selectedBooking.extra_person_charge)}
                      </span>
                    </div>
                  )}
                  {selectedBooking.service_charges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('bookings.serviceCharges')}:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND'
                        }).format(selectedBooking.service_charges)}
                      </span>
                    </div>
                  )}
                  {selectedBooking.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('common.discount')}:</span>
                      <span className="font-medium text-green-600">
                        -{new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND'
                        }).format(selectedBooking.discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">{t('bookings.totalAmount')}:</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(selectedBooking.total_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('bookings.totalPaid')}:</span>
                    <span className="font-medium text-green-600">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(selectedBooking.total_paid)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('bookings.balanceDue')}:</span>
                    <span className="font-medium text-red-600">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(selectedBooking.balance_due)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              {selectedBooking.special_requests && (
                <div>
                  <h4 className="font-semibold mb-2">{t('bookings.specialRequests')}</h4>
                  <p className="text-sm text-gray-600">{selectedBooking.special_requests}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Check-in Dialog */}
      {selectedBooking && (
        <CheckInDialog
          booking={selectedBooking}
          open={isCheckInDialogOpen}
          onClose={() => setIsCheckInDialogOpen(false)}
          onSuccess={handleCheckInSuccess}
        />
      )}

      {/* Check-out Dialog */}
      {selectedBooking && (
        <CheckOutDialog
          booking={selectedBooking}
          open={isCheckOutDialogOpen}
          onClose={() => setIsCheckOutDialogOpen(false)}
          onSuccess={handleCheckOutSuccess}
        />
      )}

      {/* Assign Room Dialog */}
      {selectedBooking && (
        <AssignRoomDialog
          booking={selectedBooking}
          open={isAssignRoomDialogOpen}
          onClose={() => setIsAssignRoomDialogOpen(false)}
          onSuccess={handleAssignRoomSuccess}
        />
      )}

      {/* New Folio-based Checkout Modal */}
      {selectedBooking && (
        <CheckoutModal
          bookingId={selectedBooking.id}
          open={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          onSuccess={() => {
            setIsCheckoutModalOpen(false)
            handleCheckOutSuccess()
          }}
        />
      )}
    </div>
  )
}