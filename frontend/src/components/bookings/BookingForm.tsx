import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, Search, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { InputWithError } from '@/components/ui/input-with-error'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { bookingsApi, type BookingCreate, type RoomAvailability } from '@/lib/api/bookings'
import { customersApi, type Customer } from '@/lib/api/customers'
import { pricingApi, type PriceCalculationResponse } from '@/lib/api/pricing'
import roomService, { type RoomType } from '@/services/roomService'
import { PricingTab } from './PricingTab'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
import { useToast } from '@/hooks/use-toast'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useAuthStore } from '@/stores/authStore'

const bookingSchema = z.object({
  guest_name: z.string().min(1, 'Guest name is required'),
  guest_email: z.string().email().optional().or(z.literal('')),
  guest_phone: z.string().optional(),
  guest_country: z.string().optional(),
  room_type_id: z.string().min(1, 'Room type is required'),
  check_in_date: z.date(),
  check_out_date: z.date(),
  // Times will be set automatically based on shift_type
  adults: z.number().min(1, 'At least 1 adult is required'),
  children: z.number().min(0),
  infants: z.number().min(0),
  room_rate: z.number().min(0),
  service_charges: z.number().min(0),
  tax_percentage: z.number().min(0).max(100),
  tax_amount: z.number().min(0),
  discount_type: z.enum(['percentage', 'amount']),
  discount_value: z.number().min(0),
  discount_amount: z.number().min(0),
  discount_reason: z.string().optional(),
  deposit_required: z.number().min(0),
  deposit_amount: z.number().min(0).optional(),
  source: z.enum(['direct', 'website', 'phone', 'email', 'walk_in', 'ota']),
  channel: z.string().optional(),
  special_requests: z.string().optional(),
  dietary_requirements: z.string().optional(),
  arrival_method: z.string().optional(),
  arrival_details: z.string().optional(),
  purpose_of_visit: z.string().optional(),
  selected_currency: z.string().optional(),
  exchange_rate: z.number().optional(),
  // Shift-based booking fields
  shift_type: z.enum(['traditional', 'day_shift', 'night_shift', 'full_day']).optional(),
  shift_date: z.date().optional(),
  total_shifts: z.number().min(1).optional(),
}).refine(data => data.check_out_date > data.check_in_date, {
  message: "Check-out date must be after check-in date",
  path: ["check_out_date"]
})

interface BookingFormProps {
  onSubmit: (data: BookingCreate) => Promise<void>
  onCancel: () => void
  initialData?: Partial<BookingCreate>
}

