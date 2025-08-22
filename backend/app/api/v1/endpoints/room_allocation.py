from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse

from app.core.database import get_supabase_service
from app.api.deps import require_permission, get_current_user
from app.services.room_allocation_service import RoomAllocationService
from app.schemas.room_allocation import (
    # Core schemas
    RoomAllocationCreate, RoomAllocationUpdate, RoomAllocationResponse,
    AssignRoomRequest, AssignRoomResponse, AutoAssignRequest, AutoAssignResponse,
    ChangeRoomRequest, ChangeRoomResponse,
    
    # Room blocks
    RoomBlockCreate, RoomBlockUpdate, RoomBlockResponse, ReleaseBlockRequest,
    
    # Alerts and notifications
    AllocationAlertCreate, AllocationAlertUpdate, AllocationAlertResponse,
    UnassignedBookingsResponse, BulkResolveAlertsRequest, BulkResolveAlertsResponse,
    
    # Grid and calendar
    MonthlyGridRequest, MonthlyGridResponse, AvailableRoomsRequest, AvailableRoomsResponse,
    
    # Analytics and reports
    OptimizationReportResponse, AllocationStatistics, DailyAllocationSummary,
    
    # Guest preferences
    GuestRoomPreferencesCreate, GuestRoomPreferencesUpdate, GuestRoomPreferencesResponse,
    
    # History and rules
    AllocationHistoryResponse, AllocationRuleCreate, AllocationRuleUpdate, AllocationRuleResponse,
    
    # Enums
    AssignmentStatus, AlertSeverity, AssignmentStrategy
)

router = APIRouter()


# ================================
# CORE ROOM ASSIGNMENT OPERATIONS
# ================================

@router.post("/assign-room", response_model=AssignRoomResponse)
async def assign_room(
    request: AssignRoomRequest,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "create"))
):
    """
    Assign a specific room to a booking
    
    Business Logic:
    1. Verify booking is confirmed (has deposit or approved)
    2. Check room availability for entire stay period
    3. Calculate any rate differences if room type changed
    4. Create allocation record
    5. Update booking with room details
    6. Clear any unassigned alerts
    7. Log assignment history
    """
    service = RoomAllocationService(db)
    return await service.assign_room(request)


@router.post("/auto-assign", response_model=AutoAssignResponse)
async def auto_assign_rooms(
    request: AutoAssignRequest,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "create"))
):
    """
    Automatically assign rooms to unassigned bookings
    
    Supports multiple assignment strategies:
    - optimize_occupancy: Maximize room utilization
    - group_by_type: Keep similar bookings together
    - vip_first: Prioritize VIP guests
    - distribute_wear: Distribute usage across rooms
    """
    service = RoomAllocationService(db)
    return await service.auto_assign_rooms(request)


@router.put("/{allocation_id}/change-room", response_model=ChangeRoomResponse)
async def change_room(
    allocation_id: UUID = Path(..., description="Allocation ID"),
    request: ChangeRoomRequest = ...,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "update"))
):
    """
    Change room assignment for an existing allocation
    
    Business Logic:
    1. Verify booking not yet checked in (or get approval)
    2. Check new room availability
    3. Calculate price difference
    4. If apply_charges, create adjustment invoice
    5. Update allocation record
    6. Log change in history
    7. Notify relevant staff
    """
    service = RoomAllocationService(db)
    return await service.change_room(allocation_id, request)


