import { api } from '../api'

export interface Room {
  id: string
  room_number: string
  room_type_id: string
  room_type?: RoomType
  floor: number
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning'
  capacity: number
  amenities?: string[]
  description?: string
  created_at: string
  updated_at: string
}

export interface RoomType {
  id: string
  name: string
  code: string
  base_rate: number
  capacity: number
  description?: string
  amenities?: string[]
}

export interface RoomListParams {
  room_type_id?: string
  status?: string
  floor?: number
  page?: number
  limit?: number
}

export const roomsApi = {
  // List rooms with filters
  list: async (params?: RoomListParams) => {
    const response = await api.get('/rooms/', { params })
    return response.data
  },

  // Get room by ID
  getById: async (id: string) => {
    const response = await api.get(`/rooms/${id}`)
    return response.data
  },

  // Get available rooms
  getAvailable: async (params: {
    check_in_date: string
    check_out_date: string
    room_type_id?: string
    exclude_booking_id?: string
  }) => {
    const response = await api.get('/rooms/available', { params })
    return response.data
  },

  // Update room status
  updateStatus: async (id: string, status: string) => {
    const response = await api.put(`/rooms/${id}/status`, { status })
    return response.data
  },

  // Get room types
  getRoomTypes: async () => {
    const response = await api.get('/rooms/types')
    return response.data
  }
}