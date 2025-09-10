#!/bin/bash

# Docker Troubleshooting Script
# ============================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}==================================${NC}"
    echo -e "${BLUE} Docker Troubleshooting${NC}"
    echo -e "${BLUE}==================================${NC}"
    echo ""
}

print_header

# Check Docker Desktop status
print_status "Checking Docker Desktop status..."
if pgrep -f "Docker Desktop" > /dev/null; then
    print_status "Docker Desktop is running"
else
    print_error "Docker Desktop is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

# Check Docker version
print_status "Docker version:"
docker --version

# Test basic Docker functionality
print_status "Testing basic Docker functionality..."

# Try a simple hello-world
if docker run --rm hello-world > /dev/null 2>&1; then
    print_status "✅ Basic Docker functionality works"
else
    print_error "❌ Basic Docker test failed"
    echo "Suggested fixes:"
    echo "1. Restart Docker Desktop"
    echo "2. Check Docker Desktop settings"
    echo "3. Try: docker system prune -a"
fi

# Test image pulling
print_status "Testing image pulling..."
if docker pull alpine:latest > /dev/null 2>&1; then
    print_status "✅ Image pulling works"
    docker image rm alpine:latest > /dev/null 2>&1
else
    print_error "❌ Image pulling failed"
    echo "Suggested fixes:"
    echo "1. Check internet connection"
    echo "2. Check Docker Desktop proxy settings"
    echo "3. Restart Docker Desktop"
fi

# Test compose functionality
print_status "Testing Docker Compose..."
if docker compose version > /dev/null 2>&1; then
    print_status "✅ Docker Compose is available"
    docker compose version
else
    print_error "❌ Docker Compose not available"
fi

# Check for port conflicts
print_status "Checking for port conflicts..."
for port in 8080 8081 6379; do
    if lsof -i :$port > /dev/null 2>&1; then
        print_warning "Port $port is in use:"
        lsof -i :$port | head -2
    else
        print_status "Port $port is available"
    fi
done

echo ""
print_status "Troubleshooting complete!"
echo ""
echo "Common fixes for Docker issues on macOS:"
echo "1. Restart Docker Desktop (Quit and reopen)"
echo "2. Reset Docker Desktop to factory defaults"
echo "3. Increase Docker Desktop resources (Memory/CPU)"
echo "4. Check for macOS updates"
echo "5. Reinstall Docker Desktop if problems persist"
echo ""