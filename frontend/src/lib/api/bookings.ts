import { api } from '../api'

export interface BookingStatus {
  PENDING: 'pending'
  CONFIRMED: 'confirmed'
  GUARANTEED: 'guaranteed'
  CHECKED_IN: 'checked_in'
  CHECKED_OUT: 'checked_out'
  CANCELLED: 'cancelled'
  NO_SHOW: 'no_show'
}

export interface PaymentStatus {
  PENDING: 'pending'
  DEPOSIT_PAID: 'deposit_paid'
  PARTIALLY_PAID: 'partially_paid'
  FULLY_PAID: 'fully_paid'
  REFUNDED: 'refunded'
}

export interface Booking {
  id: string
  booking_code: string
  booking_type: 'individual' | 'group' | 'corporate'
  
  // Customer Information
  customer_id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  guest_country?: string
  
  // Room Assignment
  room_type_id: string
  room_id?: string
  room_rate_type?: string
  
  // Dates and Times
  booking_date: string
  check_in_date: string
  check_out_date: string
  check_in_time: string
  check_out_time: string
  actual_check_in?: string
  actual_check_out?: string
  early_check_in: boolean
  late_check_out: boolean
  
  // Guest Count
  adults: number
  children: number
  infants: number
  total_guests: number
  
  // Pricing
  nights: number
  room_rate: number
  total_room_charge: number
  extra_person_charge: number
  extra_bed_charge: number
  service_charges: number
  tax_percentage?: number
  tax_amount: number
  discount_amount: number
  discount_reason?: string
  commission_amount: number
  commission_rate: number
  
  // Totals
  subtotal: number
  total_amount: number
  deposit_required: number
  deposit_paid: number
  total_paid: number
  balance_due: number
  
  // Status
  status: keyof BookingStatus
  payment_status: keyof PaymentStatus
  confirmation_sent: boolean
  confirmation_sent_at?: string
  
  // Source and Channel
  source: 'direct' | 'website' | 'phone' | 'email' | 'walk_in' | 'ota'
  channel?: string
  channel_booking_id?: string
  
  // Special Requests and Notes
  special_requests?: string
  dietary_requirements?: string
  arrival_method?: string
  arrival_details?: string
  purpose_of_visit?: string
  internal_notes?: Record<string, any>
  preferences?: Record<string, any>
  
  // Cancellation
  is_cancelled: boolean
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  cancellation_charge: number
  refund_amount: number
  refund_status?: string
  
