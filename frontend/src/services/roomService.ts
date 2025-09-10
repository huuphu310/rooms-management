import { api } from '@/lib/api';

export interface RoomType {
  id: string;
  name: string;
  code?: string;
  base_price: number;
  weekend_price?: number;
  holiday_price?: number;
  standard_occupancy: number;
  max_occupancy: number;
  min_occupancy?: number;
  max_adults?: number;
  max_children?: number;
  extra_adult_charge?: number;
  extra_child_charge?: number;
  extra_person_charge?: number; // Deprecated
  extra_single_bed_charge?: number;
  extra_double_bed_charge?: number;
  size_sqm?: number; // Deprecated
  size_sqm_from?: number;
  size_sqm_to?: number;
  standard_amenities?: string[];
  bed_configuration?: string;
  bathroom_type?: string;
  description?: string;
  short_description?: string;
  features?: string[];
  highlights?: string[];
  images?: any[];
  thumbnail_url?: string;
  display_order?: number;
  cancellation_policy_id?: string;
  min_stay_nights?: number;
  max_stay_nights?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type RoomStatus = 'available' | 'booked' | 'occupied' | 'cleaning' | 'maintenance' | 'blocked';
export type RoomView = 'sea' | 'mountain' | 'city' | 'garden' | 'pool' | 'none';

export interface Room {
  id: string;
  room_number: string;
  room_type_id: string;
  floor?: number;
  building?: string;  // Deprecated - use building_id
  building_id?: string;
  building_name?: string;
  building_code?: string;
  wing?: string;
  zone?: string;
  view_type?: RoomView;
  position?: string;
  actual_size_sqm?: number;
  ceiling_height_m?: number;
  additional_amenities?: string[];
  missing_amenities?: string[];
  special_features?: string[];
  connecting_room_id?: string;
  is_smoking?: boolean;
  is_accessible?: boolean;
  is_pet_friendly?: boolean;
  noise_level?: string;
  custom_base_price?: number;
  price_modifier?: number;
  price_modifier_reason?: string;
  status: RoomStatus;
  status_reason?: string;
  status_until?: string;
  long_term_status?: string;
  condition_score?: number;
  last_renovated_date?: string;
  last_deep_cleaned_date?: string;
  last_inspected_date?: string;
  next_maintenance_date?: string;
  maintenance_notes?: string;
  room_images?: any[];
  virtual_tour_url?: string;
  housekeeping_notes?: string;
  cleaning_duration_minutes?: number;
  cleaning_priority?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  room_type?: RoomType;
}

export interface RoomCreateInput {
  room_number: string;
  room_type_id: string;
  floor: number;
  building?: string;  // Deprecated - use building_id
  building_id?: string;
  view_type?: string;
  status?: string;
  notes?: string;
}

export interface RoomUpdateInput {
  room_number?: string;
  room_type_id?: string;
  floor?: number;
  building?: string;  // Deprecated - use building_id
  building_id?: string;
  view_type?: string;
  status?: string;
  notes?: string;
  is_active?: boolean;
}

// Seasonal Pricing
export type SeasonType = 'high' | 'low' | 'special_event';
export type RateType = 'multiplier' | 'fixed' | 'addition';

export interface SeasonalRate {
  id: string;
  room_type_id: string;
  season_name: string;
  season_type: SeasonType;
  start_date: string;
  end_date: string;
  rate_type: RateType;
  rate_multiplier?: number;
  fixed_rate?: number;
  rate_addition?: number;
  min_stay_nights?: number;
  max_stay_nights?: number;
  booking_window_start?: string;
  booking_window_end?: string;
  applicable_days?: string;
  priority?: number;
  is_active: boolean;
  created_at?: string;
  created_by?: string;
}

// Dynamic Pricing Rules
export type RuleType = 'early_bird' | 'last_minute' | 'long_stay' | 'occupancy_based' | 'group_booking';
export type AdjustmentType = 'discount' | 'surcharge';
export type AdjustmentMethod = 'percentage' | 'fixed_amount';

export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  scope: 'global' | 'room_type' | 'room';
  room_type_id?: string;
  room_id?: string;
  rule_type: RuleType;
  conditions: Record<string, any>;
  adjustment_type: AdjustmentType;
  adjustment_method: AdjustmentMethod;
  adjustment_value: number;
  max_discount_amount?: number;
  valid_from?: string;
  valid_to?: string;
  usage_limit?: number;
  usage_count?: number;
  usage_per_customer?: number;
  can_combine?: boolean;
  exclude_rules?: string[];
  priority?: number;
  requires_code?: boolean;
  promo_code?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// Amenities
export interface Amenity {
  id: string;
  code: string;
  name: string;
  category?: string;
  icon?: string;
  description?: string;
  is_premium?: boolean;
  display_order?: number;
  is_active: boolean;
}

export interface RoomTypeAmenity {
  room_type_id: string;
  amenity_id: string;
  is_standard?: boolean;
  is_paid?: boolean;
  charge_amount?: number;
}

export interface RoomAmenity {
  room_id: string;
  amenity_id: string;
  is_available?: boolean;
  is_working?: boolean;
  notes?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export interface RoomFilters extends PaginationParams {
  status?: string;
  floor?: number;
  room_type_id?: string;
  view_type?: string;
  building?: string;
  search?: string;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

class RoomService {
  // Room Types
  async getRoomTypes(params?: PaginationParams): Promise<ApiResponse<RoomType[]>> {
    const response = await api.get('/rooms/types', { params });
    return response.data;
  }

  async getRoomType(id: string): Promise<RoomType> {
    const response = await api.get(`/rooms/types/${id}`);
    return response.data;
  }

  async createRoomType(data: Partial<RoomType>): Promise<RoomType> {
    const response = await api.post('/rooms/types', data);
    return response.data;
  }

  async updateRoomType(id: string, data: Partial<RoomType>): Promise<RoomType> {
    const response = await api.put(`/rooms/types/${id}`, data);
    return response.data;
  }

  async deleteRoomType(id: string): Promise<void> {
    await api.delete(`/rooms/types/${id}`);
  }

  // Rooms
  async getRooms(filters?: RoomFilters): Promise<ApiResponse<Room[]>> {
    // Clean up empty string values before sending
    const cleanFilters: any = {};
    if (filters) {
      if (filters.page) cleanFilters.page = filters.page;
      if (filters.limit) cleanFilters.limit = filters.limit;
      if (filters.status && filters.status !== '') cleanFilters.status = filters.status;
      if (filters.floor !== undefined) cleanFilters.floor = filters.floor;
      if (filters.room_type_id && filters.room_type_id !== '') cleanFilters.room_type_id = filters.room_type_id;
      if (filters.view_type && filters.view_type !== '') cleanFilters.view_type = filters.view_type;
      if (filters.building && filters.building !== '') cleanFilters.building = filters.building;
      if (filters.sort_by) cleanFilters.sort_by = filters.sort_by;
      if (filters.order) cleanFilters.order = filters.order;
      // Note: 'search' is not supported by the backend
    }
    const response = await api.get('/rooms/', { params: cleanFilters });
    return response.data;
  }

  async getRoom(id: string): Promise<Room> {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  }

  async createRoom(data: RoomCreateInput): Promise<Room> {
    const response = await api.post('/rooms/', data);
    return response.data;
  }

  async updateRoom(id: string, data: RoomUpdateInput): Promise<Room> {
    const response = await api.put(`/rooms/${id}`, data);
    return response.data;
  }

  async deleteRoom(id: string): Promise<void> {
    await api.delete(`/rooms/${id}`);
  }

  async updateRoomStatus(id: string, status: string, notes?: string): Promise<Room> {
    const response = await api.post(`/rooms/${id}/status`, { status, notes });
    return response.data;
  }

  // Availability
  async checkAvailability(
    roomId: string,
    checkIn: string,
    checkOut: string
  ): Promise<boolean> {
    const response = await api.get(`/rooms/${roomId}/availability`, {
      params: { check_in: checkIn, check_out: checkOut }
    });
    return response.data.is_available;
  }

  // Statistics
  async getRoomStatistics(): Promise<any> {
    const response = await api.get('/rooms/statistics');
    return response.data;
  }
}

export default new RoomService();