// Room Allocation System Types
// Comprehensive type definitions for room allocation management

export type AssignmentType = 'auto' | 'manual' | 'guest_request' | 'upgrade' | 'downgrade';

export type AssignmentStatus = 'pre_assigned' | 'assigned' | 'locked' | 'cancelled';

export type BlockType = 'maintenance' | 'renovation' | 'vip_hold' | 'long_stay' | 'staff' | 'inspection' | 'deep_clean';

export type AlertType = 
  | 'unassigned_24h' 
  | 'unassigned_1h' 
  | 'unassigned_critical'
  | 'conflict_detected' 
  | 'upgrade_available' 
  | 'room_blocked'
  | 'assignment_failed' 
  | 'rate_change_required';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type RoomStatus = 
  | 'available' 
  | 'occupied' 
  | 'blocked' 
  | 'maintenance' 
  | 'arriving' 
  | 'departing' 
  | 'pre_assigned';

export type AssignmentStrategy = 
  | 'optimize_occupancy' 
  | 'group_by_type' 
  | 'vip_first' 
  | 'distribute_wear';

// Core Allocation Interfaces
export interface RoomAllocation {
  id: string;
  booking_id: string;
  room_id: string;
  assignment_type: AssignmentType;
  assignment_status: AssignmentStatus;
  check_in_date: string;
  check_out_date: string;
  nights_count: number;
  original_room_type_id?: string;
  original_rate?: number;
  allocated_rate?: number;
  rate_difference?: number;
  assigned_at?: string;
  assigned_by?: string;
  assignment_reason?: string;
  previous_room_id?: string;
  changed_at?: string;
  changed_by?: string;
  change_reason?: string;
  guest_preferences?: Record<string, any>;
  internal_notes?: string;
  is_vip: boolean;
  is_guaranteed: boolean;
  requires_inspection: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoomAllocation {
  booking_id: string;
  room_id: string;
  assignment_type: AssignmentType;
  assignment_status: AssignmentStatus;
  check_in_date: string;
  check_out_date: string;
  assignment_reason?: string;
  guest_preferences?: Record<string, any>;
  internal_notes?: string;
  is_vip?: boolean;
  is_guaranteed?: boolean;
  requires_inspection?: boolean;
  original_room_type_id?: string;
  original_rate?: number;
  allocated_rate?: number;
  assigned_by?: string;
}

export interface UpdateRoomAllocation {
  room_id?: string;
  assignment_status?: AssignmentStatus;
  check_in_date?: string;
  check_out_date?: string;
  assignment_reason?: string;
  guest_preferences?: Record<string, any>;
  internal_notes?: string;
  is_guaranteed?: boolean;
  requires_inspection?: boolean;
  changed_by?: string;
  change_reason?: string;
}

// Assignment Requests
export interface AssignRoomRequest {
  booking_id: string;
  room_id: string;
  assignment_type?: AssignmentType;
  assignment_reason?: string;
  is_guaranteed?: boolean;
  override_conflicts?: boolean;
}

export interface AssignRoomResponse {
  allocation_id: string;
  room_assigned: {
    room_number: string;
    room_type: string;
    floor: number;
  };
  price_adjustment?: {
    original_rate: number;
    new_rate: number;
    difference: number;
    total_difference: number;
    nights: number;
  };
  status: AssignmentStatus;
  conflicts?: string[];
  warnings?: string[];
}

export interface AutoAssignRequest {
  date_range: {
    from: string;
    to: string;
  };
  assignment_strategy?: AssignmentStrategy;
  respect_preferences?: boolean;
  room_type_ids?: string[];
  include_vip_only?: boolean;
}

export interface AutoAssignResponse {
  assignments_created: number;
  assignments_failed: number;
  assignments: AssignRoomResponse[];
  failed_bookings: Array<{
    booking_id: string;
    booking_code: string;
    guest_name: string;
    reason: string;
    suggestions: string[];
  }>;
  summary: Record<string, any>;
}

export interface ChangeRoomRequest {
  new_room_id: string;
  change_reason: string;
  apply_charges?: boolean;
  notify_guest?: boolean;
  override_conflicts?: boolean;
}

export interface ChangeRoomResponse {
  allocation_id: string;
  previous_room: {
    room_number: string;
    room_type: string;
    floor: number;
  };
  new_room: {
    room_number: string;
    room_type: string;
    floor: number;
  };
  price_adjustment?: {
    original_rate: number;
    new_rate: number;
    difference: number;
    total_difference: number;
    nights: number;
  };
  charges_applied: boolean;
  status: string;
}

// Room Blocks
export interface RoomBlock {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  block_type: BlockType;
  block_reason?: string;
  is_active: boolean;
  can_override: boolean;
  override_level?: string;
  created_by?: string;
  created_at: string;
  released_at?: string;
  released_by?: string;
}

export interface CreateRoomBlock {
  room_id: string;
  start_date: string;
  end_date: string;
  block_type: BlockType;
  block_reason?: string;
  can_override?: boolean;
  override_level?: string;
  created_by?: string;
}

export interface ReleaseBlockRequest {
  release_reason: string;
  released_by?: string;
}

// Allocation Alerts
export interface AllocationAlert {
  id: string;
  booking_id: string;
  allocation_id?: string;
  alert_type: AlertType;
  alert_message: string;
  severity: AlertSeverity;
  alert_context?: Record<string, any>;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  auto_resolved: boolean;
  notified_users: string[];
  notification_channels: string[];
  notification_sent_at?: string;
  escalation_level: number;
  escalated_at?: string;
  escalated_to?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAllocationAlert {
  booking_id: string;
  allocation_id?: string;
  alert_type: AlertType;
  alert_message: string;
  severity: AlertSeverity;
  alert_context?: Record<string, any>;
}

export interface UpdateAllocationAlert {
  is_resolved?: boolean;
  resolution_notes?: string;
  resolved_by?: string;
}

// Unassigned Bookings
export interface UnassignedBooking {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;
  room_type_id: string;
  room_type_name?: string;
  adults: number;
  children: number;
  nights: number;
  total_amount: number;
  booking_date: string;
  status: string;
  special_requests?: string;
  hours_until_checkin?: number;
  severity?: AlertSeverity;
  priority_score?: number;
  guest_preferences?: {
    floor_preference?: string;
    room_features?: string[];
    special_requirements?: string[];
  };
}

export interface UnassignedBookingsResponse {
  bookings: UnassignedBooking[];
  total: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  statistics: {
    total_unassigned: number;
    arriving_today: number;
    arriving_tomorrow: number;
    overdue: number;
    average_hours_until_checkin: number;
  };
}

// Monthly Grid Data
export interface RoomDailyStatus {
  date: string;
  status: RoomStatus;
  booking_id?: string;
  guest_name?: string;
  is_arrival: boolean;
  is_departure: boolean;
  is_vip: boolean;
  special_notes?: string;
  rate?: number;
  block_reason?: string;
}

export interface RoomGridData {
  room_id: string;
  room_number: string;
  room_type: string;
  floor: number;
  features: string[];
  daily_status: RoomDailyStatus[];
}

export interface MonthlyGridRequest {
  month: string; // Format: YYYY-MM
  room_type_ids?: string[];
  floors?: number[];
  include_blocked?: boolean;
  include_maintenance?: boolean;
}

export interface MonthlyGridResponse {
  month: string;
  days_in_month: number;
  rooms: RoomGridData[];
  summary: {
    total_rooms: number;
    days_in_month: number;
    average_occupancy_rate: number;
    peak_occupancy: number;
    total_bookings: number;
    active_blocks: number;
  };
  occupancy_stats: Array<{
    date: string;
    occupied: number;
    available: number;
    blocked: number;
    arriving: number;
    departing: number;
    occupancy_rate: number;
  }>;
}

// Unassigned Bookings
export interface UnassignedBooking {
  booking_id: string;
  booking_code: string;
  guest_name: string;
  phone?: string;
  email?: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;
  check_out_time?: string;
  room_type: string;
  room_type_id: string;
  adults: number;
  children: number;
  infants: number;
  total_guests: number;
  extra_persons: number;
  extra_person_charge: number;
  extra_bed: boolean;
  extra_bed_charge: number;
  special_requests?: string;
  internal_notes?: any;
  is_vip: boolean;
  hours_until_checkin?: number;
  alert_level: AlertSeverity;
  total_amount: number;
  paid_amount: number;
  booking_status: string;
}

export interface UnassignedBookingsResponse {
  alerts: UnassignedBooking[];
  summary: {
    total_unassigned: number;
    critical: number;
    warning: number;
    info: number;
  };
  recommendations: string[];
}

// Bulk Operations
export interface BulkResolveAlertsRequest {
  alert_ids: string[];
  action: 'auto_assign' | 'manual_assign' | 'dismiss';
  notes?: string;
  assignment_strategy?: AssignmentStrategy;
}

export interface BulkResolveAlertsResponse {
  resolved_count: number;
  failed_count: number;
  results: Array<Record<string, any>>;
  errors: string[];
}

// Available Rooms
export interface AvailableRoomInfo {
  room_id: string;
  room_number: string;
  room_type_id: string;
  room_type: string;
  floor: number;
  features: string[];
  base_rate: number;
  current_status: string;
  availability_score?: number;
  is_accessible: boolean;
  last_cleaned?: string;
  maintenance_notes?: string;
}

export interface AvailableRoomsRequest {
  check_in_date: string;
  check_out_date: string;
  room_type_id?: string;
  guest_count?: number;
  accessibility_required?: boolean;
  features_required?: string[];
  exclude_rooms?: string[];
}

export interface AvailableRoomsResponse {
  available_rooms: AvailableRoomInfo[];
  total_available: number;
  filters_applied: Record<string, any>;
  suggestions: string[];
}

// Guest Preferences
export interface GuestRoomPreferences {
  id: string;
  customer_id: string;
  preferred_room_types: string[];
  preferred_floors: number[];
  preferred_features: string[];
  avoid_floors: number[];
  avoid_features: string[];
  avoid_rooms: string[];
  accessibility_needs: Record<string, any>;
  special_requests?: string;
  priority_level: number; // 1-10 scale
  last_stayed_room?: string;
  total_stays: number;
  satisfaction_score?: number; // 1-5 stars
  created_at: string;
  updated_at: string;
}

export interface CreateGuestPreferences {
  customer_id: string;
  preferred_room_types?: string[];
  preferred_floors?: number[];
  preferred_features?: string[];
  avoid_floors?: number[];
  avoid_features?: string[];
  avoid_rooms?: string[];
  accessibility_needs?: Record<string, any>;
  special_requests?: string;
  priority_level?: number;
}

export interface UpdateGuestPreferences {
  preferred_room_types?: string[];
  preferred_floors?: number[];
  preferred_features?: string[];
  avoid_floors?: number[];
  avoid_features?: string[];
  avoid_rooms?: string[];
  accessibility_needs?: Record<string, any>;
  special_requests?: string;
  priority_level?: number;
}

// Allocation Rules
export interface AllocationRule {
  id: string;
  rule_name: string;
  rule_type: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAllocationRule {
  rule_name: string;
  rule_type: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority?: number;
  is_active?: boolean;
  created_by?: string;
}

export interface UpdateAllocationRule {
  rule_name?: string;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  priority?: number;
  is_active?: boolean;
}

// History and Audit
export interface AllocationHistory {
  id: string;
  allocation_id: string;
  booking_id: string;
  action: string;
  previous_room_id?: string;
  new_room_id?: string;
  previous_room_number?: string;
  new_room_number?: string;
  previous_dates?: string;
  new_dates?: string;
  previous_status?: string;
  new_status?: string;
  price_adjustment?: number;
  changed_by?: string;
  change_reason?: string;
  changed_at: string;
}

// Analytics and Reports
export interface OptimizationMetrics {
  average_assignment_time: string;
  auto_assignment_rate: number;
  manual_assignment_rate: number;
  room_change_rate: number;
  unassigned_alerts: number;
  late_assignments: number;
}

export interface RoomUtilization {
  room: string;
  nights: number;
  utilization: number;
  revenue: number;
  avg_rate: number;
}

export interface OptimizationRecommendation {
  type: string;
  message: string;
  priority: string;
  action_required: boolean;
}

export interface OptimizationReport {
  period: {
    from: string;
    to: string;
  };
  metrics: OptimizationMetrics;
  room_utilization: {
    most_used_rooms: RoomUtilization[];
    least_used_rooms: RoomUtilization[];
  };
  recommendations: OptimizationRecommendation[];
  trends: Record<string, any>;
}

export interface AllocationStatistics {
  total_allocations: number;
  by_status: Record<AssignmentStatus, number>;
  by_type: Record<AssignmentType, number>;
  average_lead_time_hours: number;
  room_utilization_rate: number;
  conflict_resolution_time: number;
  guest_satisfaction_impact?: number;
}

export interface DailyAllocationSummary {
  date: string;
  total_arrivals: number;
  total_departures: number;
  rooms_assigned: number;
  rooms_available: number;
  occupancy_rate: number;
  unassigned_critical: number;
  unassigned_warning: number;
  conflicts_resolved: number;
}

// Dashboard Data
export interface AllocationDashboard {
  summary?: {
    total_rooms: number;
    occupied_rooms: number;
    available_rooms: number;
    occupancy_rate: number;
    unassigned_bookings: number;
  };
  unassigned_summary?: {
    total_unassigned: number;
    critical: number;
    warning: number;
    info: number;
  };
  today_arrivals: number | {
    count: number;
    list: Array<{
      booking_id: string;
      booking_code: string;
      guest_name: string;
      room_number: string;
      room_type: string;
      check_in_time: string;
    }>;
  };
  today_departures: number | {
    count: number;
    list: Array<{
      booking_id: string;
      booking_code: string;
      guest_name: string;
      room_number: string;
      room_type: string;
      check_out_time: string;
    }>;
  };
  alerts?: {
    unassigned_today: number;
    message: string;
  };
  total_rooms?: number;
  occupied_rooms?: number;
  available_rooms?: number;
  occupancy_rate?: number;
  recent_arrivals?: Array<{
    guest_name: string;
    room_number: string;
    time: string;
  }>;
  upcoming_departures?: Array<{
    guest_name: string;
    room_number: string;
    time: string;
  }>;
}

// Validation and Utility Types
export interface AssignmentValidation {
  valid: boolean;
  conflicts: string[];
  price_adjustment?: {
    original_rate: number;
    new_rate: number;
    difference: number;
    total_difference: number;
    nights: number;
  };
  room_details: {
    room_number: string;
    room_type: string;
    floor: number;
  };
}

// Grid View UI Types
export interface GridViewSettings {
  statusColors: {
    available: string;
    occupied: string;
    arriving: string;
    departing: string;
    blocked: string;
    maintenance: string;
    pre_assigned: string;
  };
  cellDisplay: {
    primary: 'guest_name' | 'booking_code' | 'status';
    secondary: 'nights_remaining' | 'room_rate';
    icons: {
      vip: string;
      long_stay: string;
      group: string;
      notes: string;
    };
  };
  interactions: {
    hover: string;
    click: string;
    drag_drop: string;
    right_click: string;
  };
}

// Filter and Search Types
export interface AllocationFilters {
  date_range?: {
    start: string;
    end: string;
  };
  assignment_status?: AssignmentStatus[];
  assignment_type?: AssignmentType[];
  room_types?: string[];
  floors?: number[];
  is_vip?: boolean;
  is_guaranteed?: boolean;
  requires_inspection?: boolean;
  search_term?: string;
}

export interface AlertFilters {
  severity?: AlertSeverity[];
  alert_type?: AlertType[];
  is_resolved?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  escalation_level?: number[];
}

// Component Props Types
export interface RoomGridCellProps {
  room: RoomGridData;
  date: string;
  status: RoomDailyStatus;
  isSelected?: boolean;
  onCellClick?: (room: RoomGridData, date: string) => void;
  onCellDoubleClick?: (room: RoomGridData, date: string) => void;
  onDragStart?: (room: RoomGridData, date: string) => void;
  onDrop?: (room: RoomGridData, date: string) => void;
}

export interface AllocationFormProps {
  booking?: any; // Booking object
  initialRoom?: AvailableRoomInfo;
  onSubmit: (allocation: CreateRoomAllocation) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface AlertListProps {
  alerts: AllocationAlert[];
  onResolve: (alertId: string, resolution: UpdateAllocationAlert) => void;
  onBulkResolve: (request: BulkResolveAlertsRequest) => void;
  filters?: AlertFilters;
  onFiltersChange?: (filters: AlertFilters) => void;
}