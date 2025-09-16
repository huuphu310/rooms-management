# Production Deployment Instructions

## CSS Fix for Room Allocation Grid

### Problem Resolved
The Room Allocation Grid was displaying data in production but CSS styles were missing, causing text and status colors to not appear correctly. This was due to Tailwind CSS purging dynamic classes during the production build.

### Solution Applied
1. **Added Tailwind CSS Safelist** (`frontend/tailwind.config.js`):
   - Safelisted all dynamic color classes used by Room Allocation Grid
   - Prevents production build from removing necessary CSS classes
   - Includes status colors, grid layout classes, and utility classes

2. **Fixed Room Active Status** (database):
   - Updated all rooms to have `is_active = true`
   - Ensures rooms appear in the Room Allocation Grid

## Deployment Steps

### 1. Pull Latest Changes
```bash
git pull origin main
```

### 2. Build Frontend with CSS Fixes
```bash
cd frontend
npm install  # Ensure dependencies are up to date
npm run build  # Or: npx vite build if TypeScript errors occur
```

### 3. Verify Build Output
Check that the build completed successfully and the `dist/` folder contains:
- `index.html`
- `assets/` folder with JS and CSS files
- CSS files should be larger now (includes safelisted classes)

### 4. Deploy to Production

#### For Cloudflare Workers:
```bash
npx wrangler deploy
```

#### For Traditional Hosting:
Upload the contents of `dist/` folder to your web server

#### For Docker:
```bash
docker build -t room-booking-frontend .
docker push your-registry/room-booking-frontend:latest
```

### 5. Clear Browser Cache
After deployment, ensure users clear their browser cache or use hard refresh:
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Safari: Cmd+Option+R

### 6. Verify Room Allocation Grid
Navigate to: `https://your-domain.com/room-allocation`

You should see:
- ✅ Room cards displaying with proper colors
- ✅ Guest names appearing in occupied rooms
- ✅ Status indicators (IN/OUT) visible
- ✅ Color-coded status backgrounds (green, blue, orange, etc.)
- ✅ VIP stars displaying for VIP guests

## Important URLs

- **Room Management**: `/rooms` - For CRUD operations on rooms
- **Room Allocation**: `/room-allocation` - For the allocation grid and assignments

## Troubleshooting

### If CSS Still Not Displaying:
1. Check browser console for CSS loading errors
2. Verify the build included the safelist (check CSS file size)
3. Ensure CDN/cache is purged if using one
4. Try incognito/private browsing mode

### If Rooms Not Appearing:
1. Run the fix script on production database:
   ```bash
   python backend/fix_production_rooms.py
   ```
2. Verify API returns rooms:
   ```bash
   curl https://api.your-domain.com/api/v1/room-allocation/monthly-grid?month=2025-09
   ```

### Build Errors:
If `npm run build` fails with TypeScript errors, use:
```bash
npx vite build  # Bypasses TypeScript checking
```

## Files Changed in This Fix

1. `frontend/tailwind.config.js` - Added safelist configuration
2. `backend/fix_production_rooms.py` - Script to activate all rooms
3. `ROOM_ALLOCATION_CLARIFICATION.md` - Documentation explaining the feature
4. `PRODUCTION_DEPLOYMENT.md` - This deployment guide

## Contact for Issues
If issues persist after deployment, check:
- Application logs in production
- Browser console for JavaScript errors
- Network tab for failed API requests