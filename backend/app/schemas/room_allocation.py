from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field, validator, root_validator


# Enums for validation
class AssignmentType(str, Enum):
    AUTO = "auto"
    MANUAL = "manual"
    GUEST_REQUEST = "guest_request"
    UPGRADE = "upgrade"
    DOWNGRADE = "downgrade"


class AssignmentStatus(str, Enum):
    PRE_ASSIGNED = "pre_assigned"
    ASSIGNED = "assigned"
    LOCKED = "locked"
    CANCELLED = "cancelled"


class BlockType(str, Enum):
    MAINTENANCE = "maintenance"
    RENOVATION = "renovation"
    VIP_HOLD = "vip_hold"
    LONG_STAY = "long_stay"
    STAFF = "staff"
    INSPECTION = "inspection"
    DEEP_CLEAN = "deep_clean"


class AlertType(str, Enum):
    UNASSIGNED_24H = "unassigned_24h"
    UNASSIGNED_1H = "unassigned_1h"
    UNASSIGNED_CRITICAL = "unassigned_critical"
    CONFLICT_DETECTED = "conflict_detected"
    UPGRADE_AVAILABLE = "upgrade_available"
    ROOM_BLOCKED = "room_blocked"
    ASSIGNMENT_FAILED = "assignment_failed"
    RATE_CHANGE_REQUIRED = "rate_change_required"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class RoomStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    BLOCKED = "blocked"
    MAINTENANCE = "maintenance"
    ARRIVING = "arriving"
    DEPARTING = "departing"
    PRE_ASSIGNED = "pre_assigned"
    CLEANING = "cleaning"


class AssignmentStrategy(str, Enum):
    OPTIMIZE_OCCUPANCY = "optimize_occupancy"
    GROUP_BY_TYPE = "group_by_type"
    VIP_FIRST = "vip_first"
    DISTRIBUTE_WEAR = "distribute_wear"


# Base schemas
class RoomAllocationBase(BaseModel):
    booking_id: UUID
    room_id: UUID
    assignment_type: AssignmentType
    assignment_status: AssignmentStatus
    check_in_date: date
    check_out_date: date
    assignment_reason: Optional[str] = None
    guest_preferences: Optional[Dict[str, Any]] = {}
    internal_notes: Optional[str] = None
    is_vip: bool = False
    is_guaranteed: bool = False
    requires_inspection: bool = False

    @validator('check_out_date')
    def validate_checkout_after_checkin(cls, v, values):
        if 'check_in_date' in values and v <= values['check_in_date']:
            raise ValueError('Check-out date must be after check-in date')
        return v


class RoomAllocationCreate(RoomAllocationBase):
    original_room_type_id: Optional[UUID] = None
    original_rate: Optional[Decimal] = None
    allocated_rate: Optional[Decimal] = None
    assigned_by: Optional[UUID] = None


class RoomAllocationUpdate(BaseModel):
    room_id: Optional[UUID] = None
    assignment_status: Optional[AssignmentStatus] = None
    check_in_date: Optional[date] = None
    check_out_date: Optional[date] = None
    assignment_reason: Optional[str] = None
    guest_preferences: Optional[Dict[str, Any]] = None
    internal_notes: Optional[str] = None
    is_guaranteed: Optional[bool] = None
    requires_inspection: Optional[bool] = None
    changed_by: Optional[UUID] = None
    change_reason: Optional[str] = None


class RoomAllocationResponse(RoomAllocationBase):
    id: UUID
    nights_count: int
    original_room_type_id: Optional[UUID] = None
    original_rate: Optional[Decimal] = None
    allocated_rate: Optional[Decimal] = None
    rate_difference: Optional[Decimal] = None
    assigned_at: Optional[datetime] = None
    assigned_by: Optional[UUID] = None
    previous_room_id: Optional[UUID] = None
    changed_at: Optional[datetime] = None
    changed_by: Optional[UUID] = None
    change_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Room Assignment Request
class AssignRoomRequest(BaseModel):
    booking_id: UUID
    room_id: UUID
    assignment_type: AssignmentType = AssignmentType.MANUAL
    assignment_reason: Optional[str] = None
    is_guaranteed: bool = False
    override_conflicts: bool = False


class AssignRoomResponse(BaseModel):
    allocation_id: UUID
    room_assigned: Dict[str, Any]
    price_adjustment: Optional[Dict[str, Any]] = None
    status: AssignmentStatus
    conflicts: Optional[List[str]] = []
    warnings: Optional[List[str]] = []


# Auto Assignment Request
class AutoAssignRequest(BaseModel):
    date_range: Dict[str, date] = Field(..., description="from and to dates")
    assignment_strategy: AssignmentStrategy = AssignmentStrategy.OPTIMIZE_OCCUPANCY
    respect_preferences: bool = True
    room_type_ids: Optional[List[UUID]] = None
    include_vip_only: bool = False

    @validator('date_range')
    def validate_date_range(cls, v):
        if 'from' not in v or 'to' not in v:
            raise ValueError('Date range must contain "from" and "to" keys')
        if v['to'] < v['from']:
            raise ValueError('End date must be after start date')
        return v