@router.get("/allocations/{allocation_id}", response_model=RoomAllocationResponse)
async def get_allocation(
    allocation_id: UUID = Path(..., description="Allocation ID"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get allocation details by ID"""
    service = RoomAllocationService(db)
    
    result = db.table("room_allocations").select("""
        *, 
        rooms(room_number, floor, features),
        bookings(booking_code, check_in_date, check_out_date)
    """).eq("id", str(allocation_id)).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Allocation {allocation_id} not found"
        )
    
    return RoomAllocationResponse(**result.data[0])


@router.put("/allocations/{allocation_id}", response_model=RoomAllocationResponse)
async def update_allocation(
    allocation_id: UUID = Path(..., description="Allocation ID"),
    request: RoomAllocationUpdate = ...,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "update"))
):
    """Update allocation details"""
    update_data = request.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = db.table("room_allocations").update(update_data).eq(
        "id", str(allocation_id)
    ).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Allocation {allocation_id} not found"
        )
    
    return RoomAllocationResponse(**result.data[0])


@router.delete("/allocations/{allocation_id}")
async def cancel_allocation(
    allocation_id: UUID = Path(..., description="Allocation ID"),
    reason: str = Query(..., description="Cancellation reason"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "delete"))
):
    """Cancel a room allocation"""
    update_data = {
        "assignment_status": AssignmentStatus.CANCELLED,
        "change_reason": reason,
        "changed_by": current_user.get("id"),
        "changed_at": datetime.utcnow().isoformat()
    }
    
    result = db.table("room_allocations").update(update_data).eq(
        "id", str(allocation_id)
    ).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Allocation {allocation_id} not found"
        )
    
    return JSONResponse({"message": "Allocation cancelled successfully"})


# ================================
# GRID AND CALENDAR VIEWS
# ================================

@router.get("/monthly-grid", response_model=MonthlyGridResponse)
async def get_monthly_grid(
    month: str = Query(..., regex=r'^\d{4}-\d{2}$', description="Format: YYYY-MM"),
    room_type_ids: Optional[str] = Query(None, description="Comma-separated room type UUIDs"),
    floors: Optional[str] = Query(None, description="Comma-separated floor numbers"),
    include_blocked: bool = Query(True, description="Include blocked rooms"),
    include_maintenance: bool = Query(True, description="Include maintenance blocks"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """
    Get room allocation grid for a month
    
    Returns a comprehensive view of room occupancy with:
    - Daily status for each room
    - Occupancy statistics
    - Arrival/departure indicators
    - Block information
    """
    # Parse optional filters
    request = MonthlyGridRequest(
        month=month,
        room_type_ids=[UUID(rt) for rt in room_type_ids.split(",")] if room_type_ids else None,
        floors=[int(f) for f in floors.split(",")] if floors else None,
        include_blocked=include_blocked,
        include_maintenance=include_maintenance
    )
    
    service = RoomAllocationService(db)
    return await service.get_monthly_grid(request)


@router.get("/available-rooms", response_model=AvailableRoomsResponse)
async def get_available_rooms(
    check_in_date: date = Query(..., description="Check-in date"),
    check_out_date: date = Query(..., description="Check-out date"),
    room_type_id: Optional[UUID] = Query(None, description="Filter by room type"),
    guest_count: Optional[int] = Query(None, description="Number of guests"),
    accessibility_required: bool = Query(False, description="Accessibility requirements"),
    features_required: Optional[str] = Query(None, description="Comma-separated features"),
    exclude_rooms: Optional[str] = Query(None, description="Comma-separated room UUIDs to exclude"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get available rooms for specific dates and criteria"""
    request = AvailableRoomsRequest(
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        room_type_id=room_type_id,
        guest_count=guest_count,
        accessibility_required=accessibility_required,
        features_required=features_required.split(",") if features_required else [],
        exclude_rooms=[UUID(r) for r in exclude_rooms.split(",")] if exclude_rooms else []
    )
    
    service = RoomAllocationService(db)
    return await service.get_available_rooms(request)


# ================================
# ALERT MANAGEMENT
# ================================

@router.get("/alerts/unassigned", response_model=UnassignedBookingsResponse)
async def get_unassigned_bookings(
    severity: Optional[AlertSeverity] = Query(None, description="Filter by alert severity"),
    hours_ahead: Optional[int] = Query(48, description="Look ahead hours for check-ins"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all unassigned booking alerts
    
    Returns bookings that need room assignment with:
    - Alert severity based on time until check-in
    - Available room options
    - Guest preferences and special requirements
    """
    service = RoomAllocationService(db)
    return await service.get_unassigned_bookings()


@router.post("/alerts/bulk-resolve", response_model=BulkResolveAlertsResponse)
async def bulk_resolve_alerts(
    request: BulkResolveAlertsRequest,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "create"))
):
    """
    Bulk resolve alerts by auto-assigning rooms or marking as resolved
    
    Supports actions:
    - auto_assign: Automatically assign rooms using specified strategy
    - manual_assign: Mark for manual assignment
    - dismiss: Dismiss alerts (with reason)
    """
    service = RoomAllocationService(db)
    return await service.bulk_resolve_alerts(request)


@router.get("/alerts", response_model=List[AllocationAlertResponse])
async def get_allocation_alerts(
    is_resolved: Optional[bool] = Query(False, description="Filter by resolution status"),
    severity: Optional[AlertSeverity] = Query(None, description="Filter by severity"),
    limit: int = Query(50, description="Limit number of results"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get allocation alerts with filtering"""
    query = db.table("allocation_alerts").select("*").eq("is_resolved", is_resolved)
    
    if severity:
        query = query.eq("severity", severity)
    
    result = query.limit(limit).order("created_at", desc=True).execute()
    
    return [AllocationAlertResponse(**alert) for alert in result.data]


@router.put("/alerts/{alert_id}/resolve", response_model=AllocationAlertResponse)
async def resolve_alert(
    alert_id: UUID = Path(..., description="Alert ID"),
    request: AllocationAlertUpdate = ...,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "update"))
):
    """Resolve a specific alert"""
    update_data = request.dict(exclude_unset=True)
    update_data.update({
        "resolved_at": datetime.utcnow().isoformat(),
        "resolved_by": current_user.get("id")
    })
    
    result = db.table("allocation_alerts").update(update_data).eq(
        "id", str(alert_id)
    ).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )
    
    return AllocationAlertResponse(**result.data[0])


# ================================
# ROOM BLOCKING
# ================================

@router.post("/blocks", response_model=RoomBlockResponse)
async def create_room_block(
    request: RoomBlockCreate,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "create"))
):
    """
    Block room(s) for specific period
    
    Common block types:
    - maintenance: Regular maintenance work
    - renovation: Major renovation projects
    - vip_hold: Hold rooms for VIP guests
    - long_stay: Extended stay reservations
    - staff: Staff accommodation
    """
    request.created_by = UUID(current_user.get("id"))
    service = RoomAllocationService(db)
    return await service.create_room_block(request)


