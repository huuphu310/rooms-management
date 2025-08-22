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
                booking['check_in_date'],
                booking['check_out_date']
            )
            
            if conflicts and not request.override_conflicts:
                raise ConflictException(f"Room not available: {', '.join(conflicts)}")

            # 5. Calculate rate differences if room type changed
            price_adjustment = await self._calculate_price_adjustment(
                booking, room
            )

            # 6. Create allocation record
            allocation_data = {
                "booking_id": str(request.booking_id),
                "room_id": str(request.room_id),
                "assignment_type": request.assignment_type,
                "assignment_status": AssignmentStatus.ASSIGNED,
                "check_in_date": booking['check_in_date'],
                "check_out_date": booking['check_out_date'],
                "original_room_type_id": str(booking['room_type_id']),
                "original_rate": float(booking.get('room_rate', 0)),
                "allocated_rate": float(room.get('base_rate', 0)),
                "assigned_at": datetime.utcnow().isoformat(),
                "assignment_reason": request.assignment_reason
            }

            result = self.db.table("room_allocations").insert(allocation_data).execute()
            allocation = result.data[0]

            # 7. Update booking with room assignment
            await self._update_booking_room_assignment(request.booking_id, request.room_id)

            # 8. Clear any unassigned alerts
            await self._resolve_unassigned_alerts(request.booking_id)

            # 9. Create billing adjustment if needed
            if price_adjustment and price_adjustment['total_difference'] != 0:
                await self._create_rate_adjustment_invoice(
                    request.booking_id, price_adjustment
                )

            return AssignRoomResponse(
                allocation_id=UUID(allocation['id']),
                room_assigned={
                    "room_number": room['room_number'],
                    "room_type": room.get('room_type', 'Unknown'),
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

            # Build query for rooms
            rooms_query = self.db.table("rooms").select("""
                id, room_number, room_type_id, floor, features, status,
                room_types(type_name)
            """).eq("status", "active")

            # Apply filters
            if request.room_type_ids:
                rooms_query = rooms_query.in_("room_type_id", [str(rt) for rt in request.room_type_ids])
            
            if request.floors:
                rooms_query = rooms_query.in_("floor", request.floors)

            rooms_result = rooms_query.execute()
            rooms = rooms_result.data

            # Get all allocations for the month
            allocations_result = self.db.table("room_allocations").select("""
                *, bookings(booking_code, customers(full_name))
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
                    "occupancy_rate": 0
                }

                for room in rooms:
                    if not any(rg['room_id'] == room['id'] for rg in room_grid_data):
                        room_grid_data.append({
                            "room_id": room['id'],
                            "room_number": room['room_number'],
                            "room_type": room['room_types']['type_name'] if room['room_types'] else 'Unknown',
                            "floor": room['floor'],
                            "features": room.get('features', []),
                            "daily_status": []
                        })

                    # Find room in grid data
                    room_data = next(rg for rg in room_grid_data if rg['room_id'] == room['id'])

                    # Check status for this date
                    status = self._get_room_status_for_date(
                        room['id'], current_date, allocations, blocks
                    )

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
            avg_occupancy = sum(day['occupancy_rate'] for day in occupancy_stats) / len(occupancy_stats)

            summary = {
                "total_rooms": total_rooms,
                "days_in_month": len(occupancy_stats),
                "average_occupancy_rate": round(avg_occupancy, 1),
                "peak_occupancy": max(day['occupancy_rate'] for day in occupancy_stats),
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
            # Use the unassigned_bookings view
            result = self.db.table("unassigned_bookings").select("*").execute()
            bookings = result.data

            alerts = []
            summary = {"total_unassigned": 0, "critical": 0, "warning": 0, "info": 0}

            for booking in bookings:
                # Get available rooms for this booking
                available_rooms = await self._get_available_rooms_for_booking(booking)

                alert = {
                    "booking_id": booking['booking_id'],
                    "booking_code": booking['booking_code'],
                    "guest_name": booking['guest_name'],
                    "phone": booking.get('phone'),
                    "email": booking.get('email'),
                    "check_in_date": booking['check_in_date'],
                    "check_out_date": booking['check_out_date'],
                    "check_in_time": booking.get('check_in_time'),
                    "room_type": booking['room_type'],
                    "room_type_id": booking['room_type_id'],
                    "is_vip": booking.get('is_vip', False),
                    "special_requests": booking.get('special_requests'),
                    "hours_until_checkin": booking.get('hours_until_checkin'),
                    "alert_level": booking['alert_level'],
                    "available_rooms": [room['room_number'] for room in available_rooms],
                    "total_amount": booking['total_amount'],
                    "paid_amount": booking['paid_amount']
                }

                alerts.append(alert)
                summary["total_unassigned"] += 1
                summary[booking['alert_level']] += 1

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
            *, room_types(type_name, base_rate)
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

    def _get_room_status_for_date(self, room_id: str, check_date: date, allocations: List, blocks: List) -> Dict:
        """Get room status for a specific date"""
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

        # Check allocations
        for allocation in allocations:
            if room_id == allocation['room_id']:
                checkin_date = datetime.fromisoformat(allocation['check_in_date']).date()
                checkout_date = datetime.fromisoformat(allocation['check_out_date']).date()
                
                if checkin_date <= check_date < checkout_date:
                    guest_name = None
                    if allocation.get('bookings') and allocation['bookings'].get('customers'):
                        guest_name = allocation['bookings']['customers']['full_name']
                    
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
                *, room_types(type_name, base_rate)
            """).eq("status", "available").execute()
        else:
            available_rooms_result = self.db.table("rooms").select("""
                *, room_types(type_name, base_rate)
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
        # This would update the bookings table with room assignment
        # Implementation depends on your booking schema
        pass

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