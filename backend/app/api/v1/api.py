from fastapi import APIRouter

# Import core modules that are needed for basic functionality
try:
    from app.api.v1.endpoints import auth
    auth_available = True
except ImportError as e:
    print(f"Auth module import failed: {e}")
    auth_available = False

try:
    from app.api.v1.endpoints import rooms
    rooms_available = True
except ImportError as e:
    print(f"Rooms module import failed: {e}")
    rooms_available = False

try:
    from app.api.v1.endpoints import bookings
    bookings_available = True
except ImportError as e:
    print(f"Bookings module import failed: {e}")
    bookings_available = False

try:
    from app.api.v1.endpoints import customers
    customers_available = True
except ImportError as e:
    print(f"Customers module import failed: {e}")
    customers_available = False

try:
    from app.api.v1.endpoints import user_management
    user_management_available = True
except ImportError as e:
    print(f"User management module import failed: {e}")
    user_management_available = False

try:
    from app.api.v1.endpoints import buildings
    buildings_available = True
except ImportError as e:
    print(f"Buildings module import failed: {e}")
    buildings_available = False

try:
    from app.api.v1.endpoints import reports
    reports_available = True
except ImportError as e:
    print(f"Reports module import failed: {e}")
    reports_available = False

try:
    from app.api.v1.endpoints import pricing
    pricing_available = True
except ImportError as e:
    print(f"Pricing module import failed: {e}")
    pricing_available = False

try:
    from app.api.v1.endpoints import admin
    admin_available = True
except ImportError as e:
    print(f"Admin module import failed: {e}")
    admin_available = False

try:
    from app.api.v1.endpoints import room_allocation
    room_allocation_available = True
except ImportError as e:
    print(f"Room allocation module import failed: {e}")
    room_allocation_available = False

try:
    from app.api.v1.endpoints import inventory_enhanced
    inventory_enhanced_available = True
except ImportError as e:
    print(f"Inventory enhanced module import failed: {e}")
    inventory_enhanced_available = False

try:
    from app.api.v1.endpoints import billing_enhanced
    billing_enhanced_available = True
except ImportError as e:
    print(f"Billing enhanced module import failed: {e}")
    billing_enhanced_available = False

try:
    from app.api.v1.endpoints import payment_integration
    payment_integration_available = True
except ImportError as e:
    print(f"Payment integration module import failed: {e}")
    payment_integration_available = False

try:
    from app.api.v1.endpoints import folio
    folio_available = True
except ImportError as e:
    print(f"Folio module import failed: {e}")
    folio_available = False

try:
    from app.api.v1.endpoints import checkout
    checkout_available = True
except ImportError as e:
    print(f"Checkout module import failed: {e}")
    checkout_available = False

try:
    from app.api.v1.endpoints import pos
    pos_available = True
except ImportError as e:
    print(f"POS module import failed: {e}")
    pos_available = False

try:
    from app.api.v1.endpoints import currency
    currency_available = True
except ImportError as e:
    print(f"Currency module import failed: {e}")
    currency_available = False

try:
    from app.api.v1.endpoints import cache_management
    cache_management_available = True
except ImportError as e:
    print(f"Cache management module import failed: {e}")
    cache_management_available = False

api_router = APIRouter()

# Include available endpoint routers
if auth_available:
    api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

if rooms_available:
    api_router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])

if bookings_available:
    api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])

if customers_available:
    api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])

if user_management_available:
    api_router.include_router(user_management.router, prefix="/user-management", tags=["User Management"])

if buildings_available:
    api_router.include_router(buildings.router, prefix="/buildings", tags=["Buildings"])

if reports_available:
    api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])

if pricing_available:
    api_router.include_router(pricing.router, prefix="/pricing", tags=["Pricing"])

if admin_available:
    api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])

if room_allocation_available:
    api_router.include_router(room_allocation.router, prefix="/room-allocation", tags=["Room Allocation"])

if inventory_enhanced_available:
    api_router.include_router(inventory_enhanced.router, prefix="/inventory-enhanced", tags=["Inventory Enhanced"])

if billing_enhanced_available:
    api_router.include_router(billing_enhanced.router, prefix="/billing-enhanced", tags=["Billing Enhanced"])

if payment_integration_available:
    api_router.include_router(payment_integration.router, prefix="/payment-integration", tags=["Payment Integration"])

if folio_available:
    api_router.include_router(folio.router, prefix="/folio", tags=["Folio"])

if checkout_available:
    api_router.include_router(checkout.router, prefix="/checkout", tags=["Checkout"])

if pos_available:
    api_router.include_router(pos.router, prefix="/pos", tags=["POS"])

if currency_available:
    api_router.include_router(currency.router, prefix="/currency", tags=["Currency"])

if cache_management_available:
    api_router.include_router(cache_management.router, prefix="/cache", tags=["Cache Management"])
