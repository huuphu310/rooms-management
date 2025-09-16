"""
Example usage of New Relic monitoring decorators in API endpoints.
This file demonstrates how to add performance monitoring to your endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.monitoring import (
    monitor_performance,
    monitor_database_operation,
    monitor_external_service,
    monitoring,
    PerformanceTimer
)

# Example router with monitoring
router = APIRouter()

# Example 1: Basic endpoint monitoring
@router.get("/example/basic")
@monitor_performance(name="get_basic_data", category="endpoint")
async def get_basic_data():
    """Basic endpoint with performance monitoring."""
    # Your business logic here
    return {"status": "success"}


# Example 2: Database operation monitoring
@router.get("/example/users/{user_id}")
@monitor_performance(category="endpoint")
async def get_user_with_monitoring(user_id: str, db=Depends(get_db)):
    """Example of monitoring database operations."""
    
    # Monitor specific database query
    @monitor_database_operation("select_user")
    async def fetch_user(uid):
        # Your database query here
        return db.table("users").select("*").eq("id", uid).execute()
    
    try:
        user = await fetch_user(user_id)
        
        # Record custom metric
        monitoring.record_custom_metric("users/fetched", 1)
        
        return user
    except Exception as e:
        # Record error with context
        monitoring.notice_error(e, {"user_id": user_id, "operation": "fetch_user"})
        raise HTTPException(status_code=404, detail="User not found")


# Example 3: External service monitoring
@router.post("/example/payment")
@monitor_performance(category="payment")
async def process_payment_with_monitoring(payment_data: dict):
    """Example of monitoring external service calls."""
    
    # Monitor external payment gateway call
    @monitor_external_service("payment_gateway")
    async def call_payment_api(data):
        # Your external API call here
        # response = await payment_service.process(data)
        return {"transaction_id": "12345"}
    
    # Use performance timer for specific code blocks
    with PerformanceTimer("payment_validation"):
        # Validation logic here
        if not payment_data.get("amount"):
            raise HTTPException(status_code=400, detail="Invalid amount")
    
    # Process payment with monitoring
    result = await call_payment_api(payment_data)
    
    # Record custom event
    monitoring.record_custom_event("PaymentProcessed", {
        "amount": payment_data.get("amount"),
        "currency": payment_data.get("currency", "VND"),
        "transaction_id": result.get("transaction_id")
    })
    
    return result


# Example 4: Batch operation monitoring
@router.post("/example/batch")
@monitor_performance(category="batch")
async def process_batch_with_monitoring(items: List[dict]):
    """Example of monitoring batch operations."""
    
    processed = 0
    failed = 0
    
    # Monitor batch processing
    with monitoring.background_task("batch_processing", "data_import"):
        for item in items:
            try:
                with PerformanceTimer(f"process_item_{item.get('id')}", record_metric=False):
                    # Process individual item
                    # await process_item(item)
                    processed += 1
            except Exception as e:
                failed += 1
                monitoring.notice_error(e, {"item_id": item.get("id")})
    
    # Record batch metrics
    monitoring.record_custom_metric("batch/processed", processed)
    monitoring.record_custom_metric("batch/failed", failed)
    monitoring.record_custom_metric("batch/total", len(items))
    
    return {
        "processed": processed,
        "failed": failed,
        "total": len(items)
    }


# Example 5: Complex operation with multiple monitoring points
@router.post("/example/complex")
@monitor_performance(category="complex")
async def complex_operation_with_monitoring(request_data: dict):
    """Example of comprehensive monitoring in a complex operation."""
    
    operation_id = request_data.get("operation_id")
    
    # Add custom parameters to transaction
    monitoring.add_custom_parameter("operation_id", operation_id)
    monitoring.add_custom_parameter("operation_type", request_data.get("type"))
    
    results = {}
    
    # Step 1: Data validation
    with PerformanceTimer("validation"):
        # Validation logic
        if not operation_id:
            raise HTTPException(status_code=400, detail="Operation ID required")
    
    # Step 2: Database operations
    @monitor_database_operation("complex_query")
    async def perform_database_work():
        # Complex database operations
        return {"db_result": "success"}
    
    results["database"] = await perform_database_work()
    
    # Step 3: External service calls
    @monitor_external_service("third_party_api")
    async def call_external_service():
        # External API calls
        return {"api_result": "success"}
    
    results["external"] = await call_external_service()
    
    # Step 4: Business logic processing
    with PerformanceTimer("business_logic"):
        # Complex business logic
        results["processed"] = True
    
    # Record operation completion
    monitoring.record_custom_event("ComplexOperationComplete", {
        "operation_id": operation_id,
        "duration": "measured_by_decorator",
        "success": True,
        "steps_completed": len(results)
    })
    
    return results


# Example usage in service layer
class MonitoredService:
    """Example service class with monitoring."""
    
    @monitor_performance(name="calculate_room_availability", category="service")
    async def calculate_availability(self, date_from: str, date_to: str):
        """Calculate room availability with monitoring."""
        
        # Monitor cache lookup
        with PerformanceTimer("cache_lookup"):
            # Check cache
            cached = await self.get_from_cache(date_from, date_to)
            if cached:
                monitoring.record_custom_metric("cache/hit", 1)
                return cached
        
        monitoring.record_custom_metric("cache/miss", 1)
        
        # Monitor database query
        @monitor_database_operation("availability_query")
        async def query_availability():
            # Database query logic
            return []
        
        availability = await query_availability()
        
        # Monitor cache update
        with PerformanceTimer("cache_update"):
            await self.update_cache(date_from, date_to, availability)
        
        return availability
    
    async def get_from_cache(self, date_from, date_to):
        # Cache lookup logic
        return None
    
    async def update_cache(self, date_from, date_to, data):
        # Cache update logic
        pass


# Integration with existing endpoints
def add_monitoring_to_booking_endpoint():
    """Example of adding monitoring to an existing endpoint."""
    
    from app.api.v1.endpoints.bookings import router as booking_router
    
    # Get the original endpoint function
    original_create_booking = booking_router.routes[0].endpoint
    
    # Wrap with monitoring
    @monitor_performance(name="create_booking", category="booking")
    async def monitored_create_booking(*args, **kwargs):
        return await original_create_booking(*args, **kwargs)
    
    # Replace the endpoint
    booking_router.routes[0].endpoint = monitored_create_booking