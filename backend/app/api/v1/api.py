from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    rooms,
    bookings,
    customers,
    customers_enhanced,
    inventory,
    inventory_enhanced,
    billing,
    billing_enhanced,
    room_allocation,
    pos,
    reports,
    users,
    currency,
    pricing
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(customers_enhanced.router, prefix="/customers-enhanced", tags=["Enhanced Customers"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(inventory_enhanced.router, prefix="/inventory-enhanced", tags=["Enhanced Inventory"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(billing_enhanced.router, prefix="/billing-enhanced", tags=["Enhanced Billing"])
api_router.include_router(room_allocation.router, prefix="/room-allocation", tags=["Room Allocation"])
api_router.include_router(pos.router, prefix="/pos", tags=["POS"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(currency.router, prefix="/currency", tags=["Currency"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["Pricing"])