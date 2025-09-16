import { api } from '../api';
import type {
  // Core types
  RoomAllocation,
  CreateRoomAllocation,
  UpdateRoomAllocation,
  
  // Assignment operations
  AssignRoomRequest,
  AssignRoomResponse,
  AutoAssignRequest,
  AutoAssignResponse,
  ChangeRoomRequest,
  ChangeRoomResponse,
  
  // Room blocks
  RoomBlock,
  CreateRoomBlock,
  ReleaseBlockRequest,
  
  // Alerts
  AllocationAlert,
  CreateAllocationAlert,
  UpdateAllocationAlert,
  UnassignedBookingsResponse,
  BulkResolveAlertsRequest,
  BulkResolveAlertsResponse,
  
  // Grid and calendar
  MonthlyGridRequest,
  MonthlyGridResponse,
  AvailableRoomsRequest,
  AvailableRoomsResponse,
  
  // Analytics
  OptimizationReport,
  AllocationStatistics,
  DailyAllocationSummary,
  AllocationDashboard,
  
  // Guest preferences
  GuestRoomPreferences,
  CreateGuestPreferences,
  UpdateGuestPreferences,
  
  // Rules and history
  AllocationRule,
  CreateAllocationRule,
  UpdateAllocationRule,
  AllocationHistory,
  
  // Validation
  AssignmentValidation,
  
  // Enums
  AlertSeverity,
  AssignmentStrategy,
  BlockType
} from '@/types/room-allocation';

