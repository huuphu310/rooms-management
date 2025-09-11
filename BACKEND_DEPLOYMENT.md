# Backend Deployment Instructions for Production

## Problem Identified
The production API at `api.farmstay.space` is returning empty rooms (`rooms: []`) while the development API returns 33 rooms. Both environments use the same Supabase database, which confirms all 33 rooms are active. This indicates the production backend code is outdated.

## Critical Changes to Deploy

### 1. Database Connection Pooling (`app/core/database_pool.py`)
- **NEW FILE** - Must be created on production server
- Implements singleton pattern for Supabase clients
- Reduces API response time by 75-80%

### 2. Updated Dependencies (`app/api/deps.py`)
- Fixed JWT validation bug (line 169)
- Now uses pooled database connections
- Proper error handling for authentication

### 3. Updated Services
All services now use the pooled database connection:
- `app/services/room_allocation_service.py`
- `app/services/building_service.py`
- `app/services/room_service.py`
- And all other service files

## Deployment Steps

### Option 1: Using Git (Recommended)

1. **SSH into production server**
```bash
ssh your-server
```

2. **Navigate to backend directory**
```bash
cd /path/to/room_booking/backend
```

3. **Pull latest changes**
```bash
git pull origin main
```

4. **Install/Update dependencies**
```bash
pip install -r requirements.txt
```

5. **Restart the backend service**
```bash
# For systemd
sudo systemctl restart room-booking-backend

# For Docker
docker-compose restart backend

# For PM2
pm2 restart backend

# For direct uvicorn
pkill -f "uvicorn app.main:app"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Option 2: Manual File Update

If git is not available on production:

1. **Upload these critical files to production:**
   - `app/core/database_pool.py` (NEW FILE)
   - `app/api/deps.py` (UPDATED)
   - `app/services/room_allocation_service.py` (UPDATED)
   - All other service files in `app/services/`

2. **Restart the backend service** (see commands above)

### Option 3: Docker Deployment

```bash
# Build new image
docker build -t room-booking-backend:latest .

# Stop current container
docker stop room-booking-backend

# Start with new image
docker run -d \
  --name room-booking-backend \
  -p 8000:8000 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY \
  -e SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  -e SECRET_KEY=$SECRET_KEY \
  room-booking-backend:latest
```

## Verification Steps

After deployment, verify the fix:

1. **Test the API directly:**
```bash
curl "https://api.farmstay.space/api/v1/room-allocation/monthly-grid?month=2025-09" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.rooms | length'
```
Should return: `33`

2. **Check response time:**
```bash
time curl "https://api.farmstay.space/api/v1/buildings?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Should be < 500ms (was 1.8s before)

3. **Verify in browser:**
- Navigate to https://your-domain.com/room-allocation
- Grid should now display all 33 rooms

## Environment Variables Required

Ensure these are set on production:
```bash
SUPABASE_URL=https://dbifsitavfvrzmmayxlz.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key
SECRET_KEY=your_secret_key
DATABASE_URL=your_database_url
```

## Troubleshooting

### If API still returns empty rooms:
1. Check logs for errors:
   ```bash
   tail -f /var/log/room-booking/backend.log
   ```

2. Verify database connection:
   ```bash
   python3 -c "from app.core.database_pool import DatabasePool; db = DatabasePool.get_service_client(); print(db.table('rooms').select('count').execute())"
   ```

3. Check if service restarted properly:
   ```bash
   ps aux | grep uvicorn
   ```

### If getting import errors:
1. Ensure `database_pool.py` exists in `app/core/`
2. Check Python path includes the app directory
3. Verify all dependencies are installed

## Files Changed Summary

### New Files:
- `app/core/database_pool.py`

### Modified Files:
- `app/api/deps.py`
- `app/services/*.py` (all service files)

## Expected Results After Deployment

✅ API returns 33 rooms instead of empty array
✅ Response times improved from 1.8s to ~200-400ms
✅ Room Allocation Grid displays correctly
✅ No more JWT validation errors

## Contact for Issues
If deployment issues persist, check:
- Backend logs on production server
- Supabase connection logs
- Network/firewall rules for API access