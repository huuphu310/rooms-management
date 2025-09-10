from datetime import date, datetime, timedelta
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse

from app.api.deps import (
    require_permission, get_current_user, get_current_user_optional,
    UserScopedDbDep,
    AuthenticatedDbDep
)
from app.services.room_allocation_service import RoomAllocationService
from app.services.room_allocation_service_optimized import OptimizedRoomAllocationService
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
    db: AuthenticatedDbDep,
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
    db: AuthenticatedDbDep,
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
    allocation_id: UUID,
    request: ChangeRoomRequest,
    db: AuthenticatedDbDep,
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
    allocation_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
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
    allocation_id: UUID,
    request: RoomAllocationUpdate,
    db: AuthenticatedDbDep,
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
    allocation_id: UUID,
    db: AuthenticatedDbDep,
    reason: str = Query(..., description="Cancellation reason"),
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
    db: AuthenticatedDbDep,
    month: str = Query(..., regex=r'^\d{4}-\d{2}$', description="Format: YYYY-MM"),
    room_type_ids: Optional[str] = Query(None, description="Comma-separated room type UUIDs"),
    floors: Optional[str] = Query(None, description="Comma-separated floor numbers"),
    include_blocked: bool = Query(True, description="Include blocked rooms"),
    include_maintenance: bool = Query(True, description="Include maintenance blocks"),
    current_user: dict = Depends(get_current_user)
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
    db: AuthenticatedDbDep,
    check_in_date: date = Query(..., description="Check-in date"),
    check_out_date: date = Query(..., description="Check-out date"),
    room_type_id: Optional[UUID] = Query(None, description="Filter by room type"),
    guest_count: Optional[int] = Query(None, description="Number of guests"),
    accessibility_required: bool = Query(False, description="Accessibility requirements"),
    features_required: Optional[str] = Query(None, description="Comma-separated features"),
    exclude_rooms: Optional[str] = Query(None, description="Comma-separated room UUIDs to exclude"),
    current_user: dict = Depends(get_current_user)
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
    db: AuthenticatedDbDep,
    severity: Optional[AlertSeverity] = Query(None, description="Filter by alert severity"),
    hours_ahead: Optional[int] = Query(48, description="Look ahead hours for check-ins"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all unassigned booking alerts - OPTIMIZED VERSION
    
    Returns bookings that need room assignment with:
    - Alert severity based on time until check-in
    - Available room options
    - Guest preferences and special requirements
    
    Performance optimizations:
    - Uses batch queries instead of N+1 queries
    - Single query for all unassigned bookings
    - Single query for room availability
    - In-memory date overlap calculations
    """
    # Use optimized service for better performance
    optimized_service = OptimizedRoomAllocationService(db)
    return await optimized_service.get_unassigned_bookings_fast()

@router.post("/alerts/bulk-resolve", response_model=BulkResolveAlertsResponse)
async def bulk_resolve_alerts(
    request: BulkResolveAlertsRequest,
    db: AuthenticatedDbDep,
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
    db: AuthenticatedDbDep,
    is_resolved: Optional[bool] = Query(False, description="Filter by resolution status"),
    severity: Optional[AlertSeverity] = Query(None, description="Filter by severity"),
    limit: int = Query(50, description="Limit number of results"),
    current_user: dict = Depends(get_current_user)
):
    """Get allocation alerts with filtering"""
    query = db.table("allocation_alerts").select("*").eq("is_resolved", is_resolved)
    
    if severity:
        query = query.eq("severity", severity)
    
    result = query.limit(limit).order("created_at", desc=True).execute()
    
    return [AllocationAlertResponse(**alert) for alert in result.data]

@router.put("/alerts/{alert_id}/resolve", response_model=AllocationAlertResponse)
async def resolve_alert(
    alert_id: UUID,
    request: AllocationAlertUpdate,
    db: AuthenticatedDbDep,
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
    db: AuthenticatedDbDep,
    current_user: Optional[dict] = Depends(get_current_user_optional)
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
    # Set created_by if current_user has an id
    if current_user and current_user.get("id"):
        request.created_by = UUID(current_user.get("id"))
    service = RoomAllocationService(db)
    return await service.create_room_block(request)

@router.get("/blocks", response_model=List[RoomBlockResponse])
async def get_room_blocks(
    db: AuthenticatedDbDep,
    room_id: Optional[UUID] = Query(None, description="Filter by room"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    block_type: Optional[str] = Query(None, description="Filter by block type"),
    current_user: dict = Depends(get_current_user)
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
    block_id: UUID,
    request: ReleaseBlockRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
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
    db: AuthenticatedDbDep,
    start_date: date = Query(..., description="Report start date"),
    end_date: date = Query(..., description="Report end date"),
    current_user: dict = Depends(get_current_user)
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
    db: AuthenticatedDbDep,
    period_days: int = Query(30, description="Analysis period in days"),
    current_user: dict = Depends(get_current_user)
):
    """Get allocation statistics for specified period"""
    service = RoomAllocationService(db)
    return await service.get_allocation_statistics(period_days)

@router.get("/daily-summary", response_model=List[DailyAllocationSummary])
async def get_daily_summary(
    db: AuthenticatedDbDep,
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    current_user: dict = Depends(get_current_user)
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
    db: AuthenticatedDbDep,
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
    customer_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
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
    db: AuthenticatedDbDep,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Create new allocation rule"""
    if current_user:
        request.created_by = UUID(current_user.get("id"))
    result = db.table("allocation_rules").insert(request.dict()).execute()
    return AllocationRuleResponse(**result.data[0])

@router.get("/rules", response_model=List[AllocationRuleResponse])
async def get_allocation_rules(
    db: AuthenticatedDbDep,
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    rule_type: Optional[str] = Query(None, description="Filter by rule type"),
    current_user: dict = Depends(get_current_user)
):
    """Get allocation rules"""
    query = db.table("allocation_rules").select("*")
    
    if is_active is not None:
        query = query.eq("is_active", is_active)
    if rule_type:
        query = query.eq("rule_type", rule_type)
    
    result = query.order("priority", desc=True).execute()
    
    return [AllocationRuleResponse(**rule) for rule in result.data]

@router.put("/rules/{rule_id}", response_model=AllocationRuleResponse)
async def update_allocation_rule(
    rule_id: UUID,
    request: AllocationRuleUpdate,
    db: AuthenticatedDbDep,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Update allocation rule"""
    updates = request.dict(exclude_unset=True)
    if updates:
        result = db.table("allocation_rules").update(updates).eq("id", str(rule_id)).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Rule not found")
        return AllocationRuleResponse(**result.data[0])
    else:
        # If no updates, just return the existing rule
        result = db.table("allocation_rules").select("*").eq("id", str(rule_id)).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Rule not found")
        return AllocationRuleResponse(**result.data)

@router.delete("/rules/{rule_id}")
async def delete_allocation_rule(
    rule_id: UUID,
    db: AuthenticatedDbDep,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Delete allocation rule"""
    result = db.table("allocation_rules").delete().eq("id", str(rule_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted successfully"}

# ================================
# ALLOCATION HISTORY
# ================================

@router.get("/history/{allocation_id}", response_model=List[AllocationHistoryResponse])
async def get_allocation_history(
    allocation_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
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
    db: AuthenticatedDbDep,
    booking_id: UUID = Query(..., description="Booking ID"),
    room_id: UUID = Query(..., description="Room ID"),
    current_user: dict = Depends(get_current_user)
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
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """Get allocation dashboard data - optimized version"""
    try:
        today = date.today()
        today_str = today.isoformat()
        
        # Parallel queries for better performance
        # 1. Get total rooms count
        total_rooms_result = db.table("rooms").select("id").execute()
        total_rooms = len(total_rooms_result.data) if total_rooms_result.data else 0
        
        # 2. Get today's check-ins (bookings, not allocations)
        arrivals_result = db.table("bookings").select("""
            id, booking_code, check_in_date, check_in_time, room_id,
            customers(full_name),
            rooms(room_number, room_types(name))
        """).eq("check_in_date", today_str).eq("status", "confirmed").limit(10).execute()
        
        # 3. Get today's check-outs
        departures_result = db.table("bookings").select("""
            id, booking_code, check_out_date, check_out_time, room_id,
            customers(full_name),
            rooms(room_number, room_types(name))
        """).eq("check_out_date", today_str).in_("status", ["confirmed", "checked_in"]).limit(10).execute()
        
        # 4. Get currently occupied rooms (checked-in bookings)
        occupied_result = db.table("bookings").select("id").eq("status", "checked_in").execute()
        occupied_rooms = len(occupied_result.data) if occupied_result.data else 0
        
        # 5. Get unassigned bookings count for today and tomorrow
        tomorrow = (today + timedelta(days=1)).isoformat()
        unassigned_result = db.table("bookings").select("id").in_(
            "check_in_date", [today_str, tomorrow]
        ).eq("status", "confirmed").is_("room_id", "null").execute()
        unassigned_count = len(unassigned_result.data) if unassigned_result.data else 0
        
        # Calculate occupancy rate
        available_rooms = total_rooms - occupied_rooms
        occupancy_rate = (occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0
        
        # Format response
        return {
            "summary": {
                "total_rooms": total_rooms,
                "occupied_rooms": occupied_rooms,
                "available_rooms": available_rooms,
                "occupancy_rate": round(occupancy_rate, 1),
                "unassigned_bookings": unassigned_count
            },
            "today_arrivals": {
                "count": len(arrivals_result.data) if arrivals_result.data else 0,
                "list": [
                    {
                        "booking_id": arrival['id'],
                        "booking_code": arrival['booking_code'],
                        "guest_name": arrival.get('customers', {}).get('full_name', 'Unknown'),
                        "room_number": arrival.get('rooms', {}).get('room_number', 'Unassigned'),
                        "room_type": arrival.get('rooms', {}).get('room_types', {}).get('name', 'Unknown'),
                        "check_in_time": arrival.get('check_in_time', '14:00')
                    }
                    for arrival in (arrivals_result.data or [])[:5]
                ]
            },
            "today_departures": {
                "count": len(departures_result.data) if departures_result.data else 0,
                "list": [
                    {
                        "booking_id": departure['id'],
                        "booking_code": departure['booking_code'],
                        "guest_name": departure.get('customers', {}).get('full_name', 'Unknown'),
                        "room_number": departure.get('rooms', {}).get('room_number', 'Unassigned'),
                        "room_type": departure.get('rooms', {}).get('room_types', {}).get('name', 'Unknown'),
                        "check_out_time": departure.get('check_out_time', '12:00')
                    }
                    for departure in (departures_result.data or [])[:5]
                ]
            },
            "alerts": {
                "unassigned_today": unassigned_count,
                "message": f"{unassigned_count} bookings need room assignment" if unassigned_count > 0 else "All bookings assigned"
            }
        }
    except Exception as e:
        # Return a safe fallback response on error
        return {
            "summary": {
                "total_rooms": 0,
                "occupied_rooms": 0,
                "available_rooms": 0,
                "occupancy_rate": 0,
                "unassigned_bookings": 0
            },
            "today_arrivals": {"count": 0, "list": []},
            "today_departures": {"count": 0, "list": []},
            "alerts": {"unassigned_today": 0, "message": f"Error loading dashboard: {str(e)}"}
        }