export function BookingForm({ onSubmit, onCancel, initialData }: BookingFormProps) {
  const { t } = useLanguage()
  const { formatCurrency, getDisplayCurrencies, exchangeRates, availableCurrencies, convertFromVND } = useCurrency()
  const { hasPermission } = useAuthStore()
  
  // Check if user has required permissions
  const canCreateBookings = hasPermission('bookings.create')
  const canAccessRooms = hasPermission('rooms.read')
  
  // If user doesn't have booking creation permission, show notification
  if (!canCreateBookings) {
    return (
      <PermissionGuard 
        permission="bookings.create" 
        notificationVariant="inline"
        customMessage={t('bookings.noPermissionToCreateBookings')}
      >
        <div />
      </PermissionGuard>
    )
  }
  const [isLoading, setIsLoading] = useState(false)
  const [availability, setAvailability] = useState<RoomAvailability[]>([])
  const [availabilityResponse, setAvailabilityResponse] = useState<{available: boolean, room_types: RoomAvailability[]} | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [calculatingPrice, setCalculatingPrice] = useState(false)
  const [priceDetails, setPriceDetails] = useState<PriceCalculationResponse | null>(null)
  
  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [showNewCustomer, setShowNewCustomer] = useState(true)
  
  const debouncedCustomerSearch = useDebounce(customerSearch, 500)
  const { toast } = useToast()
  
  // Generate a unique idempotency key for this form submission
  const idempotencyKey = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 15)}`)
  
  // Only fetch room types if user has permission (reuse existing hasPermission from above)
  const hasRoomPermission = hasPermission('rooms.read')
  
  // Fetch room types
  const { data: roomTypes, isLoading: loadingRoomTypes } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: async () => {
      const response = await roomService.getRoomTypes()
      return response.data
    },
    enabled: hasRoomPermission // Only fetch if user has permission
  })

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange', // Enable validation on change to provide immediate feedback
    defaultValues: {
      guest_name: initialData?.guest_name || '',
      guest_email: initialData?.guest_email || '',
      guest_phone: initialData?.guest_phone || '',
      guest_country: initialData?.guest_country || 'Vietnam',
      room_type_id: initialData?.room_type_id || '',
      check_in_date: initialData?.check_in_date ? new Date(initialData.check_in_date) : new Date(),
      check_out_date: initialData?.check_out_date ? new Date(initialData.check_out_date) : new Date(Date.now() + 86400000),
      // Times will be set based on shift_type
      adults: initialData?.adults || 1,
      children: initialData?.children || 0,
      infants: initialData?.infants || 0,
      room_rate: initialData?.room_rate ?? 0,
      service_charges: initialData?.service_charges ?? 0,
      tax_percentage: initialData?.tax_percentage ?? 10, // Default 10% VAT
      tax_amount: initialData?.tax_amount ?? 0,
      discount_type: 'percentage',
      discount_value: 0,
      discount_amount: initialData?.discount_amount ?? 0,
      discount_reason: initialData?.discount_reason || '',
      deposit_required: initialData?.deposit_required ?? 0,
      deposit_amount: initialData?.deposit_amount ?? 0,
      source: initialData?.source || 'direct',
      channel: initialData?.channel || '',
      special_requests: initialData?.special_requests || '',
      dietary_requirements: initialData?.dietary_requirements || '',
      arrival_method: initialData?.arrival_method || '',
      arrival_details: initialData?.arrival_details || '',
      purpose_of_visit: initialData?.purpose_of_visit || 'leisure',
      selected_currency: initialData?.selected_currency || 'VND',
      exchange_rate: initialData?.exchange_rate || 1,
    }
  })

  // Capacity validation: notify immediately when selection exceeds limits
  const validateCapacity = useCallback(() => {
    const v = form.getValues()
    const selectedRoomTypeId = v.room_type_id
    const selectedRoomType = (roomTypes as any)?.find?.((rt: any) => rt.id === selectedRoomTypeId)
    if (!selectedRoomType) {
      form.clearErrors('room_type_id')
      return true
    }
    const stdAdults = (selectedRoomType as any).standard_adults_occupancy || selectedRoomType.standard_occupancy || 2
    const stdChildren = (selectedRoomType as any).standard_children_occupancy || 0
    const maxOcc = selectedRoomType.max_occupancy || (stdAdults + stdChildren)
    const maxAdults = selectedRoomType.max_adults || maxOcc
    const maxChildren = selectedRoomType.max_children || maxOcc

    const adults = Number(v.adults) || 0
    const children = Number(v.children) || 0
    const total = adults + children

    const violations: string[] = []
    if (adults > maxAdults) violations.push(`Adults (${adults}) > max ${maxAdults}`)
    if (children > maxChildren) violations.push(`Children (${children}) > max ${maxChildren}`)
    if (total > maxOcc) violations.push(`Total guests (${total}) > max capacity ${maxOcc}`)

    if (violations.length > 0) {
      const message = `Capacity exceeded: ${violations.join('; ')}`
      form.setError('room_type_id', { type: 'manual', message })
      // Non-blocking toast notification
      try {
        // useToast in scope
        toast({ title: t('common.warning') || 'Warning', description: message, variant: 'destructive' })
      } catch {}
      return false
    }
    form.clearErrors('room_type_id')
    return true
  }, [form, roomTypes, t])

  // Shift timing helpers (defaults synchronized with RoomTypeForm hints)
  const getShiftTimes = (shiftType?: string) => {
    switch (shiftType) {
      case 'day_shift':
        return { inTime: '09:00', outTime: '16:30' }
      case 'night_shift':
        return { inTime: '17:30', outTime: '08:30' }
      case 'full_day':
        return { inTime: '09:00', outTime: '08:30' }
      default:
        return { inTime: '14:00', outTime: '12:00' } // traditional fallback
    }
  }

  // Keep check-in/out dates consistent with shift selection
  useEffect(() => {
    const sub = form.watch((value, { name }) => {
      if (name === 'shift_type' || name === 'shift_date') {
        const v = form.getValues()
        const shiftType = v.shift_type || 'traditional'
        const base = (v.shift_date as Date) || (v.check_in_date as Date)
        if (!base) return

        const addDays = (d: Date, n: number) => {
          const x = new Date(d)
          x.setDate(x.getDate() + n)
          // normalize to midnight to avoid TZ drift when formatting date-only
          x.setHours(0, 0, 0, 0)
          return x
        }

        if (shiftType === 'night_shift' || shiftType === 'full_day') {
          // Check-in day before, check-out day after
          form.setValue('check_in_date', addDays(base, -1), { shouldValidate: true })
          form.setValue('check_out_date', addDays(base, 1), { shouldValidate: true })
        } else if (shiftType === 'day_shift') {
          // Day shift contained within a single calendar day, but to satisfy
          // validation (check_out_date > check_in_date), keep +1 day
          form.setValue('check_in_date', addDays(base, 0), { shouldValidate: true })
          form.setValue('check_out_date', addDays(base, 1), { shouldValidate: true })
        }
      }
    })
    return () => sub.unsubscribe()
  }, [form])

  // Helper function to safely set numeric values
  const setNumericValue = useCallback((field: string, value: any) => {
    const numericValue = Number(value)
    if (isNaN(numericValue)) {
      form.setValue(field as any, 0)
    } else {
      form.setValue(field as any, numericValue)
    }
  }, [form])

  // Search customers when search term changes
  useEffect(() => {
    if (debouncedCustomerSearch && debouncedCustomerSearch.length > 2) {
      setSearchingCustomers(true)
      customersApi.search(debouncedCustomerSearch)
        .then(response => {
          setCustomerSearchResults(response.data || [])
        })
        .catch(error => {
          console.error('Error searching customers:', error)
          setCustomerSearchResults([])
        })
        .finally(() => {
          setSearchingCustomers(false)
        })
    } else {
      setCustomerSearchResults([])
    }
  }, [debouncedCustomerSearch])

  // When a customer is selected, fill in their details
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    // Ensure guest_name always has a value - use email or phone as fallback
    const guestName = customer.full_name || customer.name || customer.email || customer.phone || 'Guest'
    form.setValue('guest_name', guestName)
    form.setValue('guest_email', customer.email || '')
    form.setValue('guest_phone', customer.phone || '')
    form.setValue('guest_country', customer.country || '')
    setCustomerSearch('')
    setCustomerSearchResults([])
  }

  // Clear selected customer
  const clearSelectedCustomer = () => {
    setSelectedCustomer(null)
    form.setValue('guest_name', '')
    form.setValue('guest_email', '')
    form.setValue('guest_phone', '')
    form.setValue('guest_country', '')
  }

  // Calculate price when room type or dates change
  const calculatePrice = async () => {
    const values = form.getValues()
    if (!values.room_type_id || !values.check_in_date || !values.check_out_date) return

    setCalculatingPrice(true)
    try {
      const response = await pricingApi.calculatePrice({
        room_type_id: values.room_type_id,
        check_in_date: format(values.check_in_date, 'yyyy-MM-dd'),
        check_out_date: format(values.check_out_date, 'yyyy-MM-dd'),
        adults: values.adults,
        children: values.children || 0
      })
      
      setPriceDetails(response)
      
      // Update form with calculated prices (ensure numeric values)
      // Backend returns room_rate/total_price; older code expected base_price/total_amount
      const respRoomRate = Number((response as any).room_rate ?? (response as any).base_price) || 0
      form.setValue('room_rate', respRoomRate)
      form.setValue('extra_person_charge', Number(response.extra_person_charge) || 0)
      
      // Only set these if they haven't been manually set by user
      if (form.getValues('service_charges') === 0) {
        form.setValue('service_charges', 0)
      }
      
      // Don't override tax if user has set it to 0 or another value
      // Only set tax_amount for reference, actual tax calculation will be based on tax_percentage
      if (form.getValues('tax_percentage') === undefined || form.getValues('tax_percentage') === null) {
        form.setValue('tax_percentage', 10) // Default 10% VAT
      }
      
      form.setValue('discount_amount', Number(response.discount_amount) || 0)
      
      // Only suggest deposit if not already set
      if (!form.getValues('deposit_required') || form.getValues('deposit_required') === 0) {
        const totalAmount = Number((response as any).total_price ?? (response as any).total_amount) || 0
        form.setValue('deposit_required', totalAmount * 0.3) // 30% deposit suggestion
      }
      
      toast({
        title: t('common.success'),
        description: t('bookings.priceCalculated'),
      })
    } catch (error) {
      console.error('Failed to calculate price:', error)
      // If API fails, use room type base price
      const selectedRoomType = roomTypes?.find?.(rt => rt.id === values.room_type_id)
      if (selectedRoomType) {
        const nights = Math.ceil((values.check_out_date.getTime() - values.check_in_date.getTime()) / (1000 * 60 * 60 * 24))
        const basePrice = Number(selectedRoomType.base_price) || 0
        const roomTotal = basePrice * nights
        
        form.setValue('room_rate', basePrice)
        
        // Only suggest deposit if not already set
        if (!form.getValues('deposit_required') || form.getValues('deposit_required') === 0) {
          form.setValue('deposit_required', Number(roomTotal * 0.3) || 0)
        }
      }
    } finally {
      setCalculatingPrice(false)
    }
  }

  // Watch for room type and date changes to recalculate price
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'room_type_id' || name === 'check_in_date' || name === 'check_out_date' || name === 'adults' || name === 'children') {
        calculatePrice()
        // Validate capacity on relevant changes
        if (name === 'room_type_id' || name === 'adults' || name === 'children') {
          validateCapacity()
        }
        
        // Clear availability when dates or room type change (but not guest count)
        if (['check_in_date', 'check_out_date', 'room_type_id'].includes(name || '') && availabilityResponse) {
          setAvailabilityResponse(null)
          setAvailability([])
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form.watch, roomTypes, availabilityResponse, validateCapacity])

  const checkAvailability = async () => {
    const values = form.getValues()
    if (!values.check_in_date || !values.check_out_date) return

    setCheckingAvailability(true)
    try {
      const response = await bookingsApi.checkAvailability({
        check_in_date: format(values.check_in_date, 'yyyy-MM-dd'),
        check_out_date: format(values.check_out_date, 'yyyy-MM-dd'),
        room_type_id: values.room_type_id || undefined,
        adults: values.adults,
        children: values.children
      })
      setAvailability(response.room_types)
      setAvailabilityResponse(response)
      
      // Auto-select room type and rate if only one available
      if (response.room_types.length === 1) {
        const roomType = response.room_types[0]
        form.setValue('room_type_id', roomType.room_type_id)
        form.setValue('room_rate', Number(roomType.rate_with_seasonal) || 0)
      }
    } catch (error) {
      console.error('Failed to check availability:', error)
    } finally {
      setCheckingAvailability(false)
    }
  }

  const handleSubmit = async (values: z.infer<typeof bookingSchema>) => {
    // Prevent double submission
    if (isLoading) {
      console.log('Form submission already in progress, skipping duplicate submission')
      return
    }
    
    setIsLoading(true)
    try {
      let customerId = selectedCustomer?.id
      
      // If no customer is selected but we have guest details, create a new customer
      if (!customerId && values.guest_name) {
        try {
          // Ensure we have either phone or email for customer creation
          if (values.guest_phone || values.guest_email) {
            const newCustomer = await customersApi.create({
              full_name: values.guest_name,
              email: values.guest_email || undefined,
              phone: values.guest_phone || undefined, // Optional if email is provided
              country: values.guest_country || 'Vietnam'
            })
            customerId = newCustomer.id
          }
        } catch (error) {
          console.error('Failed to create customer:', error)
          // Continue without customer_id if creation fails
        }
      }
      
      // Calculate the deposit_required (30% of total) since we don't have an input field for it
      const totals = calculateTotals()
      
      // Get current exchange rate for the selected currency
      const selectedCurrency = values.selected_currency || 'VND'
      const currentExchangeRate = selectedCurrency === 'VND' ? 1 : (exchangeRates[selectedCurrency] || 1)
      
      // Derive check-in/out times based on shift selection
      const shiftTimes = getShiftTimes(values.shift_type)
      const bookingData: BookingCreate = {
        ...values,
        customer_id: customerId,
        check_in_date: format(values.check_in_date, 'yyyy-MM-dd'),
        check_out_date: format(values.check_out_date, 'yyyy-MM-dd'),
        check_in_time: shiftTimes.inTime,
        check_out_time: shiftTimes.outTime,
        shift_date: values.shift_date ? format(values.shift_date, 'yyyy-MM-dd') : undefined,
        deposit_required: totals.depositRequired, // Set the calculated deposit
        deposit_amount: values.deposit_amount, // Pass the admin-entered amount if provided
        selected_currency: selectedCurrency,
        exchange_rate: currentExchangeRate, // Store the exchange rate at time of booking
        idempotency_key: idempotencyKey.current, // Include unique key to prevent duplicates
      }
      await onSubmit(bookingData)
      // Regenerate idempotency key for next submission
      idempotencyKey.current = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    } catch (error) {
      console.error('Failed to create booking:', error)
      toast({
        title: t('common.error'),
        description: t('bookings.failedToCreate'),
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTotals = () => {
    const values = form.getValues()
    const checkIn = values.check_in_date
    const checkOut = values.check_out_date
    
    // Get selected room type for pricing info
    const selectedRoomType = roomTypes?.find?.(rt => rt.id === values.room_type_id)

    // Guard against invalid dates to avoid negative totals while user is editing
    if (!checkIn || !checkOut) {
      return {
        nights: 0,
        weekdayNights: 0,
        weekendNights: 0,
        roomCharge: 0,
        extraPersonTotal: 0,
        extraBedTotal: 0,
        extraSingleBeds: 0,
        extraDoubleBeds: 0,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        total: 0,
        depositRequired: 0,
        selectedRoomType
      }
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )

    // If nights is not positive (e.g., dates inverted), return zeros to prevent negatives
    if (!Number.isFinite(nights) || nights <= 0) {
      return {
        nights: 0,
        weekdayNights: 0,
        weekendNights: 0,
        roomCharge: 0,
        extraPersonTotal: 0,
        extraBedTotal: 0,
        extraSingleBeds: 0,
        extraDoubleBeds: 0,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        total: 0,
        depositRequired: 0,
        selectedRoomType
      }
    }
    
    // Calculate room charge based on pricing mode
    let roomCharge = 0
    let weekendNights = 0
    let weekdayNights = 0

    if (selectedRoomType) {
      const pricingMode = (selectedRoomType as any).pricing_mode || 'traditional'
      const shiftType = values.shift_type || 'traditional'

      if (pricingMode === 'shift' && (shiftType === 'day_shift' || shiftType === 'night_shift' || shiftType === 'full_day')) {
        // Shift-based pricing: use the appropriate shift price and do not multiply by nights
        if (shiftType === 'day_shift') {
          roomCharge = Number((selectedRoomType as any).day_shift_price ?? 0)
          weekdayNights = 0; weekendNights = 0
        } else if (shiftType === 'night_shift') {
          roomCharge = Number((selectedRoomType as any).night_shift_price ?? 0)
          weekdayNights = 0; weekendNights = 0
        } else {
          // full_day: prefer full_day_price; fallback to sum of day+night; finally to base_price
          const fullDay = (selectedRoomType as any).full_day_price
          const day = (selectedRoomType as any).day_shift_price
          const night = (selectedRoomType as any).night_shift_price
          roomCharge = Number(fullDay ?? ((Number(day || 0) + Number(night || 0)) || selectedRoomType.base_price || values.room_rate || 0))
          weekdayNights = 0; weekendNights = 0
        }
      } else {
        // Traditional night-based pricing with weekend support
        if (nights > 0) {
          for (let i = 0; i < nights; i++) {
            const currentDate = new Date(checkIn.getTime() + i * 24 * 60 * 60 * 1000)
            const dayOfWeek = currentDate.getDay()
            // Friday (5) and Saturday (6) use weekend pricing when provided
            if ((dayOfWeek === 5 || dayOfWeek === 6) && selectedRoomType.weekend_price) {
              roomCharge += Number(selectedRoomType.weekend_price)
              weekendNights++
            } else {
              roomCharge += Number(selectedRoomType.base_price) || Number(values.room_rate) || 0
              weekdayNights++
            }
          }
        } else {
          roomCharge = (Number(values.room_rate) || 0) * Math.max(0, nights)
          weekdayNights = Math.max(0, nights)
        }
      }
    }
    
    // Calculate automatic extra bed charges based on guest count vs room occupancy
    let extraSingleBeds = 0
    let extraDoubleBeds = 0
    let extraPersonTotal = 0
    let extraBedTotal = 0
    
    if (selectedRoomType) {
      const adults = Number(values.adults) || 0
      const children = Number(values.children) || 0
      const totalGuests = adults + children
      
      // Use new separate occupancy fields if available, fallback to old field
      const standardAdultsOccupancy = (selectedRoomType as any).standard_adults_occupancy || selectedRoomType.standard_occupancy || 2
      const standardChildrenOccupancy = (selectedRoomType as any).standard_children_occupancy || 0
      const maxOccupancy = selectedRoomType.max_occupancy || (standardAdultsOccupancy + standardChildrenOccupancy)
      const maxAdults = selectedRoomType.max_adults || maxOccupancy
      const maxChildren = selectedRoomType.max_children || maxOccupancy

      // Calculate extras vs standard (we show pricing regardless of max limits; availability handles limits elsewhere)
      const extraAdults = Math.max(0, adults - standardAdultsOccupancy)
      const extraChildren = Math.max(0, children - standardChildrenOccupancy)
      const totalExtraGuests = extraAdults + extraChildren

      const pricingMode = (selectedRoomType as any).pricing_mode || 'traditional'
      const shiftType = values.shift_type || 'traditional'
      // Extra person/bed units
      const units = (pricingMode === 'shift' && (shiftType === 'day_shift' || shiftType === 'night_shift' || shiftType === 'full_day'))
        ? (shiftType === 'full_day' ? 2 : 1)
        : nights

      // Extra person charges
      extraPersonTotal = (extraAdults * (selectedRoomType.extra_adult_charge || 0) + 
                          extraChildren * (selectedRoomType.extra_child_charge || 0)) * (units || 1)

      // Extra bed allocation proportional to extra guests
      if (totalExtraGuests > 0) {
        const singleCharge = Number((selectedRoomType as any).extra_single_bed_charge || 0)
        const doubleCharge = Number((selectedRoomType as any).extra_double_bed_charge || 0)

        extraDoubleBeds = Math.floor(totalExtraGuests / 2)
        extraSingleBeds = totalExtraGuests % 2

        extraBedTotal = (extraDoubleBeds * doubleCharge + extraSingleBeds * singleCharge) * (units || 1)
      }
    }
    
    // Calculate subtotal
    const subtotal = roomCharge + extraPersonTotal + extraBedTotal + (Number(values.service_charges) || 0)
    
    // Calculate discount
    let discountAmount = 0
    if (values.discount_type === 'percentage') {
      discountAmount = subtotal * ((Number(values.discount_value) || 0) / 100)
    } else {
      discountAmount = Number(values.discount_value) || 0
    }
    
    // Calculate tax
    // Prevent negative taxable base when discount exceeds subtotal
    const taxableAmount = Math.max(0, subtotal - discountAmount)
    const taxAmount = taxableAmount * ((Number(values.tax_percentage) || 0) / 100)
    
    // Calculate total
    const total = taxableAmount + taxAmount
    
    // Default deposit is 30% of total (ensure it's never NaN)
    const depositRequired = isNaN(total) ? 0 : total * 0.3

    return {
      nights,
      weekdayNights,
      weekendNights,
      roomCharge,
      extraPersonTotal,
      extraBedTotal,
      extraSingleBeds,
      extraDoubleBeds,
      subtotal,
      discountAmount,
      taxAmount,
      total,
      depositRequired,
      selectedRoomType
    }
  }

  const totals = calculateTotals()

  // Debug: Log form errors to help identify validation issues
  console.log('Form validation errors:', form.formState.errors)
  console.log('Form is valid:', form.formState.isValid)
  
  // Debug: Log current field values when they might be causing issues
  const debugValues = {
    room_rate: form.watch('room_rate'),
    discount_amount: form.watch('discount_amount'),
    deposit_required: form.watch('deposit_required'),
    tax_amount: form.watch('tax_amount'),
    service_charges: form.watch('service_charges')
  }
  console.log('Current numeric field values:', debugValues)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="guest" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="guest">{t('bookings.guestInfo')}</TabsTrigger>
            <TabsTrigger value="booking">{t('bookings.bookingDetails')}</TabsTrigger>
            <TabsTrigger value="pricing">{t('common.pricingInfo')}</TabsTrigger>
            <TabsTrigger value="additional">{t('bookings.additionalInfo')}</TabsTrigger>
          </TabsList>

          <TabsContent value="guest" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('bookings.guestInformation')}</CardTitle>
                <CardDescription>{t('bookings.searchOrCreateCustomer')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Search Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('bookings.searchCustomer')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('bookings.searchByNameEmailPhone')}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                    {searchingCustomers && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                    )}
                  </div>
                  
                  {/* Search Results */}
                  {customerSearchResults.length > 0 && (
                    <div className="border rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                      {customerSearchResults.map((customer) => (
                        <div
                          key={customer.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer rounded flex justify-between items-center"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{customer.full_name || customer.name || 'Unknown Customer'}</div>
                            <div className="text-sm text-gray-500 space-x-3">
                              {customer.email && (
                                <span>
                                  <span className="font-medium">Email:</span> {customer.email}
                                </span>
                              )}
                              {customer.phone && (
                                <span>
                                  <span className="font-medium">Phone:</span> {customer.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          {customer.is_vip && <Badge variant="secondary" className="ml-2">VIP</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Selected Customer */}
                  {selectedCustomer && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium">{selectedCustomer.full_name || selectedCustomer.name || 'Unknown Customer'}</div>
                        <div className="text-sm text-gray-600 space-x-3">
                          {selectedCustomer.email && (
                            <span>
                              <span className="font-medium">Email:</span> {selectedCustomer.email}
                            </span>
                          )}
                          {selectedCustomer.phone && (
                            <span>
                              <span className="font-medium">Phone:</span> {selectedCustomer.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearSelectedCustomer}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Toggle Customer Form Button */}
                  {!selectedCustomer && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewCustomer(!showNewCustomer)}
                      className="w-full"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {showNewCustomer ? t('bookings.hideGuestForm') : t('bookings.showGuestForm')}
                    </Button>
                  )}
                </div>
                
                {/* Guest Information Form */}
                {(showNewCustomer || selectedCustomer) && (
                  <div className="grid grid-cols-2 gap-4">
                <FormField
                  key="guest_name"
                  control={form.control}
                  name="guest_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.guestName')} *</FormLabel>
                      <FormControl>
                        <InputWithError 
                          {...field} 
                          error={!!form.formState.errors.guest_name}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  key="guest_email"
                  control={form.control}
                  name="guest_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.email')}</FormLabel>
                      <FormControl>
                        <InputWithError 
                          type="email" 
                          {...field} 
                          error={!!form.formState.errors.guest_email}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('bookings.emailOrPhoneRequired')}
                      </FormDescription>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  key="guest_phone"
                  control={form.control}
                  name="guest_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.phone')}</FormLabel>
                      <FormControl>
                        <InputWithError 
                          {...field} 
                          placeholder="+84 xxx xxx xxx" 
                          error={!!form.formState.errors.guest_phone}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('bookings.emailOrPhoneRequired')}
                      </FormDescription>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  key="guest_country"
                  control={form.control}
                  name="guest_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.country')}</FormLabel>
                      <FormControl>
                        <InputWithError 
                          {...field} 
                          error={!!form.formState.errors.guest_country}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  key="adults"
                  control={form.control}
                  name="adults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.adults')} *</FormLabel>
                      <FormControl>
                        <InputWithError 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))}
                          error={!!form.formState.errors.adults}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  key="children"
                  control={form.control}
                  name="children"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.children')}</FormLabel>
                      <FormControl>
                        <InputWithError 
                          type="number" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                          error={!!form.formState.errors.children}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('bookings.bookingDetails')}</CardTitle>
                <CardDescription>{t('bookings.selectDatesAndRoom')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Currency Selection */}
                <FormField
                  key="selected_currency"
                  control={form.control}
                  name="selected_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.currency')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue placeholder={t('common.selectCurrency')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getDisplayCurrencies().map((currencyCode) => {
                            const currencyInfo = availableCurrencies.find(c => c.code === currencyCode)
                            if (!currencyInfo) return null
                            return (
                              <SelectItem key={currencyInfo.code} value={currencyInfo.code}>
                                {currencyInfo.code} - {currencyInfo.name}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t('bookings.currencyDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    key="check_in_date"
                    control={form.control}
                    name="check_in_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.checkInDate')} *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                  form.formState.errors.check_in_date && "border-red-500"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>{t('bookings.pickDate')}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    key="check_out_date"
                    control={form.control}
                    name="check_out_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.checkOutDate')} *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                  form.formState.errors.check_out_date && "border-red-500"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>{t('bookings.pickDate')}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const checkIn = form.getValues('check_in_date')
                                return date <= checkIn
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    key="shift_type"
                    control={form.control}
                    name="shift_type"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>{t('bookings.shiftType')} *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            // Update shift_date when shift type is selected
                            if (value !== 'traditional') {
                              const checkInDate = form.getValues('check_in_date')
                              form.setValue('shift_date', checkInDate)
                            }
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('bookings.selectShiftType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="traditional">{t('bookings.traditional')} (Overnight Stay)</SelectItem>
                            <SelectItem value="day_shift">{t('bookings.dayShift')} (9:00 AM - 4:30 PM)</SelectItem>
                            <SelectItem value="night_shift">{t('bookings.nightShift')} (5:30 PM - 8:30 AM)</SelectItem>
                            <SelectItem value="full_day">{t('bookings.fullDay')} (24 hours)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {field.value === 'day_shift' && t('bookings.dayShiftDescription')}
                          {field.value === 'night_shift' && t('bookings.nightShiftDescription')}
                          {field.value === 'full_day' && t('bookings.fullDayDescription')}
                          {field.value === 'traditional' && t('bookings.traditionalDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Room Type Selection */}
                {canAccessRooms ? (
                  <FormField
                    key="room_type_id"
                    control={form.control}
                    name="room_type_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.roomType')} *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            // Check if selected room type supports shift pricing
                            const selectedRoomType = roomTypes?.find(rt => rt.id === value)
                            if (selectedRoomType?.pricing_mode === 'shift') {
                              form.setValue('shift_type', 'day_shift')
                            } else {
                              form.setValue('shift_type', 'traditional')
                            }
                          }} 
                          value={field.value}
                          disabled={loadingRoomTypes}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('bookings.selectRoomType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roomTypes?.map((roomType) => (
                              <SelectItem 
                                key={roomType.id} 
                                value={roomType.id}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <div>
                                    <span className="font-medium">{roomType.name}</span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      ({roomType.standard_occupancy} {t('bookings.guests')}, max {roomType.max_occupancy})
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium ml-4">
                                    {(() => {
                                      const selectedCurrency = form.watch('selected_currency') || 'VND'
                                      const convertedPrice = selectedCurrency === 'VND' 
                                        ? roomType.base_price 
                                        : convertFromVND(roomType.base_price, selectedCurrency)
                                      return formatCurrency(convertedPrice, selectedCurrency)
                                    })()}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t('bookings.selectRoomTypeDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('bookings.roomType')} *</label>
                    <PermissionGuard 
                      permission="rooms.read" 
                      notificationVariant="inline"
                      customMessage={t('bookings.noPermissionToAccessRooms')}
                    >
                      <div />
                    </PermissionGuard>
                  </div>
                )}

                {/* Removed duplicate shift type selector. The main shift selector above
                    handles all modes and updates times/dates accordingly. */}

                {canAccessRooms && (
                  <Button 
                    type="button" 
                    onClick={checkAvailability}
                    disabled={checkingAvailability || !form.watch('room_type_id')}
                    className="w-full"
                    variant="outline"
                  >
                    {checkingAvailability && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('bookings.checkAvailability')}
                  </Button>
                )}

                {availabilityResponse && (
                  <div className={`p-4 rounded-lg ${
                    availabilityResponse.available && availability.some(room => room.can_book)
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <p className={`text-sm ${
                      availabilityResponse.available && availability.some(room => room.can_book)
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}>
                      {availabilityResponse.available && availability.some(room => room.can_book)
                        ? t('bookings.availabilityConfirmed')
                        : !availabilityResponse.available
                        ? 'No rooms available for selected dates and guest count'
                        : 'Rooms exist but cannot accommodate the requested number of guests'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <PricingTab 
              form={form}
              totals={totals}
              priceDetails={priceDetails}
              calculatingPrice={calculatingPrice}
              t={t}
              selectedCurrency={form.watch('selected_currency') || 'VND'}
            />
          </TabsContent>

          <TabsContent value="additional" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('bookings.additionalInfo')}</CardTitle>
                <CardDescription>{t('bookings.optionalDetails')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    key="source"
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.source')} *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="direct">{t('bookings.direct')}</SelectItem>
                            <SelectItem value="website">{t('bookings.website')}</SelectItem>
                            <SelectItem value="phone">{t('bookings.phone')}</SelectItem>
                            <SelectItem value="email">{t('bookings.email')}</SelectItem>
                            <SelectItem value="walk_in">{t('bookings.walkIn')}</SelectItem>
                            <SelectItem value="ota">{t('bookings.ota')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    key="channel"
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.channel')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Booking.com, Agoda, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    key="purpose_of_visit"
                    control={form.control}
                    name="purpose_of_visit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.purposeOfVisit')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="leisure">{t('bookings.leisure')}</SelectItem>
                            <SelectItem value="business">{t('bookings.business')}</SelectItem>
                            <SelectItem value="event">{t('bookings.event')}</SelectItem>
                            <SelectItem value="other">{t('common.other')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    key="arrival_method"
                    control={form.control}
                    name="arrival_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.arrivalMethod')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="car">{t('bookings.car')}</SelectItem>
                            <SelectItem value="taxi">{t('bookings.taxi')}</SelectItem>
                            <SelectItem value="bus">{t('bookings.bus')}</SelectItem>
                            <SelectItem value="flight">{t('bookings.flight')}</SelectItem>
                            <SelectItem value="train">{t('bookings.train')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    key="arrival_details"
                    control={form.control}
                    name="arrival_details"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>{t('bookings.arrivalDetails')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('bookings.flightNumberEtc')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    key="special_requests"
                    control={form.control}
                    name="special_requests"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>{t('bookings.specialRequests')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    key="dietary_requirements"
                    control={form.control}
                    name="dietary_requirements"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>{t('bookings.dietaryRequirements')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('bookings.createNewBooking')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
