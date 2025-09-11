#!/usr/bin/env python3
"""
Test room allocation endpoints performance after implementing database connection pooling
"""
import requests
import time
import statistics
import json

# First login to get token
login_response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "admin@homestay.com", "password": "Admin@123456"}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    exit(1)

token = login_response.json()["session"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Test endpoints
endpoints = [
    "/api/v1/room-allocation/dashboard",
    "/api/v1/room-allocation/alerts/unassigned",
    "/api/v1/room-allocation/monthly-grid?month=2025-09"
]

print("Testing Room Allocation API Performance with Database Connection Pooling")
print("=" * 75)

for endpoint in endpoints:
    times = []
    
    # Warm up request
    try:
        requests.get(f"http://localhost:8000{endpoint}", headers=headers, timeout=10)
    except:
        pass
    
    # Test 5 requests
    print(f"\nTesting: {endpoint}")
    print("-" * 60)
    
    for i in range(5):
        start = time.time()
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", headers=headers, timeout=10)
            end = time.time()
            
            response_time = (end - start) * 1000  # Convert to milliseconds
            times.append(response_time)
            
            # Check if response has data
            data_count = 0
            if response.status_code == 200:
                try:
                    json_data = response.json()
                    if isinstance(json_data, dict):
                        if 'data' in json_data:
                            data_count = len(json_data['data'])
                        elif 'bookings' in json_data:
                            data_count = len(json_data['bookings'])
                        elif 'summary' in json_data:
                            data_count = 1  # Dashboard has summary data
                except:
                    pass
            
            print(f"  Request {i+1}: {response_time:.2f}ms (Status: {response.status_code}, Items: {data_count})")
        except requests.exceptions.Timeout:
            print(f"  Request {i+1}: TIMEOUT (>10s)")
        except Exception as e:
            print(f"  Request {i+1}: ERROR - {str(e)}")
    
    # Calculate statistics if we have successful requests
    if times:
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        
        print(f"\nStatistics for {endpoint.split('?')[0]}:")
        print(f"  Average: {avg_time:.2f}ms")
        print(f"  Min: {min_time:.2f}ms")
        print(f"  Max: {max_time:.2f}ms")
    else:
        print(f"\nNo successful requests for {endpoint}")

print("\n" + "=" * 75)
print("Performance Improvements Summary:")
print("Before pooling: 2000-3000ms per request")
print("After pooling: Check results above")
print("\nExpected improvement: 60-80% reduction in response time")
print("Note: First requests may be slower due to cold start")