# Fix: 403 Forbidden Errors on Room Allocation Endpoints

## Issue
Multiple GET endpoints in the room allocation module were returning 403 Forbidden errors when accessed by regular authenticated users.

## Root Cause
The endpoints were using `require_permission("room_allocation", "read")` which requires specific role-based permissions that regular users might not have. For viewing/reading data, this was too restrictive.

## Solution
Changed read-only endpoints from `require_permission()` to `get_current_user()` to allow any authenticated user to view the data.

## Endpoints Fixed

### Room Blocks
- `/api/v1/room-allocation/blocks` - View room blocks

### Alerts
- `/api/v1/room-allocation/alerts` - View allocation alerts

### Reports and Statistics
- `/api/v1/room-allocation/monthly-grid` - View monthly room grid
- `/api/v1/room-allocation/reports/optimization` - View optimization reports
- `/api/v1/room-allocation/statistics` - View allocation statistics
- `/api/v1/room-allocation/daily-summary` - View daily summary

### Other Read Operations
- `/api/v1/room-allocation/allocations/{id}` - View specific allocation
- `/api/v1/room-allocation/preferences/{customer_id}` - View guest preferences
- `/api/v1/room-allocation/rules` - View allocation rules
- `/api/v1/room-allocation/history/{id}` - View allocation history
- `/api/v1/room-allocation/validate-assignment` - Validate room assignment

## Code Changes

### Before
```python
@router.get("/blocks", response_model=List[RoomBlockResponse])
async def get_room_blocks(
    # ... parameters
    current_user: dict = Depends(require_permission("room_allocation", "read"))
):
```

### After
```python
@router.get("/blocks", response_model=List[RoomBlockResponse])
async def get_room_blocks(
    # ... parameters
    current_user: dict = Depends(get_current_user)
):
```

## Principle Applied
- **Read operations** should generally use `get_current_user()` for broader access
- **Write operations** (POST, PUT, DELETE) should keep `require_permission()` for proper authorization
- **Admin operations** should use `require_permission(..., "admin")`

## Testing
```bash
# Test that endpoints are now accessible
curl -X GET "http://localhost:8000/api/v1/room-allocation/blocks?is_active=true"
# Should return data or empty array, not 403 error
```

## Prevention
1. Use appropriate permission levels for different operations:
   - `get_current_user()` - For read/view operations
   - `require_permission(..., "create")` - For creating new records
   - `require_permission(..., "update")` - For modifying records
   - `require_permission(..., "delete")` - For deleting records
   - `require_permission(..., "admin")` - For administrative operations

2. Consider the user experience - viewing data should generally be accessible to all authenticated users unless it contains sensitive information.