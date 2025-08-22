import { useState, useEffect } from 'react'
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
import { bookingsApi, type BookingCreate, type RoomAvailability } from '@/lib/api/bookings'
import { customersApi, type Customer } from '@/lib/api/customers'
import { pricingApi, type PriceCalculationResponse } from '@/lib/api/pricing'
import roomService, { type RoomType } from '@/services/roomService'
import { PricingTab } from './PricingTab'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
import { useToast } from '@/hooks/use-toast'

const bookingSchema = z.object({
  guest_name: z.string().min(1, 'Guest name is required'),
  guest_email: z.string().email().optional().or(z.literal('')),
  guest_phone: z.string().optional(),
  guest_country: z.string().optional(),
  room_type_id: z.string().min(1, 'Room type is required'),
  check_in_date: z.date(),
  check_out_date: z.date(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  adults: z.number().min(1, 'At least 1 adult is required'),
  children: z.number().min(0),
  infants: z.number().min(0),
  room_rate: z.number().min(0),
  extra_persons: z.number().min(0),
  extra_person_charge: z.number().min(0),
  extra_beds: z.number().min(0),
  extra_bed_charge: z.number().min(0),
  service_charges: z.number().min(0),
  tax_percentage: z.number().min(0).max(100),
  tax_amount: z.number().min(0),
  discount_type: z.enum(['percentage', 'amount']),
  discount_value: z.number().min(0),
  discount_amount: z.number().min(0),
  discount_reason: z.string().optional(),
  deposit_required: z.number().min(0),
  deposit_paid: z.number().min(0),
  source: z.enum(['direct', 'website', 'phone', 'email', 'walk_in', 'ota']),
  channel: z.string().optional(),
  special_requests: z.string().optional(),
  dietary_requirements: z.string().optional(),
  arrival_method: z.string().optional(),
  arrival_details: z.string().optional(),
  purpose_of_visit: z.string().optional(),
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
  const [isLoading, setIsLoading] = useState(false)
  const [availability, setAvailability] = useState<RoomAvailability[]>([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [calculatingPrice, setCalculatingPrice] = useState(false)
  const [priceDetails, setPriceDetails] = useState<PriceCalculationResponse | null>(null)
  
  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  
  const debouncedCustomerSearch = useDebounce(customerSearch, 500)
  const { toast } = useToast()

  // Fetch room types
  const { data: roomTypes, isLoading: loadingRoomTypes } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: async () => {
      const response = await roomService.getRoomTypes()
      return response.data
    }
  })

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      guest_name: initialData?.guest_name || '',
      guest_email: initialData?.guest_email || '',
      guest_phone: initialData?.guest_phone || '',
      guest_country: initialData?.guest_country || 'Vietnam',
      room_type_id: initialData?.room_type_id || '',
      check_in_date: initialData?.check_in_date ? new Date(initialData.check_in_date) : new Date(),
      check_out_date: initialData?.check_out_date ? new Date(initialData.check_out_date) : new Date(Date.now() + 86400000),
      check_in_time: initialData?.check_in_time || '14:00',
      check_out_time: initialData?.check_out_time || '12:00',
      adults: initialData?.adults || 1,
      children: initialData?.children || 0,
      infants: initialData?.infants || 0,
      room_rate: initialData?.room_rate || 0,
      extra_persons: 0,
      extra_person_charge: initialData?.extra_person_charge || 0,
      extra_beds: 0,
      extra_bed_charge: initialData?.extra_bed_charge || 0,
      service_charges: initialData?.service_charges || 0,
      tax_percentage: 0,
      tax_amount: initialData?.tax_amount || 0,
      discount_type: 'percentage',
      discount_value: 0,
      discount_amount: initialData?.discount_amount || 0,
      discount_reason: initialData?.discount_reason || '',
      deposit_required: initialData?.deposit_required || 0,
      deposit_paid: initialData?.deposit_paid || 0,
      source: initialData?.source || 'direct',
      channel: initialData?.channel || '',
      special_requests: initialData?.special_requests || '',
      dietary_requirements: initialData?.dietary_requirements || '',
      arrival_method: initialData?.arrival_method || '',
      arrival_details: initialData?.arrival_details || '',
      purpose_of_visit: initialData?.purpose_of_visit || 'leisure',
    }
  })

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
    form.setValue('guest_name', customer.name)
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
      
      // Update form with calculated prices
      form.setValue('room_rate', response.base_price)
      form.setValue('extra_person_charge', response.extra_person_charge)
      form.setValue('service_charges', 0) // Can be set manually
      form.setValue('tax_amount', response.tax_amount)
      form.setValue('discount_amount', response.discount_amount)
      form.setValue('deposit_required', response.total_amount * 0.3) // 30% deposit by default
      
      toast({
        title: t('common.success'),
        description: t('bookings.priceCalculated'),
      })
    } catch (error) {
      console.error('Failed to calculate price:', error)
      // If API fails, use room type base price
      const selectedRoomType = roomTypes?.find(rt => rt.id === values.room_type_id)
      if (selectedRoomType) {
        const nights = Math.ceil((values.check_out_date.getTime() - values.check_in_date.getTime()) / (1000 * 60 * 60 * 24))
        const roomTotal = selectedRoomType.base_price * nights
        
        form.setValue('room_rate', selectedRoomType.base_price)
        form.setValue('deposit_required', roomTotal * 0.3)
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
      }
    })
    return () => subscription.unsubscribe()
  }, [form.watch, roomTypes])

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
      
      // Auto-select room type and rate if only one available
      if (response.room_types.length === 1) {
        const roomType = response.room_types[0]
        form.setValue('room_type_id', roomType.room_type_id)
        form.setValue('room_rate', roomType.rate_with_seasonal)
      }
    } catch (error) {
      console.error('Failed to check availability:', error)
    } finally {
      setCheckingAvailability(false)
    }
  }

  const handleSubmit = async (values: z.infer<typeof bookingSchema>) => {
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
      
      const bookingData: BookingCreate = {
        ...values,
        customer_id: customerId,
        check_in_date: format(values.check_in_date, 'yyyy-MM-dd'),
        check_out_date: format(values.check_out_date, 'yyyy-MM-dd'),
      }
      await onSubmit(bookingData)
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
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Get selected room type for pricing info
    const selectedRoomType = roomTypes?.find(rt => rt.id === values.room_type_id)
    
    // Calculate room charge with weekend pricing
    let roomCharge = 0
    let weekendNights = 0
    let weekdayNights = 0
    
    if (selectedRoomType && nights > 0) {
      for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkIn.getTime() + i * 24 * 60 * 60 * 1000)
        const dayOfWeek = currentDate.getDay()
        
        // Friday (5) and Saturday (6) use weekend pricing
        if ((dayOfWeek === 5 || dayOfWeek === 6) && selectedRoomType.weekend_price) {
          roomCharge += Number(selectedRoomType.weekend_price)
          weekendNights++
        } else {
          roomCharge += Number(selectedRoomType.base_price) || Number(values.room_rate) || 0
          weekdayNights++
        }
      }
    } else {
      roomCharge = (Number(values.room_rate) || 0) * nights
      weekdayNights = nights
    }
    
    // Calculate extra charges based on quantity * price
    const extraPersonTotal = (Number(values.extra_persons) || 0) * (Number(selectedRoomType?.extra_adult_charge) || 0) * nights
    const extraBedTotal = (Number(values.extra_beds) || 0) * (Number(selectedRoomType?.extra_child_charge) || 0) * nights
    
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
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * ((Number(values.tax_percentage) || 0) / 100)
    
    // Calculate total
    const total = taxableAmount + taxAmount
    
    // Default deposit is 20% of total
    const depositRequired = total * 0.2

    return {
      nights,
      weekdayNights,
      weekendNights,
      roomCharge,
      extraPersonTotal,
      extraBedTotal,
      subtotal,
      discountAmount,
      taxAmount,
      total,
      depositRequired,
      selectedRoomType
    }
  }

  const totals = calculateTotals()

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
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              {customer.email && <span>{customer.email}</span>}
                              {customer.phone && <span className="ml-2">{customer.phone}</span>}
                            </div>
                          </div>
                          {customer.is_vip && <Badge variant="secondary">VIP</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Selected Customer */}
                  {selectedCustomer && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{selectedCustomer.name}</div>
                        <div className="text-sm text-gray-600">
                          {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                          {selectedCustomer.phone && <span className="ml-2">{selectedCustomer.phone}</span>}
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
                  
                  {/* Create New Customer Button */}
                  {!selectedCustomer && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewCustomer(!showNewCustomer)}
                      className="w-full"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {showNewCustomer ? t('bookings.cancelNewCustomer') : t('bookings.createNewCustomer')}
                    </Button>
                  )}
                </div>
                
                {/* Guest Information Form */}
                {(showNewCustomer || selectedCustomer) && (
                  <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guest_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.guestName')} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('bookings.emailOrPhoneRequired')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.phone')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+84 xxx xxx xxx" />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('bookings.emailOrPhoneRequired')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.country')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.adults')} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="children"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.children')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
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
                                  !field.value && "text-muted-foreground"
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
                                  !field.value && "text-muted-foreground"
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
                    control={form.control}
                    name="check_in_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.checkInTime')}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="check_out_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('bookings.checkOutTime')}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Room Type Selection */}
                <FormField
                  control={form.control}
                  name="room_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookings.roomType')} *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
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
                                  {t('common.currency')} {roomType.base_price.toLocaleString()}
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

                {availability.length > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {t('bookings.availabilityConfirmed')}
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
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('bookings.createNewBooking')}
          </Button>
        </div>
      </form>
    </Form>
  )
}