from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
import json
import asyncio
from sqlalchemy import and_, or_, not_, func, text, select
from supabase import Client

from app.schemas.room_allocation import (
    RoomAllocationCreate, RoomAllocationUpdate, RoomAllocationResponse,
    AssignRoomRequest, AssignRoomResponse, AutoAssignRequest, AutoAssignResponse,
    ChangeRoomRequest, ChangeRoomResponse, RoomBlockCreate, RoomBlockResponse,
    AllocationAlertCreate, AllocationAlertResponse, MonthlyGridRequest, MonthlyGridResponse,
    UnassignedBookingsResponse, BulkResolveAlertsRequest, BulkResolveAlertsResponse,
    OptimizationReportResponse, AvailableRoomsRequest, AvailableRoomsResponse,
    AssignmentType, AssignmentStatus, AlertType, AlertSeverity, AssignmentStrategy,
    RoomStatus, BlockType
)
from app.core.exceptions import (
    NotFoundException, ConflictException, BusinessRuleException,
    ValidationException, BadRequestException
)


class RoomAllocationService:
    def __init__(self, db: Client):
        self.db = db

    # Core Assignment Operations
    async def assign_room(self, request: AssignRoomRequest) -> AssignRoomResponse:
        """Assign a specific room to a booking"""
        try:
            # 1. Verify booking exists and is confirmed
            booking = await self._get_booking(request.booking_id)
            if booking['status'] not in ['confirmed', 'guaranteed']:
                raise BusinessRuleException("Booking must be confirmed before room assignment")

            # 2. Check if booking already has allocation
            existing = self.db.table("room_allocations").select("*").eq(
                "booking_id", str(request.booking_id)
            ).eq("assignment_status", "assigned").execute()
            
            if existing.data and not request.override_conflicts:
                raise ConflictException("Booking already has room assigned")

            # 3. Verify room exists and get details
            room = await self._get_room(request.room_id)
            
            # 4. Check room availability for the booking period
            conflicts = await self._check_room_availability(
                request.room_id,
                datetime.fromisoformat(booking['check_in_date']).date(),
                datetime.fromisoformat(booking['check_out_date']).date()
            )
            
            if conflicts and not request.override_conflicts:
                raise ConflictException(f"Room not available: {', '.join(conflicts)}")

            # 5. Calculate rate differences if room type changed
            price_adjustment = await self._calculate_price_adjustment(
                booking, room
            )

            # 6. Create allocation record
            # Get room type id safely (it might be None for old bookings)
            room_type_id = booking.get('room_type_id')
            if room_type_id:
                room_type_id = str(room_type_id)
            
            # Get room rate from room_types nested object
            room_base_rate = 0
            if room.get('room_types'):
                room_base_rate = room['room_types'].get('base_price', 0)
            
            allocation_data = {
                "booking_id": str(request.booking_id),
                "room_id": str(request.room_id),
                "assignment_type": request.assignment_type,
                "assignment_status": AssignmentStatus.ASSIGNED,
                "check_in_date": booking['check_in_date'],
                "check_out_date": booking['check_out_date'],
                "original_room_type_id": room_type_id,
                "original_rate": float(booking.get('room_rate', 0)),
                "allocated_rate": float(room_base_rate),
                "assigned_at": datetime.utcnow().isoformat(),
                "assignment_reason": request.assignment_reason
            }

            result = self.db.table("room_allocations").insert(allocation_data).execute()
            allocation = result.data[0]

            # 7. Update booking with room assignment
            await self._update_booking_room_assignment(request.booking_id, request.room_id)
            
            # 8. Set room status to "booked" (hold status) for confirmed bookings
            await self._set_room_hold_status(request.room_id, request.booking_id)

            # 8. Clear any unassigned alerts
            await self._resolve_unassigned_alerts(request.booking_id)

            # 9. Create billing adjustment if needed
            if price_adjustment and price_adjustment['total_difference'] != 0:
                await self._create_rate_adjustment_invoice(
                    request.booking_id, price_adjustment
                )

            # Get room type name from nested room_types object
            room_type_name = 'Unknown'
            if room.get('room_types'):
                room_type_name = room['room_types'].get('name', 'Unknown')
            
            return AssignRoomResponse(
                allocation_id=UUID(allocation['id']),
                room_assigned={
                    "room_number": room['room_number'],
                    "room_type": room_type_name,
                    "floor": room.get('floor', 0)
                },
                price_adjustment=price_adjustment,
                status=AssignmentStatus.ASSIGNED,
                conflicts=conflicts if request.override_conflicts else [],
                warnings=[]
            )

        except Exception as e:
            raise BadRequestException(f"Failed to assign room: {str(e)}")

    async def auto_assign_rooms(self, request: AutoAssignRequest) -> AutoAssignResponse:
        """Automatically assign rooms to unassigned bookings"""
        try:
            # 1. Get all unassigned bookings in date range
            unassigned_bookings = await self._get_unassigned_bookings(
                request.date_range['from'],
                request.date_range['to'],
                request.room_type_ids
            )

            # 2. Sort bookings by priority based on strategy
            sorted_bookings = self._sort_bookings_by_strategy(
                unassigned_bookings, request.assignment_strategy
            )

            assignments = []
            failed_bookings = []

            # 3. Process each booking
            for booking in sorted_bookings:
                try:
                    # Find best available room
                    best_room = await self._find_best_room(
                        booking, request.respect_preferences
                    )

                    if best_room:
                        # Create assignment request
                        assign_request = AssignRoomRequest(
                            booking_id=UUID(booking['id']),
                            room_id=UUID(best_room['id']),
                            assignment_type=AssignmentType.AUTO,
                            assignment_reason=f"Auto-assigned using {request.assignment_strategy} strategy"
                        )

                        # Assign the room
                        assignment_result = await self.assign_room(assign_request)
                        assignments.append(assignment_result)

                    else:
                        failed_bookings.append({
                            "booking_id": booking['id'],
                            "booking_code": booking.get('booking_code', ''),
                            "guest_name": booking.get('guest_name', ''),
                            "reason": "No suitable room available",
                            "suggestions": await self._get_alternative_suggestions(booking)
                        })

                except Exception as e:
                    failed_bookings.append({
                        "booking_id": booking['id'],
                        "booking_code": booking.get('booking_code', ''),
                        "guest_name": booking.get('guest_name', ''),
                        "reason": str(e),
                        "suggestions": []
                    })

            # 4. Generate summary
            summary = {
                "total_processed": len(sorted_bookings),
                "successful_assignments": len(assignments),
                "failed_assignments": len(failed_bookings),
                "strategy_used": request.assignment_strategy,
                "preferences_respected": request.respect_preferences
            }

            return AutoAssignResponse(
                assignments_created=len(assignments),
                assignments_failed=len(failed_bookings),
                assignments=assignments,
                failed_bookings=failed_bookings,
                summary=summary
            )

        except Exception as e:
            raise BadRequestException(f"Auto-assignment failed: {str(e)}")

    async def change_room(self, allocation_id: UUID, request: ChangeRoomRequest) -> ChangeRoomResponse:
        """Change room assignment for an existing allocation"""
        try:
            # 1. Get current allocation
            allocation = await self._get_allocation(allocation_id)
            
            # 2. Verify new room is different
            if str(allocation['room_id']) == str(request.new_room_id):
                raise BusinessRuleException("New room must be different from current room")

            # 3. Check if guest is already checked in
            booking = await self._get_booking(UUID(allocation['booking_id']))
            is_checked_in = booking.get('status') == 'checked_in'

            # 4. Get room details
            current_room = await self._get_room(UUID(allocation['room_id']))
            new_room = await self._get_room(request.new_room_id)

            # 5. Check new room availability
            conflicts = await self._check_room_availability(
                request.new_room_id,
                allocation['check_in_date'],
                allocation['check_out_date']
            )

            if conflicts and not request.override_conflicts:
                raise ConflictException(f"New room not available: {', '.join(conflicts)}")

            # 6. Calculate price difference
            price_adjustment = None
            if current_room.get('base_rate') != new_room.get('base_rate'):
                price_adjustment = await self._calculate_room_change_adjustment(
                    allocation, current_room, new_room
                )

            # 7. Update allocation
            update_data = {
                "previous_room_id": allocation['room_id'],
                "room_id": str(request.new_room_id),
                "changed_at": datetime.utcnow().isoformat(),
                "change_reason": request.change_reason,
                "allocated_rate": float(new_room.get('base_rate', 0))
            }

            self.db.table("room_allocations").update(update_data).eq(
                "id", str(allocation_id)
            ).execute()

            # 8. Create billing adjustment if needed
            charges_applied = False
            if request.apply_charges and price_adjustment and price_adjustment['total_difference'] != 0:
                await self._create_rate_adjustment_invoice(
                    UUID(allocation['booking_id']), price_adjustment
                )
                charges_applied = True

            # 9. Notify staff if guest is checked in
            if is_checked_in:
                await self._notify_room_change(allocation_id, current_room, new_room)

            return ChangeRoomResponse(
                allocation_id=allocation_id,
                previous_room={
                    "room_number": current_room['room_number'],
                    "room_type": current_room.get('room_type', 'Unknown'),
                    "floor": current_room.get('floor', 0)
                },
                new_room={
                    "room_number": new_room['room_number'],
                    "room_type": new_room.get('room_type', 'Unknown'),
                    "floor": new_room.get('floor', 0)
                },
                price_adjustment=price_adjustment,
                charges_applied=charges_applied,
                status="changed"
            )

        except Exception as e:
            raise BadRequestException(f"Failed to change room: {str(e)}")

    # Room Blocking Operations
    async def create_room_block(self, request: RoomBlockCreate) -> RoomBlockResponse:
        """Create a room block for maintenance, VIP hold, etc."""
        try:
            # 1. Verify room exists
            room = await self._get_room(request.room_id)

            # 2. Check for conflicts with existing allocations
            conflicts = await self._check_room_availability(
                request.room_id,
                request.start_date,
                request.end_date
            )

            if conflicts:
                raise ConflictException(f"Room has existing bookings: {', '.join(conflicts)}")

            # 3. Create block record
            block_data = {
                "room_id": str(request.room_id),
                "start_date": request.start_date.isoformat(),
                "end_date": request.end_date.isoformat(),
                "block_type": request.block_type,
                "block_reason": request.block_reason,
                "can_override": request.can_override,
                "override_level": request.override_level,
                "created_by": str(request.created_by) if request.created_by else None,
                "is_active": True
            }

            result = self.db.table("room_blocks").insert(block_data).execute()
            block = result.data[0]

            return RoomBlockResponse(**block)

        except Exception as e:
            raise BadRequestException(f"Failed to create room block: {str(e)}")

    async def release_room_block(self, block_id: UUID, release_reason: str, released_by: Optional[UUID] = None) -> bool:
        """Release a room block"""
        try:
            update_data = {
                "is_active": False,
                "released_at": datetime.utcnow().isoformat(),
                "released_by": str(released_by) if released_by else None
            }

            result = self.db.table("room_blocks").update(update_data).eq(
                "id", str(block_id)
            ).execute()

            return len(result.data) > 0

        except Exception as e:
            raise BadRequestException(f"Failed to release room block: {str(e)}")

    # Grid and Calendar Operations
    async def get_monthly_grid(self, request: MonthlyGridRequest) -> MonthlyGridResponse:
        """Get room allocation grid for a month"""
        try:
            # Parse month
            year, month = map(int, request.month.split('-'))
            start_date = date(year, month, 1)
            
            # Calculate end date (last day of month)
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)

            # Build query for rooms - include all active rooms regardless of status
            # Fetch room status along with room data to avoid per-room queries later
            rooms_query = self.db.table("rooms").select("""
                id, room_number, room_type_id, floor, status, status_reason,
                room_types(name)
            """).eq("is_active", True)

            # Apply filters
            if request.room_type_ids:
                rooms_query = rooms_query.in_("room_type_id", [str(rt) for rt in request.room_type_ids])
            
            if request.floors:
                rooms_query = rooms_query.in_("floor", request.floors)

            rooms_result = rooms_query.execute()
            rooms = rooms_result.data
            
            # Create room status cache to avoid per-room database queries
            room_status_cache = {room['id']: {'status': room.get('status'), 'status_reason': room.get('status_reason')} for room in rooms}

            # Get all allocations for the month
            # Use explicit relationship hint for bookings join
            allocations_result = self.db.table("room_allocations").select("""
                *, bookings!room_allocations_booking_id_fkey(booking_code, customers(full_name))
            """).gte("check_in_date", start_date.isoformat()).lte(
                "check_out_date", end_date.isoformat()
            ).in_("assignment_status", ["assigned", "locked"]).execute()

            allocations = allocations_result.data

            # Get room blocks for the month
            blocks_result = self.db.table("room_blocks").select("*").eq(
                "is_active", True
            ).gte("start_date", start_date.isoformat()).lte(
                "end_date", end_date.isoformat()
            ).execute()

            blocks = blocks_result.data

            # Get assigned bookings for the month (bookings with room_id assigned)
            # Include shift_type and shift_date for shift-based bookings
            assigned_bookings_result = self.db.table("bookings").select("""
                id, room_id, check_in_date, check_out_date, status, booking_code,
                shift_type, shift_date,
                customers(full_name)
            """).not_.is_("room_id", "null").gte(
                "check_in_date", start_date.isoformat()
            ).lte(
                "check_out_date", end_date.isoformat()
            ).in_("status", ["confirmed", "checked_in"]).execute()

            assigned_bookings = assigned_bookings_result.data

            # Build grid data
            room_grid_data = []
            occupancy_stats = []

            for current_date in self._date_range(start_date, end_date):
                daily_occupancy = {
                    "date": current_date.isoformat(),
                    "occupied": 0,
                    "available": 0,
                    "blocked": 0,
                    "arriving": 0,
                    "departing": 0,
                    "pre_assigned": 0,
                    "occupancy_rate": 0
                }

                for room in rooms:
                    if not any(rg['room_id'] == room['id'] for rg in room_grid_data):
                        room_grid_data.append({
                            "room_id": room['id'],
                            "room_number": room['room_number'],
                            "room_type": room['room_types']['name'] if room['room_types'] else 'Unknown',
                            "floor": room['floor'],
                            "daily_status": []
                        })

                    # Find room in grid data
                    room_data = next(rg for rg in room_grid_data if rg['room_id'] == room['id'])

                    # Check status for this date - use shift-aware method
                    # First check for shift-based bookings
                    shift_status = self._get_room_status_for_date_with_shifts(
                        room['id'], current_date, assigned_bookings
                    )
                    
                    # If no bookings found, check the traditional way for blocks and allocations
                    if shift_status['status'] == RoomStatus.AVAILABLE:
                        status = self._get_room_status_for_date_optimized(
                            room['id'], current_date, allocations, blocks, assigned_bookings, room_status_cache
                        )
                        # Merge shift information if any
                        if shift_status.get('day_shift_booking') or shift_status.get('night_shift_booking'):
                            status['day_shift_booking'] = shift_status.get('day_shift_booking')
                            status['night_shift_booking'] = shift_status.get('night_shift_booking')
                            status['shift_type'] = shift_status.get('shift_type')
                    else:
                        status = shift_status

                    room_data['daily_status'].append(status)

                    # Update occupancy stats
                    if status['status'] == RoomStatus.OCCUPIED:
                        daily_occupancy['occupied'] += 1
                    elif status['status'] == RoomStatus.BLOCKED:
                        daily_occupancy['blocked'] += 1
                    elif status['status'] == RoomStatus.ARRIVING:
                        daily_occupancy['arriving'] += 1
                    elif status['status'] == RoomStatus.DEPARTING:
                        daily_occupancy['departing'] += 1
                    elif status['status'] == RoomStatus.PRE_ASSIGNED:
                        daily_occupancy['pre_assigned'] += 1
                    elif status['status'] == RoomStatus.CLEANING:
                        # Track cleaning rooms separately
                        if 'cleaning' not in daily_occupancy:
                            daily_occupancy['cleaning'] = 0
                        daily_occupancy['cleaning'] += 1
                    else:
                        daily_occupancy['available'] += 1

                # Calculate occupancy rate
                total_rooms = len(rooms)
                if total_rooms > 0:
                    daily_occupancy['occupancy_rate'] = round(
                        (daily_occupancy['occupied'] / total_rooms) * 100, 1
                    )

                occupancy_stats.append(daily_occupancy)

            # Calculate summary
            total_rooms = len(rooms)
            avg_occupancy = sum(day['occupancy_rate'] for day in occupancy_stats) / len(occupancy_stats) if occupancy_stats else 0

            summary = {
                "total_rooms": total_rooms,
                "days_in_month": len(occupancy_stats),
                "average_occupancy_rate": round(avg_occupancy, 1),
                "peak_occupancy": max(day['occupancy_rate'] for day in occupancy_stats) if occupancy_stats else 0,
                "total_bookings": len(allocations),
                "active_blocks": len(blocks)
            }

            return MonthlyGridResponse(
                month=request.month,
                days_in_month=len(occupancy_stats),
                rooms=room_grid_data,
                summary=summary,
                occupancy_stats=occupancy_stats
            )

        except Exception as e:
            raise BadRequestException(f"Failed to get monthly grid: {str(e)}")

    # Alert Management
    async def get_unassigned_bookings(self) -> UnassignedBookingsResponse:
        """Get all unassigned booking alerts"""
        try:
            # Get unassigned bookings with additional details
            from datetime import datetime as dt
            today = dt.now().date()
            
            # Get bookings without room assignments
            result = self.db.table("bookings").select("""
                id,
                booking_code,
                customer_id,
                room_type_id,
                check_in_date,
                check_out_date,
                check_in_time,
                check_out_time,
                adults,
                children,
                extra_charges,
                special_requests,
                internal_notes,
                total_amount,
                deposit_amount,
                paid_amount,
                status,
                customers(full_name, phone, email)
            """).is_("room_id", None).eq("status", "confirmed").gte("check_in_date", str(today)).execute()
            
            bookings = result.data if result.data else []
            
            # Debug: Log raw booking data
            logger.info(f"Found {len(bookings)} unassigned bookings")
            for idx, b in enumerate(bookings):
                if b.get('id') == '5079fa3c-13aa-4f75-8d21-8a71a8fcdf11':
                    logger.info(f"Target booking found at index {idx}")
                    logger.info(f"Raw booking data: {b}")
                    logger.info(f"Adults value: {b.get('adults')} (type: {type(b.get('adults')).__name__})")
                    logger.info(f"Children value: {b.get('children')} (type: {type(b.get('children')).__name__})")
                    logger.info(f"Room type ID: {b.get('room_type_id')}")
                    break

            alerts = []
            summary = {"total_unassigned": 0, "critical": 0, "warning": 0, "info": 0}

            for booking in bookings:
                # Calculate hours until check-in
                check_in_time = booking.get('check_in_time') or '14:00:00'
                check_in_datetime = dt.strptime(f"{booking['check_in_date']} {check_in_time}", "%Y-%m-%d %H:%M:%S")
                hours_until_checkin = (check_in_datetime - dt.now()).total_seconds() / 3600
                
                # Determine alert level based on hours until check-in
                if hours_until_checkin <= 2:
                    alert_level = 'critical'
                elif hours_until_checkin <= 12:
                    alert_level = 'warning'
                else:
                    alert_level = 'info'
                
                # Get guest info from internal_notes if needed
                internal_notes = booking.get('internal_notes', {})
                
                # Get customer info - check both customers table and internal_notes
                customer = booking.get('customers') or {}
                guest_name = (customer.get('full_name') if customer else None) or \
                             (internal_notes.get('guest_name') if internal_notes else None) or \
                             'Unknown'
                phone = (customer.get('phone') if customer else None) or \
                        (internal_notes.get('guest_phone') if internal_notes else None)
                email = (customer.get('email') if customer else None) or \
                        (internal_notes.get('guest_email') if internal_notes else None)
                is_vip = False  # Default since customers table doesn't have is_vip column
                # Get room_type_id directly from database column (now available)
                room_type_id = booking.get('room_type_id')
                
                # Get room type name if we have the ID
                room_type_name = 'Standard'  # Default
                if room_type_id:
                    try:
                        rt_result = self.db.table("room_types").select("name").eq("id", room_type_id).execute()
                        if rt_result.data and len(rt_result.data) > 0:
                            room_type_name = rt_result.data[0].get('name', 'Standard')
                    except:
                        pass
                
                # Calculate total guests and extra persons
                adults = booking.get('adults', 1)
                children = booking.get('children', 0)
                infants = 0  # Bookings table doesn't have infants column
                total_guests = adults + children
                
                # Debug log for specific booking
                if booking['id'] == '5079fa3c-13aa-4f75-8d21-8a71a8fcdf11':
                    print(f"DEBUG: Processing booking {booking['id']}")
                    print(f"  Raw adults from DB: {booking.get('adults')}")
                    print(f"  Raw children from DB: {booking.get('children')}")
                    print(f"  Raw room_type_id from DB: {booking.get('room_type_id')}")
                    print(f"  Processed adults: {adults}")
                    print(f"  Processed children: {children}")
                    print(f"  Processed room_type_id: {room_type_id}")
                
                # Calculate extra persons (if guests exceed standard occupancy of 2)
                extra_persons = max(0, adults - 2) + children
                
                # Get extra charges info from internal_notes or use default
                extra_charges = float(booking.get('extra_charges', 0) or 0)
                extra_person_charge = internal_notes.get('extra_person_charge', 0) if internal_notes else 0
                extra_bed_charge = internal_notes.get('extra_bed_charge', 0) if internal_notes else 0
                has_extra_bed = extra_bed_charge > 0
                
                # Debug specific booking
                if booking['id'] == '5079fa3c-13aa-4f75-8d21-8a71a8fcdf11':
                    logger.info(f"Creating alert for booking {booking['id']}: adults={adults}, children={children}, room_type_id={room_type_id}")
                
                alert = {
                    "booking_id": booking['id'],
                    "booking_code": booking['booking_code'],
                    "guest_name": guest_name,
                    "phone": phone,
                    "email": email,
                    "check_in_date": booking['check_in_date'],
                    "check_out_date": booking['check_out_date'],
                    "check_in_time": booking.get('check_in_time'),  # Don't provide default
                    "check_out_time": booking.get('check_out_time'),  # Don't provide default
                    "room_type": room_type_name,
                    "room_type_id": room_type_id,
                    "adults": adults,
                    "children": children,
                    "infants": infants,
                    "total_guests": total_guests,
                    "extra_persons": extra_persons,
                    "extra_person_charge": float(extra_person_charge),
                    "extra_bed": has_extra_bed,
                    "extra_bed_charge": float(extra_bed_charge),
                    "special_requests": booking.get('special_requests'),
                    "internal_notes": booking.get('internal_notes'),
                    "is_vip": is_vip,
                    "hours_until_checkin": hours_until_checkin,
                    "alert_level": alert_level,
                    "total_amount": float(booking.get('total_amount', 0) or 0),
                    "paid_amount": float(booking.get('paid_amount', 0) or 0),
                    "booking_status": booking.get('status', 'confirmed')
                }

                alerts.append(alert)
                summary["total_unassigned"] += 1
                summary[alert_level] += 1

            return UnassignedBookingsResponse(
                alerts=alerts,
                summary=summary,
                recommendations=self._generate_assignment_recommendations(alerts)
            )

        except Exception as e:
            raise BadRequestException(f"Failed to get unassigned bookings: {str(e)}")

    # Helper Methods
    async def _get_booking(self, booking_id: UUID):
        """Get booking by ID"""
        result = self.db.table("bookings").select("*").eq("id", str(booking_id)).execute()
        if not result.data:
            raise NotFoundException(f"Booking {booking_id} not found")
        return result.data[0]

    async def _get_room(self, room_id: UUID):
        """Get room by ID with type information"""
        result = self.db.table("rooms").select("""
            *, room_types(name, base_price)
        """).eq("id", str(room_id)).execute()
        if not result.data:
            raise NotFoundException(f"Room {room_id} not found")
        return result.data[0]

    async def _get_allocation(self, allocation_id: UUID):
        """Get allocation by ID"""
        result = self.db.table("room_allocations").select("*").eq("id", str(allocation_id)).execute()
        if not result.data:
            raise NotFoundException(f"Allocation {allocation_id} not found")
        return result.data[0]

    async def _check_room_availability(self, room_id: UUID, check_in: date, check_out: date) -> List[str]:
        """Check room availability and return conflicts"""
        conflicts = []

        # Check existing allocations
        allocations = self.db.table("room_allocations").select("*").eq(
            "room_id", str(room_id)
        ).in_("assignment_status", ["assigned", "locked"]).execute()

        for allocation in allocations.data:
            alloc_checkin = datetime.fromisoformat(allocation['check_in_date']).date()
            alloc_checkout = datetime.fromisoformat(allocation['check_out_date']).date()
            
            if not (check_out <= alloc_checkin or check_in >= alloc_checkout):
                conflicts.append(f"Existing booking {allocation['booking_id']}")

        # Check room blocks
        blocks = self.db.table("room_blocks").select("*").eq(
            "room_id", str(room_id)
        ).eq("is_active", True).execute()

        for block in blocks.data:
            block_start = datetime.fromisoformat(block['start_date']).date()
            block_end = datetime.fromisoformat(block['end_date']).date()
            
            if not (check_out <= block_start or check_in >= block_end):
                conflicts.append(f"Room blocked for {block['block_type']}")

        return conflicts

    async def _calculate_price_adjustment(self, booking: Dict, room: Dict) -> Optional[Dict]:
        """Calculate price adjustment when room type changes"""
        original_rate = booking.get('room_rate', 0)
        new_rate = room.get('room_types', {}).get('base_rate', 0)
        
        if original_rate != new_rate:
            nights = (datetime.fromisoformat(booking['check_out_date']).date() - 
                     datetime.fromisoformat(booking['check_in_date']).date()).days
            
            return {
                "original_rate": float(original_rate),
                "new_rate": float(new_rate),
                "difference": float(new_rate - original_rate),
                "total_difference": float((new_rate - original_rate) * nights),
                "nights": nights
            }
        
        return None

    def _date_range(self, start_date: date, end_date: date):
        """Generate date range"""
        current = start_date
        while current <= end_date:
            yield current
            current += timedelta(days=1)

    def _get_room_status_for_date_with_shifts(self, room_id: str, check_date: date, assigned_bookings: List = None) -> Dict:
        """Get room status for a specific date with shift-based bookings support"""
        day_shift_booking = None
        night_shift_booking = None
        traditional_booking = None
        
        if assigned_bookings:
            for booking in assigned_bookings:
                if str(room_id) == str(booking['room_id']):
                    # Check if it's a shift-based booking
                    if booking.get('shift_type') and booking['shift_type'] != 'traditional':
                        # For shift bookings, check if the shift_date matches
                        if booking.get('shift_date'):
                            shift_date = datetime.fromisoformat(booking['shift_date']).date()
                            if shift_date == check_date:
                                guest_name = None
                                if booking.get('customers'):
                                    guest_name = booking['customers']['full_name']
                                
                                booking_info = {
                                    'booking_id': str(booking['id']),
                                    'guest_name': guest_name,
                                    'status': booking['status']
                                }
                                
                                if booking['shift_type'] == 'day_shift':
                                    day_shift_booking = booking_info
                                elif booking['shift_type'] == 'night_shift':
                                    night_shift_booking = booking_info
                                elif booking['shift_type'] == 'full_day':
                                    # Full day means both shifts
                                    day_shift_booking = booking_info
                                    night_shift_booking = booking_info
                    else:
                        # Traditional booking - check date range
                        checkin_date = datetime.fromisoformat(booking['check_in_date']).date()
                        checkout_date = datetime.fromisoformat(booking['check_out_date']).date()
                        
                        if checkin_date <= check_date < checkout_date:
                            guest_name = None
                            if booking.get('customers'):
                                guest_name = booking['customers']['full_name']
                            
                            traditional_booking = {
                                'booking_id': str(booking['id']),
                                'guest_name': guest_name,
                                'status': booking['status'],
                                'is_arrival': check_date == checkin_date,
                                'is_departure': check_date == checkout_date
                            }
        
        # Build the status response
        status_dict = {
            "date": check_date.isoformat(),
            "status": RoomStatus.AVAILABLE
        }
        
        # If there's a traditional booking, it takes precedence for overall status
        if traditional_booking:
            if traditional_booking['status'] == 'checked_in':
                status_dict['status'] = RoomStatus.OCCUPIED
            elif traditional_booking['status'] == 'confirmed':
                if traditional_booking.get('is_arrival'):
                    status_dict['status'] = RoomStatus.ARRIVING
                else:
                    status_dict['status'] = RoomStatus.PRE_ASSIGNED
            
            status_dict['booking_id'] = traditional_booking['booking_id']
            status_dict['guest_name'] = traditional_booking['guest_name']
            status_dict['shift_type'] = 'traditional'
        
        # Add shift booking information
        if day_shift_booking or night_shift_booking:
            if day_shift_booking and night_shift_booking:
                # Both shifts booked
                status_dict['shift_type'] = 'full_day'
                status_dict['status'] = RoomStatus.OCCUPIED
            elif day_shift_booking:
                status_dict['shift_type'] = 'day_shift'
                if not traditional_booking:
                    status_dict['status'] = RoomStatus.OCCUPIED
            elif night_shift_booking:
                status_dict['shift_type'] = 'night_shift'
                if not traditional_booking:
                    status_dict['status'] = RoomStatus.OCCUPIED
            
            status_dict['day_shift_booking'] = day_shift_booking
            status_dict['night_shift_booking'] = night_shift_booking
        
        return status_dict

    def _get_room_status_for_date_optimized(self, room_id: str, check_date: date, allocations: List, blocks: List, assigned_bookings: List = None, room_status_cache: Dict = None) -> Dict:
        """Get room status for a specific date using cached room status"""
        from datetime import timedelta
        
        # Use cached room status instead of database query
        if room_status_cache and room_id in room_status_cache:
            room_status = room_status_cache[room_id]
            if room_status.get('status') == 'cleaning':
                # Room is being cleaned
                return {
                    "date": check_date.isoformat(),
                    "status": RoomStatus.CLEANING,
                    "status_reason": room_status.get('status_reason', 'Room is being cleaned')
                }
        
        # Check blocks first
        for block in blocks:
            if (room_id == block['room_id'] and
                datetime.fromisoformat(block['start_date']).date() <= check_date <= 
                datetime.fromisoformat(block['end_date']).date()):
                return {
                    "date": check_date.isoformat(),
                    "status": RoomStatus.BLOCKED,
                    "block_reason": block.get('block_reason', 'Blocked')
                }

        # Check assigned bookings (rooms assigned through booking system)
        if assigned_bookings:
            for booking in assigned_bookings:
                if str(room_id) == str(booking['room_id']):
                    checkin_date = datetime.fromisoformat(booking['check_in_date']).date()
                    checkout_date = datetime.fromisoformat(booking['check_out_date']).date()
                    
                    # Check if this booking has been checked out and room should be cleaning
                    if booking['status'] == 'checked_out' and check_date >= checkout_date:
                        # After checkout, room should be in cleaning status
                        # Check if room is still in cleaning period using cached status
                        if room_status_cache and room_id in room_status_cache:
                            room_status = room_status_cache[room_id]
                            if room_status.get('status') == 'cleaning':
                                return {
                                    "date": check_date.isoformat(),
                                    "status": RoomStatus.CLEANING,
                                    "status_reason": room_status.get('status_reason', 'Room is being cleaned after checkout')
                                }
                        # If not in cache or not cleaning, room is available
                        return {
                            "date": check_date.isoformat(),
                            "status": RoomStatus.AVAILABLE
                        }
                    
                    if checkin_date <= check_date < checkout_date:
                        guest_name = None
                        if booking.get('customers'):
                            guest_name = booking['customers']['full_name']
                        
                        # Determine status based on booking status and date
                        if booking['status'] == 'checked_out':
                            # If checked out but still within booking dates, show as cleaning
                            # This handles early checkouts
                            if room_status_cache and room_id in room_status_cache:
                                room_status = room_status_cache[room_id]
                                if room_status.get('status') == 'cleaning':
                                    return {
                                        "date": check_date.isoformat(),
                                        "status": RoomStatus.CLEANING,
                                        "status_reason": room_status.get('status_reason', 'Room is being cleaned after early checkout')
                                    }
                            # Otherwise show as available
                            return {
                                "date": check_date.isoformat(),
                                "status": RoomStatus.AVAILABLE
                            }
                        elif booking['status'] == 'checked_in':
                            status = RoomStatus.OCCUPIED
                        elif booking['status'] == 'confirmed':
                            if check_date == checkin_date:
                                status = RoomStatus.ARRIVING
                            else:
                                status = RoomStatus.PRE_ASSIGNED  # Room is held/booked for future arrival
                        else:
                            status = RoomStatus.PRE_ASSIGNED
                        
                        return {
                            "date": check_date.isoformat(),
                            "status": status,
                            "booking_id": booking['id'],
                            "guest_name": guest_name,
                            "is_arrival": check_date == checkin_date,
                            "is_departure": check_date == checkout_date,
                            "is_vip": booking.get('is_vip', False)
                        }

        # Check allocations
        for allocation in allocations:
            if room_id == allocation['room_id']:
                checkin_date = datetime.fromisoformat(allocation['check_in_date']).date()
                checkout_date = datetime.fromisoformat(allocation['check_out_date']).date()
                
                if checkin_date <= check_date < checkout_date:
                    guest_name = None
                    # Handle the renamed bookings field from the explicit relationship
                    bookings_field = allocation.get('bookings!room_allocations_booking_id_fkey') or allocation.get('bookings')
                    if bookings_field and bookings_field.get('customers'):
                        guest_name = bookings_field['customers']['full_name']
                    
                    return {
                        "date": check_date.isoformat(),
                        "status": RoomStatus.OCCUPIED,
                        "booking_id": allocation['booking_id'],
                        "guest_name": guest_name,
                        "is_arrival": check_date == checkin_date,
                        "is_departure": check_date == checkout_date
                    }

        return {
            "date": check_date.isoformat(),
            "status": RoomStatus.AVAILABLE
        }
    
    def _get_room_status_for_date(self, room_id: str, check_date: date, allocations: List, blocks: List, assigned_bookings: List = None) -> Dict:
        """Get room status for a specific date (original method for non-grid endpoints)"""
        # First, check the room's actual status in the database
        room_result = self.db.table("rooms").select("status, status_reason").eq("id", room_id).execute()
        if room_result.data and room_result.data[0].get('status') == 'cleaning':
            # Room is being cleaned
            return {
                "date": check_date.isoformat(),
                "status": RoomStatus.CLEANING,
                "status_reason": room_result.data[0].get('status_reason', 'Room is being cleaned')
            }
        
        # Check blocks first
        for block in blocks:
            if (room_id == block['room_id'] and
                datetime.fromisoformat(block['start_date']).date() <= check_date <= 
                datetime.fromisoformat(block['end_date']).date()):
                return {
                    "date": check_date.isoformat(),
                    "status": RoomStatus.BLOCKED,
                    "block_reason": block.get('block_reason', 'Blocked')
                }

        # Check assigned bookings (rooms assigned through booking system)
        if assigned_bookings:
            for booking in assigned_bookings:
                if str(room_id) == str(booking['room_id']):
                    checkin_date = datetime.fromisoformat(booking['check_in_date']).date()
                    checkout_date = datetime.fromisoformat(booking['check_out_date']).date()
                    
                    if checkin_date <= check_date < checkout_date:
                        guest_name = None
                        if booking.get('customers'):
                            guest_name = booking['customers']['full_name']
                        
                        # Determine status based on booking status and date
                        if booking['status'] == 'checked_in':
                            status = RoomStatus.OCCUPIED
                        elif booking['status'] == 'confirmed':
                            if check_date == checkin_date:
                                status = RoomStatus.ARRIVING
                            else:
                                status = RoomStatus.PRE_ASSIGNED  # Room is held/booked for future arrival
                        else:
                            status = RoomStatus.PRE_ASSIGNED
                        
                        return {
                            "date": check_date.isoformat(),
                            "status": status,
                            "booking_id": booking['id'],
                            "guest_name": guest_name,
                            "is_arrival": check_date == checkin_date,
                            "is_departure": check_date == checkout_date,
                            "is_vip": booking.get('is_vip', False)
                        }

        # Check allocations
        for allocation in allocations:
            if room_id == allocation['room_id']:
                checkin_date = datetime.fromisoformat(allocation['check_in_date']).date()
                checkout_date = datetime.fromisoformat(allocation['check_out_date']).date()
                
                if checkin_date <= check_date < checkout_date:
                    guest_name = None
                    # Handle the renamed bookings field from the explicit relationship
                    bookings_field = allocation.get('bookings!room_allocations_booking_id_fkey') or allocation.get('bookings')
                    if bookings_field and bookings_field.get('customers'):
                        guest_name = bookings_field['customers']['full_name']
                    
                    return {
                        "date": check_date.isoformat(),
                        "status": RoomStatus.OCCUPIED,
                        "booking_id": allocation['booking_id'],
                        "guest_name": guest_name,
                        "is_arrival": check_date == checkin_date,
                        "is_departure": check_date == checkout_date
                    }

        return {
            "date": check_date.isoformat(),
            "status": RoomStatus.AVAILABLE
        }

    async def _get_unassigned_bookings(self, start_date: date, end_date: date, room_type_ids: Optional[List[UUID]] = None):
        """Get unassigned bookings in date range"""
        query = self.db.table("unassigned_bookings").select("*").gte(
            "check_in_date", start_date.isoformat()
        ).lte("check_in_date", end_date.isoformat())
        
        if room_type_ids:
            query = query.in_("room_type_id", [str(rt) for rt in room_type_ids])
        
        result = query.execute()
        return result.data

    def _sort_bookings_by_strategy(self, bookings: List, strategy: AssignmentStrategy) -> List:
        """Sort bookings by assignment strategy"""
        if strategy == AssignmentStrategy.VIP_FIRST:
            return sorted(bookings, key=lambda x: (not x.get('is_vip', False), x['check_in_date']))
        elif strategy == AssignmentStrategy.OPTIMIZE_OCCUPANCY:
            return sorted(bookings, key=lambda x: x['check_in_date'])
        else:
            return sorted(bookings, key=lambda x: x['check_in_date'])

    async def _find_best_room(self, booking: Dict, respect_preferences: bool = True) -> Optional[Dict]:
        """Find the best available room for a booking"""
        # Get available rooms for booking dates and room type
        if booking.get('room_type_id') is None:
            available_rooms_result = self.db.table("rooms").select("""
                *, room_types(name, base_price)
            """).eq("status", "available").execute()
        else:
            available_rooms_result = self.db.table("rooms").select("""
                *, room_types(name, base_price)
            """).eq("room_type_id", booking['room_type_id']).eq("status", "available").execute()
        
        available_rooms = []
        for room in available_rooms_result.data:
            conflicts = await self._check_room_availability(
                UUID(room['id']),
                datetime.fromisoformat(booking['check_in_date']).date(),
                datetime.fromisoformat(booking['check_out_date']).date()
            )
            if not conflicts:
                available_rooms.append(room)

        if not available_rooms:
            return None

        # If not respecting preferences, return first available
        if not respect_preferences:
            return available_rooms[0]

        # Score rooms based on preferences (simplified)
        scored_rooms = []
        for room in available_rooms:
            score = 100  # Base score
            
            # Add preference-based scoring logic here
            # For now, just return the first available room
            scored_rooms.append((room, score))

        scored_rooms.sort(key=lambda x: x[1], reverse=True)
        return scored_rooms[0][0] if scored_rooms else None

    async def _get_available_rooms_for_booking(self, booking: Dict) -> List[Dict]:
        """Get available rooms for a specific booking"""
        # If room_type_id is None, get all available rooms
        if booking.get('room_type_id') is None:
            available_rooms_result = self.db.table("rooms").select("*").eq(
                "status", "available"
            ).execute()
        else:
            available_rooms_result = self.db.table("rooms").select("*").eq(
                "room_type_id", booking['room_type_id']
            ).eq("status", "available").execute()
        
        available_rooms = []
        for room in available_rooms_result.data:
            conflicts = await self._check_room_availability(
                UUID(room['id']),
                datetime.fromisoformat(booking['check_in_date']).date(),
                datetime.fromisoformat(booking['check_out_date']).date()
            )
            if not conflicts:
                available_rooms.append(room)

        return available_rooms

    def _generate_assignment_recommendations(self, alerts: List) -> List[str]:
        """Generate recommendations for unassigned bookings"""
        recommendations = []
        
        critical_count = sum(1 for alert in alerts if alert['alert_level'] == 'critical')
        if critical_count > 0:
            recommendations.append(f"URGENT: {critical_count} bookings need immediate room assignment")
        
        vip_unassigned = sum(1 for alert in alerts if alert['is_vip'])
        if vip_unassigned > 0:
            recommendations.append(f"Priority: {vip_unassigned} VIP guests need room assignment")
        
        return recommendations

    async def _resolve_unassigned_alerts(self, booking_id: UUID):
        """Resolve unassigned alerts for a booking"""
        self.db.table("allocation_alerts").update({
            "is_resolved": True,
            "resolved_at": datetime.utcnow().isoformat(),
            "auto_resolved": True,
            "resolution_notes": "Room assigned"
        }).eq("booking_id", str(booking_id)).eq("is_resolved", False).execute()

    async def _update_booking_room_assignment(self, booking_id: UUID, room_id: UUID):
        """Update booking with room assignment"""
        # Update the bookings table with the assigned room
        self.db.table("bookings").update({
            "room_id": str(room_id),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", str(booking_id)).execute()

    async def _set_room_hold_status(self, room_id: UUID, booking_id: UUID):
        """Set room status to 'booked' (hold status) when assigned to confirmed booking"""
        self.db.table("rooms").update({
            "status": "booked",
            "status_reason": f"Held for booking {booking_id}",
            "current_booking_id": str(booking_id),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", str(room_id)).execute()

    async def _release_room_hold(self, room_id: UUID):
        """Release room from hold status back to available"""
        self.db.table("rooms").update({
            "status": "available",
            "status_reason": None,
            "current_booking_id": None,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", str(room_id)).execute()

    async def _create_rate_adjustment_invoice(self, booking_id: UUID, price_adjustment: Dict):
        """Create billing adjustment for room rate changes"""
        # This would integrate with your billing system
        # Implementation depends on your billing schema
        pass

    async def _notify_room_change(self, allocation_id: UUID, current_room: Dict, new_room: Dict):
        """Notify staff of room change"""
        # This would send notifications to relevant staff
        # Implementation depends on your notification system
        pass

    async def _get_alternative_suggestions(self, booking: Dict) -> List[str]:
        """Get alternative suggestions for failed assignments"""
        # This would suggest alternatives like different room types
        return ["Consider upgrading to next available room type", "Check for early departure opportunities"]

    async def _calculate_room_change_adjustment(self, allocation: Dict, current_room: Dict, new_room: Dict) -> Optional[Dict]:
        """Calculate adjustment for room changes"""
        current_rate = current_room.get('room_types', {}).get('base_rate', 0)
        new_rate = new_room.get('room_types', {}).get('base_rate', 0)
        
        if current_rate != new_rate:
            nights = allocation['nights_count']
            
            return {
                "original_rate": float(current_rate),
                "new_rate": float(new_rate),
                "difference": float(new_rate - current_rate),
                "total_difference": float((new_rate - current_rate) * nights),
                "nights": nights
            }
        
        return None
    
    async def get_available_rooms(self, request: AvailableRoomsRequest) -> AvailableRoomsResponse:
        """Get available rooms for specific dates and criteria"""
        try:
            # First, check if we need to include a specific booking's assigned room
            assigned_room = None
            if request.booking_id:
                # Get the room currently assigned to this booking
                booking_result = self.db.table("bookings").select("room_id").eq("id", str(request.booking_id)).execute()
                if booking_result.data and booking_result.data[0].get('room_id'):
                    assigned_room_id = booking_result.data[0]['room_id']
                    # Get the assigned room details
                    assigned_room_result = self.db.table("rooms").select("""
                        id,
                        room_number,
                        room_type_id,
                        floor,
                        status,
                        is_accessible,
                        current_booking_id,
                        room_types(
                            id,
                            name,
                            base_price,
                            max_occupancy
                        )
                    """).eq("id", assigned_room_id).execute()
                    if assigned_room_result.data:
                        assigned_room = assigned_room_result.data[0]
            
            # Build the query for available rooms
            query = self.db.table("rooms").select("""
                id,
                room_number,
                room_type_id,
                floor,
                status,
                is_accessible,
                current_booking_id,
                room_types(
                    id,
                    name,
                    base_price,
                    max_occupancy
                )
            """)
            
            # Only get available rooms (we'll add the assigned room separately)
            query = query.eq("status", "available")
            
            # Filter by room type if specified
            if request.room_type_id:
                query = query.eq("room_type_id", str(request.room_type_id))
            
            # Filter by accessibility if required
            if request.accessibility_required:
                query = query.eq("is_accessible", True)
            
            # Exclude specific rooms if provided
            if request.exclude_rooms:
                room_ids = [str(room_id) for room_id in request.exclude_rooms]
                # Use filter with not in for Supabase
                room_ids_str = ",".join(room_ids)
                query = query.filter("id", "not.in", f"({room_ids_str})")
            
            # Execute query for available rooms
            result = query.execute()
            all_rooms = result.data
            
            # Add the assigned room if it exists and isn't already in the results
            if assigned_room:
                room_ids_in_results = {room['id'] for room in all_rooms}
                if assigned_room['id'] not in room_ids_in_results:
                    all_rooms.append(assigned_room)
            
            # Check availability for each room in the date range
            available_rooms = []
            for room in all_rooms:
                # Get room type data and check guest capacity
                room_type_data = room.get('room_types', {}) or {}
                max_occupancy = room_type_data.get('max_occupancy', 1)
                
                # Filter by guest capacity if specified - do this in memory since max_occupancy is in room_types
                if request.guest_count and max_occupancy < request.guest_count:
                    # Skip rooms that can't accommodate the guest count
                    # BUT always include the assigned room
                    if not (assigned_room and room['id'] == assigned_room['id']):
                        continue
                
                # Check if room has any allocations in the requested period
                # Skip this check for the assigned room (it's already allocated to this booking)
                if assigned_room and room['id'] == assigned_room['id']:
                    # This is the assigned room, include it without checking conflicts
                    conflicts = False
                else:
                    conflicts = await self._check_room_availability(
                        UUID(room['id']),
                        request.check_in_date,  # Already a date object from request
                        request.check_out_date   # Already a date object from request
                    )
                
                if not conflicts:
                    available_rooms.append({
                        "room_id": room['id'],
                        "room_number": room['room_number'],
                        "room_type_id": room.get('room_type_id', room['id']),  # Use room_id if room_type_id not available
                        "room_type": room_type_data.get('name', 'Standard'),
                        "floor": room.get('floor', 0),
                        "features": [],  # Features column doesn't exist, return empty list
                        "base_rate": float(room_type_data.get('base_price', 100)),  # Use base_price instead of base_rate
                        "current_status": room.get('status', 'available'),
                        "availability_score": None,
                        "is_accessible": room.get('is_accessible', False),
                        "last_cleaned": None,
                        "maintenance_notes": None
                    })
            
            return AvailableRoomsResponse(
                available_rooms=available_rooms,
                total_available=len(available_rooms),
                filters_applied={
                    "check_in_date": request.check_in_date.isoformat(),
                    "check_out_date": request.check_out_date.isoformat(),
                    "room_type_id": str(request.room_type_id) if request.room_type_id else None,
                    "guest_count": request.guest_count,
                    "accessibility_required": request.accessibility_required,
                    "features_required": request.features_required
                },
                suggestions=[]
            )
        except Exception as e:
            raise BadRequestException(f"Failed to get available rooms: {str(e)}")