  // Metadata
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface BookingCreate {
  booking_type?: 'individual' | 'group' | 'corporate'
  customer_id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  guest_country?: string
  room_type_id: string
  room_id?: string
  check_in_date: string
  check_out_date: string
  check_in_time?: string
  check_out_time?: string
  adults: number
  children?: number
  infants?: number
  room_rate: number
  extra_person_charge?: number
  extra_bed_charge?: number
  service_charges?: number
  tax_percentage?: number
  tax_amount?: number
  discount_amount?: number
  discount_reason?: string
  deposit_required?: number
  deposit_paid?: number
  source: 'direct' | 'website' | 'phone' | 'email' | 'walk_in' | 'ota'
  channel?: string
  special_requests?: string
  dietary_requirements?: string
  arrival_method?: string
  arrival_details?: string
  purpose_of_visit?: string
  preferences?: Record<string, any>
}

export interface BookingUpdate {
  room_id?: string
  check_in_date?: string
  check_out_date?: string
  check_in_time?: string
  check_out_time?: string
  adults?: number
  children?: number
  infants?: number
  room_rate?: number
  extra_charges?: number
  discount_amount?: number
  discount_reason?: string
  special_requests?: string
  dietary_requirements?: string
  internal_notes?: Record<string, any>
  status?: keyof BookingStatus
  payment_status?: keyof PaymentStatus
}

export interface CheckInRequest {
  room_id: string
  actual_check_in?: string
  early_check_in?: boolean
  notes?: string
}

export interface CheckOutRequest {
  actual_check_out?: string
  late_check_out?: boolean
  extra_charges?: number
  payment_method?: string
  payment_amount: number
  notes?: string
}

export interface BookingCancellation {
  reason: string
  cancellation_charge?: number
  refund_amount?: number
}

export interface BookingPayment {
  booking_id: string
  amount: number
  payment_method: string
  payment_reference?: string
  notes?: string
}

export interface BookingAvailabilityRequest {
  check_in_date: string
  check_out_date: string
  room_type_id?: string
  adults: number
  children?: number
}

export interface RoomAvailability {
  room_type_id: string
  room_type_name: string
  available_rooms: number
  total_rooms: number
  base_rate: number
  rate_with_seasonal: number
  can_book: boolean
}

export interface BookingAvailabilityResponse {
  available: boolean
  room_types: RoomAvailability[]
  total_nights: number
  check_in_date: string
  check_out_date: string
}

export interface BookingStatistics {
  total_bookings: number
  confirmed_bookings: number
  pending_bookings: number
  checked_in: number
  revenue_today: number
  revenue_month: number
  occupancy_rate: number
  average_stay_length: number
}

export interface BookingListParams {
  status?: keyof BookingStatus
  customer_id?: string
  room_type_id?: string
  room_id?: string
  check_in_date?: string
  check_out_date?: string
  search?: string
  page?: number
  limit?: number
}

// API Functions
export const bookingsApi = {
  // Create a new booking
  create: async (data: BookingCreate) => {
    const response = await api.post('/bookings/', data)
    return response.data
  },

  // Get booking by ID
  getById: async (id: string) => {
    const response = await api.get(`/bookings/${id}`)
    return response.data
  },

  // Get booking by code
  getByCode: async (code: string) => {
    const response = await api.get(`/bookings/code/${code}`)
    return response.data
  },

  // List bookings with filters
  list: async (params?: BookingListParams) => {
    // Filter out undefined and null values from params
    const cleanParams = params ? Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== 'null') {
        acc[key] = value
      }
      return acc
    }, {} as any) : undefined
    
    const response = await api.get('/bookings/', { params: cleanParams })
    return response.data
  },

  // Update booking
  update: async (id: string, data: BookingUpdate) => {
    const response = await api.put(`/bookings/${id}`, data)
    return response.data
  },

  // Delete booking
  delete: async (id: string) => {
    const response = await api.delete(`/bookings/${id}`)
    return response.data
  },

  // Check-in
  checkIn: async (id: string, data: CheckInRequest) => {
    const response = await api.post(`/bookings/${id}/check-in`, data)
    return response.data
  },

  // Check-out
  checkOut: async (id: string, data: CheckOutRequest) => {
    const response = await api.post(`/bookings/${id}/check-out`, data)
    return response.data
  },

  // Cancel booking
  cancel: async (id: string, data: BookingCancellation) => {
    const response = await api.post(`/bookings/${id}/cancel`, data)
    return response.data
  },

  // Confirm booking
  confirm: async (id: string) => {
    const response = await api.post(`/bookings/${id}/confirm`)
    return response.data
  },

  // Mark as no-show
  markNoShow: async (id: string, notes?: string) => {
    const response = await api.post(`/bookings/${id}/no-show`, { notes })
    return response.data
  },

  // Record payment
  recordPayment: async (id: string, data: Omit<BookingPayment, 'booking_id'>) => {
    const response = await api.post(`/bookings/${id}/payment`, data)
    return response.data
  },

  // Check availability
  checkAvailability: async (data: BookingAvailabilityRequest) => {
    const response = await api.post('/bookings/availability', data)
    return response.data as BookingAvailabilityResponse
  },

  // Get statistics
  getStatistics: async (start_date?: string, end_date?: string) => {
    const response = await api.get('/bookings/statistics/dashboard', {
      params: { start_date, end_date }
    })
    return response.data as BookingStatistics
  },

  // Check room availability
  checkRoomAvailability: async (params: {
    booking_id?: string
    check_in_date?: string
    check_out_date?: string
    room_type_id?: string
    guest_count?: number
  }) => {
    const response = await api.post('/bookings/room-availability', params)
    return response.data
  },

  // Assign room to booking
  assignRoom: async (bookingId: string, roomId: string) => {
    const response = await api.post(`/bookings/${bookingId}/assign-room`, { room_id: roomId })
    return response.data
  }
}