import { api } from '../api'

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  country?: string
  id_number?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  date_of_birth?: string
  preferences?: any
  loyalty_points?: number
  total_stays?: number
  total_spent?: number
  last_stay_date?: string
  is_vip?: boolean
  is_blacklisted?: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface CustomerCreate {
  full_name: string
  email?: string
  phone?: string  // Optional - at least one of phone or email required
  country?: string
  id_number?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  date_of_birth?: string
  preferences?: any
  notes?: string
}

export interface CustomerListParams {
  search?: string
  is_vip?: boolean
  is_blacklisted?: boolean
  page?: number
  limit?: number
}

export const customersApi = {
  // List customers with search
  list: async (params?: CustomerListParams) => {
    const response = await api.get('/customers/', { params })
    return response.data
  },

  // Search customers by name, email, or phone
  search: async (query: string) => {
    const response = await api.get('/customers/', {
      params: { search: query, limit: 10 }
    })
    return response.data
  },

  // Get customer by ID
  get: async (id: string) => {
    const response = await api.get(`/customers/${id}`)
    return response.data
  },

  // Create new customer
  create: async (data: CustomerCreate) => {
    const response = await api.post('/customers/', data)
    return response.data
  },

  // Update customer
  update: async (id: string, data: Partial<CustomerCreate>) => {
    const response = await api.put(`/customers/${id}`, data)
    return response.data
  },

  // Delete customer
  delete: async (id: string) => {
    const response = await api.delete(`/customers/${id}`)
    return response.data
  },

  // Get customer bookings
  getBookings: async (id: string) => {
    const response = await api.get(`/customers/${id}/bookings`)
    return response.data
  }
}