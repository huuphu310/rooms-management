# New Relic APM Integration

## Overview
New Relic Application Performance Monitoring (APM) has been successfully integrated into the Room Booking System backend. The integration is **optional** and only activates when the `NEW_RELIC_LICENSE_KEY` environment variable is set.

## Key Features

### 1. Optional Activation
- **No New Relic key?** The application runs normally without any monitoring overhead
- **With New Relic key?** Full APM monitoring is automatically enabled
- Configuration via environment variables in `.env` file

### 2. What's Being Monitored

#### Automatic Monitoring
- All API endpoints (request/response times)
- Database queries
- External service calls
- Error tracking with stack traces
- Custom business metrics

#### Performance Metrics
- Request duration
- Response status codes
- Database query performance
- Cache hit/miss rates
- Business transaction tracking

### 3. Files Created/Modified

#### Core Monitoring Module
- `app/core/monitoring.py` - Main monitoring service with decorators
- `app/middleware/newrelic_middleware.py` - Automatic request tracking
- `app/core/monitoring_example.py` - Usage examples

#### Configuration
- `.env` - Added New Relic configuration:
  ```
  NEW_RELIC_LICENSE_KEY='your_key_here'
  NEW_RELIC_APP_NAME='Room Booking System dev'
  NEW_RELIC_ENVIRONMENT='development'
  ```

#### Setup Scripts
- `scripts/setup_newrelic.py` - Configuration generator
- `scripts/test_api_performance.py` - Performance testing script

### 4. How to Use

#### Basic Usage (Automatic)
Just having the New Relic key in `.env` enables automatic monitoring of:
- All HTTP requests
- Database operations via Supabase
- Error tracking

#### Advanced Usage (Decorators)
```python
from app.core.monitoring import monitor_performance, monitor_database_operation

# Monitor any function
@monitor_performance(name="booking_creation", category="booking")
async def create_booking(data):
    # Your code here
    pass

# Monitor database operations
@monitor_database_operation("fetch_rooms")
async def get_available_rooms():
    # Database query
    pass
```

#### Custom Metrics
```python
from app.core.monitoring import monitoring

# Record custom metrics
monitoring.record_custom_metric("bookings/created", 1)
monitoring.record_custom_metric("revenue/daily", amount)

# Record custom events
monitoring.record_custom_event("PaymentProcessed", {
    "amount": 1000,
    "currency": "VND",
    "method": "credit_card"
})
```

### 5. Viewing Metrics

1. **New Relic Dashboard**: https://one.newrelic.com
2. Navigate to: **APM & Services > Room Booking System dev**
3. Available views:
   - Service map
   - Transactions
   - Database queries
   - Error analytics
   - Custom dashboards

### 6. Performance Impact

- **When disabled**: Zero overhead (code paths are skipped)
- **When enabled**: Minimal impact (~1-3% overhead)
- Asynchronous metric reporting
- Configurable sampling rates

### 7. Environment-Specific Configuration

#### Development
```env
NEW_RELIC_ENVIRONMENT='development'
# Full transaction tracing
# Detailed error reporting
```

#### Production
```env
NEW_RELIC_ENVIRONMENT='production'
# Optimized sampling
# Production alerting policies
```

### 8. Troubleshooting

#### New Relic Not Working?
1. Check if `NEW_RELIC_LICENSE_KEY` is set in `.env`
2. Verify the key is valid (check New Relic dashboard)
3. Check logs for "New Relic monitoring enabled" message
4. Ensure `newrelic` package is installed: `pip install newrelic`

#### No Data in Dashboard?
1. Wait 2-3 minutes for initial data
2. Generate some traffic to the API
3. Check New Relic account is active
4. Verify network connectivity to New Relic servers

### 9. Security Considerations

- License key is stored in `.env` (not in code)
- `.env` is gitignored
- No sensitive data is sent to New Relic
- PII filtering is enabled by default

### 10. Next Steps

1. **Create Alerts**: Set up alerting policies in New Relic
2. **Custom Dashboards**: Build business-specific dashboards
3. **SLA Monitoring**: Track and report on SLAs
4. **Deployment Markers**: Mark deployments in New Relic
5. **Distributed Tracing**: Enable for microservices

## Quick Commands

```bash
# Start with New Relic monitoring
uvicorn app.main:app --reload

# Run performance tests
python scripts/test_api_performance.py

# Generate New Relic config file (optional)
python scripts/setup_newrelic.py
```

## Support

- New Relic Documentation: https://docs.newrelic.com/
- Python Agent Docs: https://docs.newrelic.com/docs/apm/agents/python-agent/
- Room Booking System Docs: `/docs/monitoring/`