export const roomAllocationApi = {
  // ================================
  // CORE ROOM ASSIGNMENT OPERATIONS
  // ================================

  /**
   * Assign a specific room to a booking
   */
  async assignRoom(request: AssignRoomRequest): Promise<AssignRoomResponse> {
    const response = await api.post('/room-allocation/assign-room', request);
    return response.data;
  },

  /**
   * Automatically assign rooms to unassigned bookings
   */
  async autoAssignRooms(request: AutoAssignRequest): Promise<AutoAssignResponse> {
    const response = await api.post('/room-allocation/auto-assign', request);
    return response.data;
  },

  /**
   * Change room assignment for an existing allocation
   */
  async changeRoom(allocationId: string, request: ChangeRoomRequest): Promise<ChangeRoomResponse> {
    const response = await api.put(`/room-allocation/${allocationId}/change-room`, request);
    return response.data;
  },

  /**
   * Get allocation details by ID
   */
  async getAllocation(allocationId: string): Promise<RoomAllocation> {
    const response = await api.get(`/room-allocation/allocations/${allocationId}`);
    return response.data;
  },

  /**
   * Update allocation details
   */
  async updateAllocation(allocationId: string, updates: UpdateRoomAllocation): Promise<RoomAllocation> {
    const response = await api.put(`/room-allocation/allocations/${allocationId}`, updates);
    return response.data;
  },

  /**
   * Cancel a room allocation
   */
  async cancelAllocation(allocationId: string, reason: string): Promise<void> {
    await api.delete(`/room-allocation/allocations/${allocationId}?reason=${encodeURIComponent(reason)}`);
  },

  /**
   * Validate if a room can be assigned to a booking
   */
  async validateAssignment(bookingId: string, roomId: string): Promise<AssignmentValidation> {
    const response = await api.post(`/room-allocation/validate-assignment?booking_id=${bookingId}&room_id=${roomId}`);
    return response.data;
  },

  // ================================
  // GRID AND CALENDAR VIEWS
  // ================================

  /**
   * Get room allocation grid for a month
   */
  async getMonthlyGrid(params: {
    month: string;
    room_type_ids?: string[];
    floors?: number[];
    include_blocked?: boolean;
    include_maintenance?: boolean;
  }): Promise<MonthlyGridResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('month', params.month);
    
    if (params.room_type_ids?.length) {
      queryParams.append('room_type_ids', params.room_type_ids.join(','));
    }
    if (params.floors?.length) {
      queryParams.append('floors', params.floors.join(','));
    }
    if (params.include_blocked !== undefined) {
      queryParams.append('include_blocked', params.include_blocked.toString());
    }
    if (params.include_maintenance !== undefined) {
      queryParams.append('include_maintenance', params.include_maintenance.toString());
    }
    
    const response = await api.get(`/room-allocation/monthly-grid?${queryParams}`);
    return response.data;
  },

  /**
   * Get available rooms for specific dates and criteria
   */
  async getAvailableRooms(params: {
    check_in_date: string;
    check_out_date: string;
    room_type_id?: string;
    guest_count?: number;
    accessibility_required?: boolean;
    features_required?: string[];
    exclude_rooms?: string[];
    booking_id?: string;  // Include room assigned to this booking
  }): Promise<AvailableRoomsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('check_in_date', params.check_in_date);
    queryParams.append('check_out_date', params.check_out_date);
    
    if (params.room_type_id) {
      queryParams.append('room_type_id', params.room_type_id);
    }
    if (params.guest_count) {
      queryParams.append('guest_count', params.guest_count.toString());
    }
    if (params.accessibility_required) {
      queryParams.append('accessibility_required', params.accessibility_required.toString());
    }
    if (params.features_required?.length) {
      queryParams.append('features_required', params.features_required.join(','));
    }
    if (params.exclude_rooms?.length) {
      queryParams.append('exclude_rooms', params.exclude_rooms.join(','));
    }
    if (params.booking_id) {
      queryParams.append('booking_id', params.booking_id);
    }
    
    const response = await api.get(`/room-allocation/available-rooms?${queryParams}`);
    return response.data;
  },

  // ================================
  // ALERT MANAGEMENT
  // ================================

  /**
   * Get all unassigned booking alerts
   */
  async getUnassignedBookings(params?: {
    severity?: AlertSeverity;
    hours_ahead?: number;
  }): Promise<UnassignedBookingsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.severity) {
      queryParams.append('severity', params.severity);
    }
    if (params?.hours_ahead) {
      queryParams.append('hours_ahead', params.hours_ahead.toString());
    }
    
    const response = await api.get(`/room-allocation/alerts/unassigned?${queryParams}`);
    return response.data;
  },

  /**
   * Bulk resolve alerts
   */
  async bulkResolveAlerts(request: BulkResolveAlertsRequest): Promise<BulkResolveAlertsResponse> {
    const response = await api.post('/room-allocation/alerts/bulk-resolve', request);
    return response.data;
  },

  /**
   * Get allocation alerts with filtering
   */
  async getAllocationAlerts(params?: {
    is_resolved?: boolean;
    severity?: AlertSeverity;
    limit?: number;
  }): Promise<AllocationAlert[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.is_resolved !== undefined) {
      queryParams.append('is_resolved', params.is_resolved.toString());
    }
    if (params?.severity) {
      queryParams.append('severity', params.severity);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    const response = await api.get(`/room-allocation/alerts?${queryParams}`);
    return response.data;
  },

  /**
   * Resolve a specific alert
   */
  async resolveAlert(alertId: string, update: UpdateAllocationAlert): Promise<AllocationAlert> {
    const response = await api.put(`/room-allocation/alerts/${alertId}/resolve`, update);
    return response.data;
  },

  /**
   * Create allocation alert
   */
  async createAlert(alert: CreateAllocationAlert): Promise<AllocationAlert> {
    const response = await api.post('/room-allocation/alerts', alert);
    return response.data;
  },

  // ================================
  // ROOM BLOCKING
  // ================================

  /**
   * Create a room block
   */
  async createRoomBlock(block: CreateRoomBlock): Promise<RoomBlock> {
    const response = await api.post('/room-allocation/blocks', block);
    return response.data;
  },

  /**
   * Get room blocks with filtering
   */
  async getRoomBlocks(params?: {
    room_id?: string;
    is_active?: boolean;
    start_date?: string;
    end_date?: string;
    block_type?: BlockType;
  }): Promise<RoomBlock[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.room_id) {
      queryParams.append('room_id', params.room_id);
    }
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    if (params?.start_date) {
      queryParams.append('start_date', params.start_date);
    }
    if (params?.end_date) {
      queryParams.append('end_date', params.end_date);
    }
    if (params?.block_type) {
      queryParams.append('block_type', params.block_type);
    }
    
    const response = await api.get(`/room-allocation/blocks?${queryParams}`);
    return response.data;
  },

  /**
   * Release a room block
   */
  async releaseRoomBlock(blockId: string, request: ReleaseBlockRequest): Promise<void> {
    await api.delete(`/room-allocation/blocks/${blockId}/release`, { data: request });
  },

  // ================================
  // ANALYTICS AND REPORTS
  // ================================

  /**
   * Get room allocation optimization report
   */
  async getOptimizationReport(startDate: string, endDate: string): Promise<OptimizationReport> {
    const response = await api.get(`/room-allocation/reports/optimization?start_date=${startDate}&end_date=${endDate}`);
    return response.data;
  },

  /**
   * Get allocation statistics
   */
  async getAllocationStatistics(periodDays: number = 30): Promise<AllocationStatistics> {
    const response = await api.get(`/room-allocation/statistics?period_days=${periodDays}`);
    return response.data;
  },

  /**
   * Get daily allocation summary
   */
  async getDailySummary(startDate: string, endDate: string): Promise<DailyAllocationSummary[]> {
    const response = await api.get(`/room-allocation/daily-summary?start_date=${startDate}&end_date=${endDate}`);
    return response.data;
  },

  /**
   * Get allocation dashboard data
   */
  async getAllocationDashboard(): Promise<AllocationDashboard> {
    const response = await api.get('/room-allocation/dashboard');
    return response.data;
  },

  // ================================
  // GUEST PREFERENCES
  // ================================

  /**
   * Create or update guest room preferences
   */
  async createGuestPreferences(preferences: CreateGuestPreferences): Promise<GuestRoomPreferences> {
    const response = await api.post('/room-allocation/preferences', preferences);
    return response.data;
  },

  /**
   * Get guest room preferences
   */
  async getGuestPreferences(customerId: string): Promise<GuestRoomPreferences> {
    const response = await api.get(`/room-allocation/preferences/${customerId}`);
    return response.data;
  },

  /**
   * Update guest room preferences
   */
  async updateGuestPreferences(customerId: string, updates: UpdateGuestPreferences): Promise<GuestRoomPreferences> {
    const response = await api.put(`/room-allocation/preferences/${customerId}`, updates);
    return response.data;
  },

  // ================================
  // ALLOCATION RULES
  // ================================

  /**
   * Create allocation rule
   */
  async createAllocationRule(rule: CreateAllocationRule): Promise<AllocationRule> {
    const response = await api.post('/room-allocation/rules', rule);
    return response.data;
  },

  /**
   * Get allocation rules
   */
  async getAllocationRules(params?: {
    is_active?: boolean;
    rule_type?: string;
  }): Promise<AllocationRule[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    if (params?.rule_type) {
      queryParams.append('rule_type', params.rule_type);
    }
    
    const response = await api.get(`/room-allocation/rules?${queryParams}`);
    return response.data;
  },

  /**
   * Update allocation rule
   */
  async updateAllocationRule(ruleId: string, updates: UpdateAllocationRule): Promise<AllocationRule> {
    const response = await api.put(`/room-allocation/rules/${ruleId}`, updates);
    return response.data;
  },

  /**
   * Delete allocation rule
   */
  async deleteAllocationRule(ruleId: string): Promise<void> {
    await api.delete(`/room-allocation/rules/${ruleId}`);
  },

  // ================================
  // ALLOCATION HISTORY
  // ================================

  /**
   * Get allocation change history
   */
  async getAllocationHistory(allocationId: string): Promise<AllocationHistory[]> {
    const response = await api.get(`/room-allocation/history/${allocationId}`);
    return response.data;
  },

  // ================================
  // UTILITY FUNCTIONS
  // ================================

  /**
   * Get allocations for a specific booking
   */
  async getAllocationsForBooking(bookingId: string): Promise<RoomAllocation[]> {
    const response = await api.get(`/room-allocation/allocations?booking_id=${bookingId}`);
    return response.data;
  },

  /**
   * Get allocations for a specific room
   */
  async getAllocationsForRoom(roomId: string, params?: {
    start_date?: string;
    end_date?: string;
    status?: string[];
  }): Promise<RoomAllocation[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('room_id', roomId);
    
    if (params?.start_date) {
      queryParams.append('start_date', params.start_date);
    }
    if (params?.end_date) {
      queryParams.append('end_date', params.end_date);
    }
    if (params?.status?.length) {
      queryParams.append('status', params.status.join(','));
    }
    
    const response = await api.get(`/room-allocation/allocations?${queryParams}`);
    return response.data;
  },

  /**
   * Get room availability for a date range
   */
  async getRoomAvailability(params: {
    start_date: string;
    end_date: string;
    room_type_id?: string;
    include_blocks?: boolean;
  }): Promise<{
    available_rooms: string[];
    occupied_rooms: string[];
    blocked_rooms: string[];
    maintenance_rooms: string[];
  }> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', params.start_date);
    queryParams.append('end_date', params.end_date);
    
    if (params.room_type_id) {
      queryParams.append('room_type_id', params.room_type_id);
    }
    if (params.include_blocks !== undefined) {
      queryParams.append('include_blocks', params.include_blocks.toString());
    }
    
    const response = await api.get(`/room-allocation/availability?${queryParams}`);
    return response.data;
  },

  /**
   * Get allocation conflicts for a room and date range
   */
  async getConflicts(roomId: string, checkInDate: string, checkOutDate: string): Promise<{
    conflicts: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const response = await api.get(
      `/room-allocation/conflicts?room_id=${roomId}&check_in_date=${checkInDate}&check_out_date=${checkOutDate}`
    );
    return response.data;
  },

  /**
   * Get room assignment suggestions for a booking
   */
  async getAssignmentSuggestions(bookingId: string, strategy?: AssignmentStrategy): Promise<{
    recommended_rooms: Array<{
      room_id: string;
      room_number: string;
      room_type: string;
      score: number;
      reasons: string[];
    }>;
    strategy_used: string;
    preferences_considered: Record<string, any>;
  }> {
    const queryParams = new URLSearchParams();
    queryParams.append('booking_id', bookingId);
    
    if (strategy) {
      queryParams.append('strategy', strategy);
    }
    
    const response = await api.get(`/room-allocation/suggestions?${queryParams}`);
    return response.data;
  }
};

export default roomAllocationApi;