class AutoAssignResponse(BaseModel):
    assignments_created: int
    assignments_failed: int
    assignments: List[AssignRoomResponse]
    failed_bookings: List[Dict[str, Any]]
    summary: Dict[str, Any]


# Room Change Request
class ChangeRoomRequest(BaseModel):
    new_room_id: UUID
    change_reason: str
    apply_charges: bool = True
    notify_guest: bool = False
    override_conflicts: bool = False


class ChangeRoomResponse(BaseModel):
    allocation_id: UUID
    previous_room: Dict[str, Any]
    new_room: Dict[str, Any]
    price_adjustment: Optional[Dict[str, Any]] = None
    charges_applied: bool
    status: str


# Room Blocks
class RoomBlockBase(BaseModel):
    room_id: UUID
    start_date: date
    end_date: date
    block_type: BlockType
    block_reason: Optional[str] = None
    can_override: bool = False
    override_level: Optional[str] = None

    @validator('end_date')
    def validate_end_after_start(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class RoomBlockCreate(RoomBlockBase):
    created_by: Optional[UUID] = None


class RoomBlockUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    block_reason: Optional[str] = None
    can_override: Optional[bool] = None
    override_level: Optional[str] = None


class RoomBlockResponse(RoomBlockBase):
    id: UUID
    is_active: bool
    created_by: Optional[UUID] = None
    created_at: datetime
    released_at: Optional[datetime] = None
    released_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class ReleaseBlockRequest(BaseModel):
    release_reason: str
    released_by: Optional[UUID] = None


# Allocation Alerts
class AllocationAlertBase(BaseModel):
    booking_id: UUID
    alert_type: AlertType
    alert_message: str
    severity: AlertSeverity
    alert_context: Optional[Dict[str, Any]] = {}


class AllocationAlertCreate(AllocationAlertBase):
    allocation_id: Optional[UUID] = None


class AllocationAlertUpdate(BaseModel):
    is_resolved: Optional[bool] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[UUID] = None


class AllocationAlertResponse(AllocationAlertBase):
    id: UUID
    allocation_id: Optional[UUID] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    resolution_notes: Optional[str] = None
    auto_resolved: bool
    notified_users: List[UUID]
    notification_channels: List[str]
    notification_sent_at: Optional[datetime] = None
    escalation_level: int
    escalated_at: Optional[datetime] = None
    escalated_to: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Monthly Grid Data
class RoomDailyStatus(BaseModel):
    date: date
    status: RoomStatus
    booking_id: Optional[UUID] = None
    guest_name: Optional[str] = None
    is_arrival: bool = False
    is_departure: bool = False
    is_vip: bool = False
    special_notes: Optional[str] = None
    rate: Optional[Decimal] = None
    block_reason: Optional[str] = None
    # Shift-based booking fields
    shift_type: Optional[str] = None  # 'day_shift', 'night_shift', 'full_day', 'traditional'
    day_shift_booking: Optional[Dict[str, Any]] = None  # {'booking_id', 'guest_name', 'status'}
    night_shift_booking: Optional[Dict[str, Any]] = None  # {'booking_id', 'guest_name', 'status'}


class RoomGridData(BaseModel):
    room_id: UUID
    room_number: str
    room_type: str
    floor: int
    features: List[str] = []
    daily_status: List[RoomDailyStatus]


class MonthlyGridRequest(BaseModel):
    month: str = Field(..., pattern=r'^\d{4}-\d{2}$', description="Format: YYYY-MM")
    room_type_ids: Optional[List[UUID]] = None
    floors: Optional[List[int]] = None
    include_blocked: bool = True
    include_maintenance: bool = True


class MonthlyGridResponse(BaseModel):
    month: str
    days_in_month: int
    rooms: List[RoomGridData]
    summary: Dict[str, Any]
    occupancy_stats: List[Dict[str, Any]]


# Unassigned Bookings
class UnassignedBooking(BaseModel):
    booking_id: UUID
    booking_code: str
    guest_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    check_in_date: date
    check_out_date: date
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    room_type: str
    room_type_id: Optional[UUID] = None
    adults: int = 1
    children: int = 0
    infants: int = 0
    total_guests: int = 1
    extra_persons: int = 0
    extra_person_charge: float = 0
    extra_bed: bool = False
    extra_bed_charge: float = 0
    special_requests: Optional[str] = None
    internal_notes: Optional[Dict[str, Any]] = None
    is_vip: bool = False
    hours_until_checkin: Optional[float] = None
    alert_level: AlertSeverity
    total_amount: Decimal
    paid_amount: Decimal
    booking_status: str = 'confirmed'


class UnassignedBookingsResponse(BaseModel):
    alerts: List[UnassignedBooking]
    summary: Dict[str, int]
    recommendations: List[str] = []


# Bulk Operations
class BulkResolveAlertsRequest(BaseModel):
    alert_ids: List[UUID]
    action: str = Field(..., description="auto_assign, manual_assign, dismiss")
    notes: Optional[str] = None
    assignment_strategy: Optional[AssignmentStrategy] = None


class BulkResolveAlertsResponse(BaseModel):
    resolved_count: int
    failed_count: int
    results: List[Dict[str, Any]]
    errors: List[str] = []


# Allocation Rules
class AllocationRuleBase(BaseModel):
    rule_name: str
    rule_type: str
    conditions: Dict[str, Any]
    actions: Dict[str, Any]
    priority: int = 0
    is_active: bool = True


class AllocationRuleCreate(AllocationRuleBase):
    created_by: Optional[UUID] = None


class AllocationRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    actions: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class AllocationRuleResponse(AllocationRuleBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Guest Preferences
class GuestRoomPreferencesBase(BaseModel):
    customer_id: UUID
    preferred_room_types: List[UUID] = []
    preferred_floors: List[int] = []
    preferred_features: List[str] = []
    avoid_floors: List[int] = []
    avoid_features: List[str] = []
    avoid_rooms: List[str] = []
    accessibility_needs: Dict[str, Any] = {}
    special_requests: Optional[str] = None
    priority_level: int = Field(5, ge=1, le=10)


class GuestRoomPreferencesCreate(GuestRoomPreferencesBase):
    pass


class GuestRoomPreferencesUpdate(BaseModel):
    preferred_room_types: Optional[List[UUID]] = None
    preferred_floors: Optional[List[int]] = None
    preferred_features: Optional[List[str]] = None
    avoid_floors: Optional[List[int]] = None
    avoid_features: Optional[List[str]] = None
    avoid_rooms: Optional[List[str]] = None
    accessibility_needs: Optional[Dict[str, Any]] = None
    special_requests: Optional[str] = None
    priority_level: Optional[int] = Field(None, ge=1, le=10)


class GuestRoomPreferencesResponse(GuestRoomPreferencesBase):
    id: UUID
    last_stayed_room: Optional[str] = None
    total_stays: int
    satisfaction_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Optimization Reports
class OptimizationMetrics(BaseModel):
    average_assignment_time: str
    auto_assignment_rate: float
    manual_assignment_rate: float
    room_change_rate: float
    unassigned_alerts: int
    late_assignments: int


class RoomUtilization(BaseModel):
    room: str
    nights: int
    utilization: float
    revenue: Decimal
    avg_rate: Decimal


class OptimizationRecommendation(BaseModel):
    type: str
    message: str
    priority: str
    action_required: bool = False


class OptimizationReportResponse(BaseModel):
    period: Dict[str, date]
    metrics: OptimizationMetrics
    room_utilization: Dict[str, List[RoomUtilization]]
    recommendations: List[OptimizationRecommendation]
    trends: Dict[str, Any] = {}


# Available Rooms
class AvailableRoomInfo(BaseModel):
    room_id: UUID
    room_number: str
    room_type_id: UUID
    room_type: str
    floor: int
    features: List[str] = []
    base_rate: Decimal
    current_status: str
    availability_score: Optional[float] = None
    is_accessible: bool = False
    last_cleaned: Optional[datetime] = None
    maintenance_notes: Optional[str] = None


class AvailableRoomsRequest(BaseModel):
    check_in_date: date
    check_out_date: date
    room_type_id: Optional[UUID] = None
    guest_count: Optional[int] = None
    accessibility_required: bool = False
    features_required: List[str] = []
    exclude_rooms: List[UUID] = []
    booking_id: Optional[UUID] = None  # Include room assigned to this booking


class AvailableRoomsResponse(BaseModel):
    available_rooms: List[AvailableRoomInfo]
    total_available: int
    filters_applied: Dict[str, Any]
    suggestions: List[str] = []


# Room Assignment History
class AllocationHistoryResponse(BaseModel):
    id: UUID
    allocation_id: UUID
    booking_id: UUID
    action: str
    previous_room_id: Optional[UUID] = None
    new_room_id: Optional[UUID] = None
    previous_room_number: Optional[str] = None
    new_room_number: Optional[str] = None
    previous_dates: Optional[str] = None
    new_dates: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    price_adjustment: Optional[Decimal] = None
    changed_by: Optional[UUID] = None
    change_reason: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


# Statistics and Analytics
class AllocationStatistics(BaseModel):
    total_allocations: int
    by_status: Dict[AssignmentStatus, int]
    by_type: Dict[AssignmentType, int]
    average_lead_time_hours: float
    room_utilization_rate: float
    conflict_resolution_time: float
    guest_satisfaction_impact: Optional[float] = None


class DailyAllocationSummary(BaseModel):
    date: date
    total_arrivals: int
    total_departures: int
    rooms_assigned: int
    rooms_available: int
    occupancy_rate: float
    unassigned_critical: int
    unassigned_warning: int
    conflicts_resolved: int