/**
 * Enhanced Customer API Client based on documentation
 */
import { api } from '../api'

// Enums
export enum CustomerType {
  INDIVIDUAL = 'individual',
  CORPORATE = 'corporate',
  TRAVEL_AGENT = 'travel_agent',
  GOVERNMENT = 'government'
}

export enum VIPStatus {
  NONE = 'none',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLACKLISTED = 'blacklisted',
  SUSPENDED = 'suspended'
}

export enum CustomerSource {
  WALK_IN = 'walk_in',
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  REFERRAL = 'referral',
  OTA = 'ota',
  CORPORATE = 'corporate',
  SOCIAL_MEDIA = 'social_media'
}

export enum Title {
  MR = 'Mr',
  MRS = 'Mrs',
  MS = 'Ms',
  DR = 'Dr',
  PROF = 'Prof'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum IDType {
  PASSPORT = 'passport',
  NATIONAL_ID = 'national_id',
  DRIVER_LICENSE = 'driver_license'
}

// Interfaces
export interface AddressInfo {
  line1?: string
  line2?: string
  city?: string
  state_province?: string
  postal_code?: string
  country?: string
}

export interface EmergencyContact {
  name?: string
  phone?: string
  relationship?: string
}

export interface CustomerPreferences {
  room_preferences: string[]
  bed_preference?: string
  pillow_preference?: string
  dietary_restrictions: string[]
  allergies: string[]
  newspaper_preference?: string
  wake_up_call?: string
  temperature_preference?: number
  special_requirements?: string
}

export interface CustomerStatistics {
  total_stays: number
  total_nights: number
  total_spent: number
  average_spend_per_stay: number
  last_stay_date?: string
  first_stay_date?: string
  days_since_last_stay?: number
  lifetime_value: number
  booking_frequency: number
  cancellation_rate: number
  no_show_rate: number
  average_lead_time: number
  favorite_room_type?: string
  loyalty_points: number
  loyalty_tier?: string
  profile_completeness: number
}

export interface Customer {
  id: string
  customer_code: string
  
  // Personal Information
  title?: Title
  first_name?: string
  middle_name?: string
  last_name?: string
  full_name: string
  display_name?: string
  
  // Birth and Gender
  date_of_birth?: string
  age?: number
  gender?: Gender
  
  // Nationality and Language
  nationality?: string
  passport_country?: string
  languages_spoken: string[]
  preferred_language: string
  
  // Contact Information
  email?: string
  email_verified: boolean
  alternative_email?: string
  phone?: string
  phone_verified: boolean
  alternative_phone?: string
  whatsapp_number?: string
  wechat_id?: string
  
  // Address
  address?: AddressInfo
  
  // Emergency Contact
  emergency_contact?: EmergencyContact
  
  // Identification
  id_type?: IDType
  id_number?: string
  id_issue_date?: string
  id_expiry_date?: string
  id_issuing_country?: string
  
  // Customer Categories
  customer_type: CustomerType
  customer_source?: CustomerSource
  vip_status: VIPStatus
  
  // Company Information
  company_name?: string
  job_title?: string
  department?: string
  company_email?: string
  company_phone?: string
  
  // Tax Information
  tax_id?: string
  tax_id_type?: string
  billing_address?: string
  
  // Preferences
  preferences?: CustomerPreferences
  
  // Marketing and Privacy
  marketing_consent: boolean
  privacy_preferences: Record<string, boolean>
  
  // Notes and Status
  notes?: string
  tags: string[]
  is_blacklisted: boolean
  blacklist_reason?: string
  status: CustomerStatus
  
  // Statistics
  statistics?: CustomerStatistics
  
  // Timestamps
  created_at: string
  updated_at: string
  created_by?: string
  last_modified_by?: string
}

export interface CustomerCreate {
  // Personal Information
  title?: Title
  first_name?: string
  middle_name?: string
  last_name?: string
  full_name: string
  display_name?: string
  
  // Birth and Gender
  date_of_birth?: string
  gender?: Gender
  
  // Nationality and Language
  nationality?: string
  passport_country?: string
  languages_spoken?: string[]
  preferred_language?: string
  
  // Contact Information
  email?: string
  alternative_email?: string
  phone?: string
  alternative_phone?: string
  whatsapp_number?: string
  wechat_id?: string
  
  // Address
  address?: AddressInfo
  
  // Emergency Contact
  emergency_contact?: EmergencyContact
  
  // Identification
  id_type?: IDType
  id_number?: string
  id_issue_date?: string
  id_expiry_date?: string
  id_issuing_country?: string
  
  // Customer Categories
  customer_type?: CustomerType
  customer_source?: CustomerSource
  
  // Company Information
  company_name?: string
  job_title?: string
  department?: string
  company_email?: string
  company_phone?: string
  
  // Tax Information
  tax_id?: string
  tax_id_type?: string
  billing_address?: string
  
  // Preferences
  preferences?: CustomerPreferences
  
  // Marketing and Privacy
  marketing_consent?: boolean
  privacy_preferences?: Record<string, boolean>
  
