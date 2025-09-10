import { api } from '../api'

export interface SeasonalRate {
  id: string
  room_type_id: string
  season_name: string
  season_type: 'high' | 'low' | 'special_event'
  start_date: string
  end_date: string
  rate_type: 'multiplier' | 'fixed' | 'addition'
  rate_multiplier?: number
  fixed_rate?: number
  rate_addition?: number
  min_stay_nights?: number
  max_stay_nights?: number
  booking_window_start?: string
  booking_window_end?: string
  applicable_days?: string
  priority?: number
  is_active: boolean
  created_at?: string
  created_by?: string
}

export interface PricingRule {
  id: string
  name: string
  description?: string
  scope: 'global' | 'room_type' | 'room'
  room_type_id?: string
  room_id?: string
  rule_type: 'early_bird' | 'last_minute' | 'long_stay' | 'occupancy_based' | 'group_booking'
  conditions: Record<string, any>
  adjustment_type: 'discount' | 'surcharge'
  adjustment_method: 'percentage' | 'fixed_amount'
  adjustment_value: number
  max_discount_amount?: number
  valid_from?: string
  valid_to?: string
  usage_limit?: number
  usage_count?: number
  usage_per_customer?: number
  can_combine?: boolean
  exclude_rules?: string[]
  priority?: number
  requires_code?: boolean
  promo_code?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface PriceCalculationRequest {
  room_type_id: string
  check_in_date: string
  check_out_date: string
  adults: number
  children?: number
  promo_code?: string
}

export interface PriceCalculationResponse {
  base_price: number
  nights: number
  room_total: number
  seasonal_adjustment: number
  extra_person_charge: number
  applicable_rules: Array<{
    rule_name: string
    adjustment_type: string
    adjustment_value: number
  }>
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  breakdown_by_night?: Array<{
    date: string
    base_rate: number
    adjusted_rate: number
    applied_rates: string[]
  }>
}

export const pricingApi = {
  // Seasonal Rates
  getSeasonalRates: async (roomTypeId?: string) => {
    const params = roomTypeId ? { room_type_id: roomTypeId } : {}
    const response = await api.get('/pricing/seasonal-rates', { params })
    return response.data.seasonal_rates
  },

  createSeasonalRate: async (data: Partial<SeasonalRate>) => {
    const response = await api.post('/pricing/seasonal-rates', data)
    return response.data
  },

  updateSeasonalRate: async (id: string, data: Partial<SeasonalRate>) => {
    const response = await api.put(`/pricing/seasonal-rates/${id}`, data)
    return response.data
  },

  deleteSeasonalRate: async (id: string) => {
    const response = await api.delete(`/pricing/seasonal-rates/${id}`)
    return response.data
  },

  // Pricing Rules
  getPricingRules: async (params?: { room_type_id?: string; is_active?: boolean }) => {
    const response = await api.get('/pricing/rules', { params })
    return response.data
  },

  createPricingRule: async (data: Partial<PricingRule>) => {
    const response = await api.post('/pricing/rules', data)
    return response.data
  },

  updatePricingRule: async (id: string, data: Partial<PricingRule>) => {
    const response = await api.put(`/pricing/rules/${id}`, data)
    return response.data
  },

  deletePricingRule: async (id: string) => {
    const response = await api.delete(`/pricing/rules/${id}`)
    return response.data
  },

  // Price Calculation
  calculatePrice: async (data: PriceCalculationRequest): Promise<PriceCalculationResponse> => {
    const response = await api.post('/pricing/calculate', data)
    return response.data
  },

  // Get price for a specific date range and room type
  getPriceBreakdown: async (
    roomTypeId: string,
    checkIn: string,
    checkOut: string
  ) => {
    const response = await api.get(`/pricing/breakdown`, {
      params: {
        room_type_id: roomTypeId,
        check_in_date: checkIn,
        check_out_date: checkOut
      }
    })
    return response.data
  }
}
