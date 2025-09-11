#!/usr/bin/env python3
"""
Test API performance after implementing database connection pooling
"""
import requests
import time
import statistics

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
    "/api/v1/buildings",
    "/api/v1/rooms/types",
    "/api/v1/rooms"
]

print("Testing API Performance with Database Connection Pooling")
print("=" * 60)

for endpoint in endpoints:
    times = []
    
    # Warm up request
    requests.get(f"http://localhost:8000{endpoint}", headers=headers)
    
    # Test 5 requests
    for i in range(5):
        start = time.time()
        response = requests.get(f"http://localhost:8000{endpoint}", headers=headers)
        end = time.time()
        
        response_time = (end - start) * 1000  # Convert to milliseconds
        times.append(response_time)
        
        print(f"{endpoint} - Request {i+1}: {response_time:.2f}ms (Status: {response.status_code})")
    
    # Calculate statistics
    avg_time = statistics.mean(times)
    min_time = min(times)
    max_time = max(times)
    
    print(f"\n{endpoint} Statistics:")
    print(f"  Average: {avg_time:.2f}ms")
    print(f"  Min: {min_time:.2f}ms")
    print(f"  Max: {max_time:.2f}ms")
    print("-" * 40)

print("\nPerformance Improvements:")
print("Before pooling: 2000-3000ms per request")
print("After pooling: Check results above")
print("\nExpected improvement: 60-80% reduction in response time")