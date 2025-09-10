# Booking Data Template Summary

## 📅 Date Range: August 23-30, 2025

This booking template creates realistic sample data for testing the Room Booking System with various booking scenarios within a week period.

## 📊 Data Overview

### 1. Room Types (5 types)
- **Standard Single** (STD-S): ₫500,000/night
- **Deluxe Double** (DLX-D): ₫800,000/night  
- **Superior Twin** (SUP-T): ₫900,000/night
- **Family Suite** (FAM-S): ₫1,500,000/night
- **Executive Suite** (EXE-S): ₫2,000,000/night

### 2. Rooms (15 rooms across 3 floors)
- **Floor 1**: Rooms 101-105 (Garden/Pool view)
- **Floor 2**: Rooms 201-205 (City/Pool view)
- **Floor 3**: Rooms 301-305 (City/Mountain view)

### 3. Customers (10 profiles)
#### Vietnamese Customers:
- Nguyen Van An (Regular, 5 bookings history)
- Tran Thi Bich (VIP, 12 bookings history)
- Le Hoang Duc (Active, 3 bookings history)
- Pham Thu Huong (Active, 2 bookings history)

#### International Customers:
- John Smith (USA)
- Emma Johnson (UK)
- Liu Wei (China)
- Tanaka Yuki (Japan, VIP)
- Marie Dubois (France)
- Kim Min-jun (South Korea)

### 4. Bookings (16 total)

#### Currently Staying (4 bookings - `checked_in`)
| Guest | Room | Check-in | Check-out | Amount |
|-------|------|----------|-----------|---------|
| Nguyen Van An | 103 | Aug 21 | Aug 24 | ₫2,400,000 |
| Tran Thi Bich (VIP) | 305 | Aug 22 | Aug 26 | ₫8,000,000 |
| John Smith | 202 | Aug 20 | Aug 25 | ₫4,000,000 |
| Tanaka Yuki (VIP) | 304 | Aug 23 | Aug 28 | ₫7,500,000 |

#### Arriving Today Aug 23 (2 bookings - `confirmed`)
| Guest | Room | Check-in | Check-out | Amount | Status |
|-------|------|----------|-----------|---------|--------|
| Emma Johnson | 102 | Aug 23 | Aug 27 | ₫2,000,000 | 50% paid |
| Liu Wei | 203 | Aug 23 | Aug 26 | ₫2,700,000 | Fully paid |

#### Future Arrivals (6 bookings - `confirmed`/`pending`)
| Guest | Room | Check-in | Check-out | Amount | Status |
|-------|------|----------|-----------|---------|--------|
| Le Hoang Duc | 104 | Aug 24 | Aug 27 | ₫2,400,000 | 50% paid |
| Pham Thu Huong | 105 | Aug 25 | Aug 29 | ₫3,600,000 | Pending payment |
| Marie Dubois | 204 | Aug 26 | Aug 30 | ₫3,600,000 | Fully paid |
| Kim Min-jun | 301 | Aug 27 | Aug 30 | ₫2,400,000 | 50% paid |
| Nguyen Van An (Family) | 205 | Aug 28 | Aug 31 | ₫4,500,000 | 50% paid |
| Tran Thi Bich | 101 | Aug 29 | Aug 31 | ₫1,200,000 | Fully paid |

#### Past Bookings (2 `checked_out`, 1 `cancelled`, 1 `no_show`)
- **Checked out**: Aug 19-22 (completed stays)
- **Cancelled**: Aug 25-28 booking (flight cancellation)
- **No show**: Aug 22 booking (charged first night)

## 📈 Statistics Summary

### Occupancy Status (as of Aug 23)
- **Currently Occupied**: 4 rooms (26.7%)
- **Available**: 9 rooms (60%)
- **Arriving Today**: 2 rooms (13.3%)

### Booking Status Distribution
- **Checked In**: 4 bookings (25%)
- **Confirmed**: 8 bookings (50%)
- **Pending**: 2 bookings (12.5%)
- **Checked Out**: 2 bookings (12.5%)

### Revenue Summary
- **Total Booking Value**: ₫51,500,000
- **Already Paid**: ₫39,600,000 (77%)
- **Pending Payment**: ₫11,900,000 (23%)

### Guest Demographics
- **Vietnamese**: 40%
- **International**: 60%
- **VIP Customers**: 20%
- **New Customers**: 30%

## 🔧 Usage Instructions

### SQL Import (PostgreSQL/Supabase)
```bash
# Import the SQL template
psql -d your_database -f booking_template_aug23_30.sql
```

### Python Script
```bash
# Run the Python insertion script
cd backend/sample_data
python3 insert_booking_template.py
```

### Manual Creation
Use the Supabase dashboard or API to create:
1. Room types first
2. Rooms with proper type references
3. Customers with complete profiles
4. Bookings with various statuses

## 📝 Special Requests & Notes

### Common Special Requests:
- Late check-out
- Early check-in
- High floor preference
- Quiet room
- Special dietary needs (vegetarian, gluten-free, seafood allergy)
- Extra pillows/bedding
- Anniversary/honeymoon arrangements
- Business facilities

### Room Preferences:
- City view
- Garden view
- Pool view
- Mountain view
- High floor
- Away from elevator

## ✅ Testing Scenarios

This template enables testing of:

1. **Check-in Process**: 2 arrivals on Aug 23
2. **Check-out Process**: 1 departure on Aug 24
3. **Room Allocation**: Multiple room types and views
4. **Payment Processing**: Various payment statuses
5. **Guest Management**: VIP and regular customers
6. **Reporting**: Occupancy and revenue metrics
7. **Multi-language**: Vietnamese and international guests
8. **Special Requests**: Dietary and room preferences
9. **Booking Status**: All status types represented
10. **Calendar View**: Week-long booking spread

## 🎯 Key Features Demonstrated

- **Diverse guest profiles** (local & international)
- **Various booking sources** (direct, OTA, walk-in)
- **Different payment states** (full, partial, pending)
- **Room type variety** (single to suite)
- **Realistic pricing** (Vietnamese Dong)
- **Special requests handling**
- **VIP customer management**
- **Cancellation and no-show scenarios**

---

*Template created for Room Booking System v1.0*
*Date range: August 23-30, 2025*
*Total sample bookings: 16*