  // Notes and Status
  notes?: string
  tags?: string[]
}

export interface CustomerUpdate extends Partial<CustomerCreate> {}

export interface CustomerSearchParams {
  search?: string
  customer_type?: CustomerType
  vip_status?: VIPStatus
  status?: CustomerStatus
  has_stayed?: boolean
  is_blacklisted?: boolean
  country?: string
  city?: string
  created_after?: string
  created_before?: string
  last_stay_after?: string
  last_stay_before?: string
  page?: number
  limit?: number
  sort_by?: string
  order?: 'asc' | 'desc'
}

export interface CustomerListResponse {
  data: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface DuplicateCheckResponse {
  has_duplicates: boolean
  duplicates: Customer[]
  similarity_scores?: Record<string, number>
  suggested_action?: 'merge' | 'update_existing' | 'create_new'
}

export interface CustomerMergeRequest {
  primary_customer_id: string
  customer_ids_to_merge: string[]
  merge_preferences?: Record<string, string>
}

// API Functions
export const customersEnhancedApi = {
  // Create customer
  create: async (data: CustomerCreate, checkDuplicates = true): Promise<Customer> => {
    const response = await api.post('/customers/', data, {
      params: { check_duplicates: checkDuplicates }
    })
    return response.data
  },

  // Search customers
  search: async (params: CustomerSearchParams = {}): Promise<CustomerListResponse> => {
    const response = await api.get('/customers/search', { params })
    return response.data
  },

  // Get customer by ID
  get: async (id: string, includeStatistics = true): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`, {
      params: { include_statistics: includeStatistics }
    })
    return response.data
  },

  // Update customer
  update: async (id: string, data: CustomerUpdate): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, data)
    return response.data
  },

  // Delete customer
  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`)
  },

  // Check for duplicates
  checkDuplicates: async (
    email?: string,
    phone?: string,
    idNumber?: string
  ): Promise<DuplicateCheckResponse> => {
    const params: Record<string, string> = {}
    if (email) params.email = email
    if (phone) params.phone = phone
    if (idNumber) params.id_number = idNumber

    const response = await api.get('/customers/check-duplicates', { params })
    return response.data
  },

  // Merge customers
  merge: async (mergeRequest: CustomerMergeRequest): Promise<Customer> => {
    const response = await api.post('/customers/merge', mergeRequest)
    return response.data
  },

  // Add loyalty points
  addLoyaltyPoints: async (
    id: string,
    points: number,
    reason: string
  ): Promise<{ message: string; previous_points: number; points_added: number; new_total: number }> => {
    const response = await api.post(`/customers/${id}/add-loyalty-points`, {
      points,
      reason
    })
    return response.data
  },

  // Blacklist customer
  blacklist: async (id: string, reason: string): Promise<{ message: string }> => {
    const response = await api.post(`/customers/${id}/blacklist`, { reason })
    return response.data
  },

  // Remove from blacklist
  removeFromBlacklist: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/customers/${id}/blacklist`)
    return response.data
  },

  // Get customer statistics
  getStatistics: async (id: string): Promise<CustomerStatistics> => {
    const customer = await customersEnhancedApi.get(id, true)
    return customer.statistics || {
      total_stays: 0,
      total_nights: 0,
      total_spent: 0,
      average_spend_per_stay: 0,
      lifetime_value: 0,
      booking_frequency: 0,
      cancellation_rate: 0,
      no_show_rate: 0,
      average_lead_time: 0,
      loyalty_points: 0,
      profile_completeness: 0
    }
  }
}

// Helper functions
export const getVIPBadgeColor = (status: VIPStatus): string => {
  const colors = {
    [VIPStatus.DIAMOND]: 'bg-purple-100 text-purple-800 border-purple-200',
    [VIPStatus.PLATINUM]: 'bg-gray-100 text-gray-800 border-gray-200',
    [VIPStatus.GOLD]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [VIPStatus.SILVER]: 'bg-slate-100 text-slate-800 border-slate-200',
    [VIPStatus.NONE]: 'bg-white text-gray-500 border-gray-200'
  }
  return colors[status] || 'bg-gray-100 border-gray-200'
}

export const getCustomerTypeLabel = (type: CustomerType): string => {
  const labels = {
    [CustomerType.INDIVIDUAL]: 'Individual',
    [CustomerType.CORPORATE]: 'Corporate',
    [CustomerType.TRAVEL_AGENT]: 'Travel Agent',
    [CustomerType.GOVERNMENT]: 'Government'
  }
  return labels[type] || type
}

export const getCustomerStatusColor = (status: CustomerStatus): string => {
  const colors = {
    [CustomerStatus.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
    [CustomerStatus.INACTIVE]: 'bg-gray-100 text-gray-800 border-gray-200',
    [CustomerStatus.BLACKLISTED]: 'bg-red-100 text-red-800 border-red-200',
    [CustomerStatus.SUSPENDED]: 'bg-orange-100 text-orange-800 border-orange-200'
  }
  return colors[status] || 'bg-gray-100 border-gray-200'
}

export const formatCurrency = (amount: number, currency = 'VND'): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount)
}

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const calculateProfileCompleteness = (customer: Customer): number => {
  const requiredFields = ['full_name', 'email', 'phone']
  const importantFields = [
    'date_of_birth', 'nationality', 'id_type', 'id_number',
    'address', 'emergency_contact', 'preferences'
  ]
  
  let score = 0
  
  // Required fields (60%)
  requiredFields.forEach(field => {
    if (customer[field as keyof Customer]) score += 20
  })
  
  // Important fields (40%)
  importantFields.forEach(field => {
    if (customer[field as keyof Customer]) score += 40 / importantFields.length
  })
  
  return Math.min(Math.round(score), 100)
}