@router.get("/blocks", response_model=List[RoomBlockResponse])
async def get_room_blocks(
    room_id: Optional[UUID] = Query(None, description="Filter by room"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    block_type: Optional[str] = Query(None, description="Filter by block type"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get room blocks with filtering"""
    query = db.table("room_blocks").select("*")
    
    if room_id:
        query = query.eq("room_id", str(room_id))
    if is_active is not None:
        query = query.eq("is_active", is_active)
    if start_date:
        query = query.gte("start_date", start_date.isoformat())
    if end_date:
        query = query.lte("end_date", end_date.isoformat())
    if block_type:
        query = query.eq("block_type", block_type)
    
    result = query.order("start_date", desc=True).execute()
    
    return [RoomBlockResponse(**block) for block in result.data]


@router.delete("/blocks/{block_id}/release")
async def release_room_block(
    block_id: UUID = Path(..., description="Block ID"),
    request: ReleaseBlockRequest = ...,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "delete"))
):
    """Release a room block"""
    service = RoomAllocationService(db)
    success = await service.release_room_block(
        block_id, request.release_reason, UUID(current_user.get("id"))
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Block {block_id} not found"
        )
    
    return JSONResponse({"message": "Room block released successfully"})


# ================================
# ANALYTICS AND REPORTS
# ================================

@router.get("/reports/optimization", response_model=OptimizationReportResponse)
async def get_optimization_report(
    start_date: date = Query(..., description="Report start date"),
    end_date: date = Query(..., description="Report end date"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """
    Room allocation optimization report
    
    Includes:
    - Assignment time metrics
    - Room utilization analysis
    - Conflict resolution statistics
    - Optimization recommendations
    """
    service = RoomAllocationService(db)
    return await service.get_optimization_report(start_date, end_date)


@router.get("/statistics", response_model=AllocationStatistics)
async def get_allocation_statistics(
    period_days: int = Query(30, description="Analysis period in days"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get allocation statistics for specified period"""
    service = RoomAllocationService(db)
    return await service.get_allocation_statistics(period_days)


@router.get("/daily-summary", response_model=List[DailyAllocationSummary])
async def get_daily_summary(
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get daily allocation summary for date range"""
    service = RoomAllocationService(db)
    return await service.get_daily_summary(start_date, end_date)


# ================================
# GUEST PREFERENCES
# ================================

@router.post("/preferences", response_model=GuestRoomPreferencesResponse)
async def create_guest_preferences(
    request: GuestRoomPreferencesCreate,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "create"))
):
    """Create or update guest room preferences"""
    # Check if preferences already exist
    existing = db.table("guest_room_preferences").select("*").eq(
        "customer_id", str(request.customer_id)
    ).execute()
    
    if existing.data:
        # Update existing preferences
        update_data = request.dict()
        result = db.table("guest_room_preferences").update(update_data).eq(
            "customer_id", str(request.customer_id)
        ).execute()
    else:
        # Create new preferences
        result = db.table("guest_room_preferences").insert(request.dict()).execute()
    
    return GuestRoomPreferencesResponse(**result.data[0])


@router.get("/preferences/{customer_id}", response_model=GuestRoomPreferencesResponse)
async def get_guest_preferences(
    customer_id: UUID = Path(..., description="Customer ID"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get guest room preferences"""
    result = db.table("guest_room_preferences").select("*").eq(
        "customer_id", str(customer_id)
    ).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preferences for customer {customer_id} not found"
        )
    
    return GuestRoomPreferencesResponse(**result.data[0])


# ================================
# ALLOCATION RULES
# ================================

@router.post("/rules", response_model=AllocationRuleResponse)
async def create_allocation_rule(
    request: AllocationRuleCreate,
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "admin"))
):
    """Create new allocation rule"""
    request.created_by = UUID(current_user.get("id"))
    result = db.table("allocation_rules").insert(request.dict()).execute()
    return AllocationRuleResponse(**result.data[0])


@router.get("/rules", response_model=List[AllocationRuleResponse])
async def get_allocation_rules(
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    rule_type: Optional[str] = Query(None, description="Filter by rule type"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get allocation rules"""
    query = db.table("allocation_rules").select("*")
    
    if is_active is not None:
        query = query.eq("is_active", is_active)
    if rule_type:
        query = query.eq("rule_type", rule_type)
    
    result = query.order("priority", desc=True).execute()
    
    return [AllocationRuleResponse(**rule) for rule in result.data]


# ================================
# ALLOCATION HISTORY
# ================================

@router.get("/history/{allocation_id}", response_model=List[AllocationHistoryResponse])
async def get_allocation_history(
    allocation_id: UUID = Path(..., description="Allocation ID"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Get allocation change history"""
    result = db.table("room_allocation_history").select("""
        *, 
        previous_room:rooms!previous_room_id(room_number),
        new_room:rooms!new_room_id(room_number)
    """).eq("allocation_id", str(allocation_id)).order("changed_at", desc=True).execute()
    
    history = []
    for record in result.data:
        history_item = AllocationHistoryResponse(**record)
        if record.get('previous_room'):
            history_item.previous_room_number = record['previous_room']['room_number']
        if record.get('new_room'):
            history_item.new_room_number = record['new_room']['room_number']
        history.append(history_item)
    
    return history


# ================================
# UTILITY ENDPOINTS
# ================================

@router.post("/validate-assignment")
async def validate_assignment(
    booking_id: UUID = Query(..., description="Booking ID"),
    room_id: UUID = Query(..., description="Room ID"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
    """Validate if a room can be assigned to a booking without actually assigning it"""
    service = RoomAllocationService(db)
    
    # Get booking details
    booking = await service._get_booking(booking_id)
    
    # Check availability
    conflicts = await service._check_room_availability(
        room_id,
        datetime.fromisoformat(booking['check_in_date']).date(),
        datetime.fromisoformat(booking['check_out_date']).date()
    )
    
    # Get room details
    room = await service._get_room(room_id)
    
    # Calculate price adjustment
    price_adjustment = await service._calculate_price_adjustment(booking, room)
    
    return {
        "valid": len(conflicts) == 0,
        "conflicts": conflicts,
        "price_adjustment": price_adjustment,
        "room_details": {
            "room_number": room['room_number'],
            "room_type": room.get('room_types', {}).get('type_name', 'Unknown'),
            "floor": room.get('floor', 0)
        }
    }


@router.get("/dashboard")
async def get_allocation_dashboard(
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """Get allocation dashboard data"""
    service = RoomAllocationService(db)
    
    # Get today's key metrics
    today = date.today()
    
    # Unassigned bookings
    unassigned = await service.get_unassigned_bookings()
    
    # Today's arrivals/departures
    arrivals_result = db.table("room_allocations").select("""
        *, bookings(*, customers(full_name))
    """).eq("check_in_date", today.isoformat()).in_(
        "assignment_status", ["assigned", "locked"]
    ).execute()
    
    departures_result = db.table("room_allocations").select("""
        *, bookings(*, customers(full_name))
    """).eq("check_out_date", today.isoformat()).in_(
        "assignment_status", ["assigned", "locked"]
    ).execute()
    
    # Room utilization
    total_rooms_result = db.table("rooms").select("id").eq("status", "available").execute()
    occupied_rooms_result = db.table("room_allocations").select("room_id").eq(
        "check_in_date", today.isoformat()
    ).lte("check_out_date", today.isoformat()).in_(
        "assignment_status", ["assigned", "locked"]
    ).execute()
    
    total_rooms = len(total_rooms_result.data)
    occupied_rooms = len(occupied_rooms_result.data)
    occupancy_rate = (occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0
    
    return {
        "unassigned_summary": unassigned.summary,
        "today_arrivals": len(arrivals_result.data),
        "today_departures": len(departures_result.data),
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "available_rooms": total_rooms - occupied_rooms,
        "occupancy_rate": round(occupancy_rate, 1),
        "recent_arrivals": [
            {
                "guest_name": arrival['bookings']['customers']['full_name'],
                "room_number": "TBD",  # Would need room join
                "time": arrival['bookings'].get('check_in_time', '14:00')
            }
            for arrival in arrivals_result.data[:5]
        ],
        "upcoming_departures": [
            {
                "guest_name": departure['bookings']['customers']['full_name'],
                "room_number": "TBD",  # Would need room join
                "time": departure['bookings'].get('check_out_time', '12:00')
            }
            for departure in departures_result.data[:5]
        ]
    }