#!/usr/bin/env python3
"""
Script to initialize superadmin account and basic seed data
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime
from uuid import uuid4

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from supabase import create_client, Client
from app.core.config import settings
from app.core.security import SecurityService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_superadmin(supabase: Client):
    """Create superadmin account"""
    try:
        # Check if superadmin already exists
        response = supabase.table("user_profiles").select("*").eq("employee_id", "EMP001").execute()
        
        if response.data:
            logger.info("Superadmin already exists")
            return response.data[0]
        
        # First create auth user in Supabase Auth
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": "admin@homestay.com",
                "password": "Admin@123456",
                "email_confirm": True
            })
            admin_id = auth_response.user.id
            logger.info(f"✅ Auth user created with ID: {admin_id}")
        except Exception as auth_error:
            # User might already exist in auth
            logger.info(f"Auth user might already exist: {str(auth_error)}")
            # Try to get existing user
            users = supabase.auth.admin.list_users()
            admin_id = None
            for user in users:
                if user.email == "admin@homestay.com":
                    admin_id = user.id
                    break
            if not admin_id:
                admin_id = str(uuid4())
        
        # Create user profile
        admin_data = {
            "id": admin_id,
            "employee_id": "EMP001",
            "full_name": "System Administrator",
            "phone": "+84901234567",
            "department": "Management",
            "position": "Administrator",
            "role": "admin",
            "permissions": {
                "rooms": ["create", "read", "update", "delete"],
                "bookings": ["create", "read", "update", "delete"],
                "customers": ["create", "read", "update", "delete"],
                "billing": ["create", "read", "update", "delete"],
                "inventory": ["create", "read", "update", "delete"],
                "reports": ["create", "read", "update", "delete"],
                "users": ["create", "read", "update", "delete"]
            },
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        response = supabase.table("user_profiles").insert(admin_data).execute()
        logger.info(f"✅ Superadmin profile created successfully")
        logger.info(f"   Email: admin@homestay.com")
        logger.info(f"   Password: Admin@123456")
        logger.info(f"   Employee ID: EMP001")
        logger.info(f"   Role: admin")
        
        return response.data[0]
        
    except Exception as e:
        logger.error(f"❌ Error creating superadmin: {str(e)}")
        raise

async def create_room_types(supabase: Client):
    """Create default room types"""
    try:
        # Check if room types exist
        response = supabase.table("room_types").select("*").execute()
        
        if response.data:
            logger.info("Room types already exist")
            return
        
        room_types = [
            {
                "id": str(uuid4()),
                "name": "Standard Room",
                "max_occupancy": 2,
                "min_occupancy": 1,
                "base_price": 500000,
                "weekend_price": 600000,
                "extra_person_charge": 150000,
                "amenities": {"items": ["AC", "TV", "WiFi", "Bathroom"]},
                "description": "Comfortable standard room with basic amenities",
                "size_sqm": 25,
                "is_active": True
            },
            {
                "id": str(uuid4()),
                "name": "Deluxe Room",
                "max_occupancy": 3,
                "min_occupancy": 1,
                "base_price": 800000,
                "weekend_price": 950000,
                "extra_person_charge": 200000,
                "amenities": {"items": ["AC", "TV", "WiFi", "Bathroom", "Mini Bar", "Balcony"]},
                "description": "Spacious deluxe room with premium amenities",
                "size_sqm": 35,
                "is_active": True
            },
            {
                "id": str(uuid4()),
                "name": "Family Suite",
                "max_occupancy": 5,
                "min_occupancy": 2,
                "base_price": 1200000,
                "weekend_price": 1500000,
                "extra_person_charge": 250000,
                "amenities": {"items": ["AC", "TV", "WiFi", "2 Bathrooms", "Living Room", "Kitchen", "Balcony"]},
                "description": "Large family suite with separate living area",
                "size_sqm": 60,
                "is_active": True
            },
            {
                "id": str(uuid4()),
                "name": "VIP Suite",
                "max_occupancy": 2,
                "min_occupancy": 1,
                "base_price": 2000000,
                "weekend_price": 2500000,
                "extra_person_charge": 500000,
                "amenities": {"items": ["AC", "TV", "WiFi", "Jacuzzi", "Mini Bar", "Ocean View", "Butler Service"]},
                "description": "Luxury VIP suite with premium services",
                "size_sqm": 80,
                "is_active": True
            }
        ]
        
        for room_type in room_types:
            room_type["created_at"] = datetime.utcnow().isoformat()
            room_type["updated_at"] = datetime.utcnow().isoformat()
        
        response = supabase.table("room_types").insert(room_types).execute()
        logger.info(f"✅ Created {len(room_types)} room types")
        
    except Exception as e:
        logger.error(f"❌ Error creating room types: {str(e)}")
        raise

async def create_rooms(supabase: Client):
    """Create sample rooms"""
    try:
        # Check if rooms exist
        response = supabase.table("rooms").select("*").execute()
        
        if response.data:
            logger.info("Rooms already exist")
            return
        
        # Get room types
        room_types_response = supabase.table("room_types").select("*").execute()
        room_types = room_types_response.data
        
        if not room_types:
            logger.warning("No room types found. Skipping room creation.")
            return
        
        rooms = []
        
        # Create rooms for each floor
        floors = [1, 2, 3]
        room_configs = [
            (0, 5),  # 5 Standard rooms per floor (first room type)
            (1, 3),  # 3 Deluxe rooms per floor (second room type)
            (2, 2),  # 2 Family suites per floor (third room type)
            (3, 1),  # 1 VIP suite per floor (fourth room type)
        ]
        
        for floor in floors:
            room_number_base = floor * 100
            room_counter = 1
            
            for type_index, count in room_configs:
                if type_index < len(room_types):
                    room_type_id = room_types[type_index]["id"]
                    
                    for i in range(count):
                        room_number = f"{room_number_base + room_counter:03d}"
                        room_counter += 1
                        
                        rooms.append({
                            "id": str(uuid4()),
                            "room_number": room_number,
                            "room_type_id": room_type_id,
                            "floor": floor,
                            "status": "available",
                            "is_active": True,
                            "last_cleaned_at": datetime.utcnow().isoformat(),
                            "notes": f"Room {room_number} - Floor {floor}",
                            "created_at": datetime.utcnow().isoformat(),
                            "updated_at": datetime.utcnow().isoformat()
                        })
        
        response = supabase.table("rooms").insert(rooms).execute()
        logger.info(f"✅ Created {len(rooms)} rooms")
        
    except Exception as e:
        logger.error(f"❌ Error creating rooms: {str(e)}")
        raise

async def create_sample_customers(supabase: Client):
    """Create sample customers"""
    try:
        # Check if customers exist
        response = supabase.table("customers").select("*").execute()
        
        if response.data:
            logger.info("Customers already exist")
            return
        
        customers = [
            {
                "id": str(uuid4()),
                "customer_code": "CUS001",
                "full_name": "Nguyễn Văn An",
                "phone": "+84901234001",
                "email": "nguyenan@example.com",
                "id_type": "cccd",
                "id_number": "001234567890",
                "date_of_birth": "1990-05-15",
                "gender": "male",
                "address": "123 Lê Lợi, Q1, TP.HCM",
                "city": "Hồ Chí Minh",
                "country": "Vietnam",
                "nationality": "Vietnam",
                "customer_type": "individual",
                "vip_level": 0,
                "loyalty_points": 100,
                "total_spent": 5000000,
                "total_stays": 2,
                "total_nights": 5,
                "is_active": True,
                "marketing_consent": True
            },
            {
                "id": str(uuid4()),
                "customer_code": "CUS002",
                "full_name": "Trần Thị Bình",
                "phone": "+84901234002",
                "email": "tranbinh@example.com",
                "id_type": "passport",
                "id_number": "B1234567",
                "date_of_birth": "1985-08-20",
                "gender": "female",
                "address": "456 Nguyễn Huệ, Q1, TP.HCM",
                "city": "Hồ Chí Minh",
                "country": "Vietnam",
                "nationality": "Vietnam",
                "customer_type": "individual",
                "vip_level": 2,
                "loyalty_points": 500,
                "total_spent": 20000000,
                "total_stays": 10,
                "total_nights": 25,
                "is_active": True,
                "marketing_consent": True
            },
            {
                "id": str(uuid4()),
                "customer_code": "CUS003",
                "full_name": "ABC Company Ltd.",
                "phone": "+84281234567",
                "email": "contact@abccompany.com",
                "tax_id": "0123456789",
                "address": "789 Võ Văn Tần, Q3, TP.HCM",
                "city": "Hồ Chí Minh",
                "country": "Vietnam",
                "nationality": "Vietnam",
                "customer_type": "corporate",
                "vip_level": 3,
                "loyalty_points": 1000,
                "total_spent": 50000000,
                "total_stays": 25,
                "total_nights": 100,
                "is_active": True,
                "company_name": "ABC Company Ltd.",
                "marketing_consent": False
            }
        ]
        
        for customer in customers:
            customer["created_at"] = datetime.utcnow().isoformat()
            customer["updated_at"] = datetime.utcnow().isoformat()
        
        response = supabase.table("customers").insert(customers).execute()
        logger.info(f"✅ Created {len(customers)} sample customers")
        
    except Exception as e:
        logger.error(f"❌ Error creating customers: {str(e)}")
        raise

async def create_sample_products(supabase: Client):
    """Create sample products for inventory"""
    try:
        # Check if products exist
        response = supabase.table("products").select("*").execute()
        
        if response.data:
            logger.info("Products already exist")
            return
        
        products = [
            {
                "id": str(uuid4()),
                "code": "BEV001",
                "name": "Coca Cola",
                "category": "beverage",
                "unit": "can",
                "unit_price": 15000,
                "cost_price": 10000,
                "current_stock": 100,
                "min_stock": 20,
                "max_stock": 200,
                "reorder_point": 30,
                "is_active": True,
                "is_sellable": True
            },
            {
                "id": str(uuid4()),
                "code": "BEV002",
                "name": "Mineral Water",
                "category": "beverage",
                "unit": "bottle",
                "unit_price": 10000,
                "cost_price": 6000,
                "current_stock": 150,
                "min_stock": 30,
                "max_stock": 300,
                "reorder_point": 50,
                "is_active": True,
                "is_sellable": True
            },
            {
                "id": str(uuid4()),
                "code": "SNK001",
                "name": "Pringles Chips",
                "category": "snack",
                "unit": "pack",
                "unit_price": 45000,
                "cost_price": 35000,
                "current_stock": 50,
                "min_stock": 10,
                "max_stock": 100,
                "reorder_point": 15,
                "is_active": True,
                "is_sellable": True
            },
            {
                "id": str(uuid4()),
                "code": "AMN001",
                "name": "Bath Towel",
                "category": "amenity",
                "unit": "piece",
                "unit_price": 0,
                "cost_price": 50000,
                "current_stock": 200,
                "min_stock": 50,
                "max_stock": 500,
                "reorder_point": 100,
                "is_active": True,
                "is_sellable": False
            },
            {
                "id": str(uuid4()),
                "code": "AMN002",
                "name": "Shampoo",
                "category": "amenity",
                "unit": "bottle",
                "unit_price": 0,
                "cost_price": 15000,
                "current_stock": 100,
                "min_stock": 30,
                "max_stock": 200,
                "reorder_point": 50,
                "is_active": True,
                "is_sellable": False
            }
        ]
        
        for product in products:
            product["created_at"] = datetime.utcnow().isoformat()
            product["updated_at"] = datetime.utcnow().isoformat()
        
        response = supabase.table("products").insert(products).execute()
        logger.info(f"✅ Created {len(products)} sample products")
        
    except Exception as e:
        logger.error(f"❌ Error creating products: {str(e)}")
        raise

async def create_sample_services(supabase: Client):
    """Create sample services"""
    try:
        # Check if services exist
        response = supabase.table("services").select("*").execute()
        
        if response.data:
            logger.info("Services already exist")
            return
        
        services = [
            {
                "id": str(uuid4()),
                "code": "SRV001",
                "name": "Laundry Service",
                "name_vn": "Dịch vụ giặt ủi",
                "category": "laundry",
                "unit_price": 50000,
                "unit": "kg",
                "description": "Professional laundry service",
                "is_active": True
            },
            {
                "id": str(uuid4()),
                "code": "SRV002",
                "name": "Airport Transfer",
                "name_vn": "Đưa đón sân bay",
                "category": "transport",
                "unit_price": 350000,
                "unit": "trip",
                "description": "Airport pickup and drop-off service",
                "is_active": True
            },
            {
                "id": str(uuid4()),
                "code": "SRV003",
                "name": "Breakfast",
                "name_vn": "Bữa sáng",
                "category": "food",
                "unit_price": 100000,
                "unit": "person",
                "description": "Continental breakfast buffet",
                "is_active": True
            },
            {
                "id": str(uuid4()),
                "code": "SRV004",
                "name": "Spa & Massage",
                "name_vn": "Spa & Massage",
                "category": "wellness",
                "unit_price": 500000,
                "unit": "hour",
                "description": "Relaxing spa and massage service",
                "is_active": True
            },
            {
                "id": str(uuid4()),
                "code": "SRV005",
                "name": "Tour Booking",
                "name_vn": "Đặt tour",
                "category": "tourism",
                "unit_price": 0,
                "unit": "booking",
                "description": "Local tour booking assistance",
                "commission_rate": 10,
                "is_active": True
            }
        ]
        
        for service in services:
            service["created_at"] = datetime.utcnow().isoformat()
            service["updated_at"] = datetime.utcnow().isoformat()
        
        response = supabase.table("services").insert(services).execute()
        logger.info(f"✅ Created {len(services)} sample services")
        
    except Exception as e:
        logger.error(f"❌ Error creating services: {str(e)}")
        raise

async def main():
    """Main function to run all initialization"""
    logger.info("🚀 Starting initialization script...")
    
    try:
        # Initialize Supabase client with service key for admin operations
        supabase = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_KEY
        )
        
        logger.info("📊 Connected to Supabase")
        
        # Run initialization tasks
        await create_superadmin(supabase)
        await create_room_types(supabase)
        await create_rooms(supabase)
        await create_sample_customers(supabase)
        await create_sample_products(supabase)
        await create_sample_services(supabase)
        
        logger.info("\n" + "="*50)
        logger.info("✅ Initialization completed successfully!")
        logger.info("="*50)
        logger.info("\n📝 Superadmin credentials:")
        logger.info("   Email: admin@homestay.com")
        logger.info("   Password: Admin@123456")
        logger.info("\n🌐 Access points:")
        logger.info("   Backend API: http://localhost:8000")
        logger.info("   API Docs: http://localhost:8000/api/v1/docs")
        logger.info("   Frontend: http://localhost:5174")
        logger.info("="*50)
        
    except Exception as e:
        logger.error(f"❌ Initialization failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())