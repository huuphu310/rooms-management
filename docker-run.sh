#!/bin/bash

# Room Booking System - Docker Deployment Script
# ===============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} Room Booking System - Docker${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are available."
}

# Check if environment file exists
check_env_file() {
    if [ ! -f ".env.docker" ]; then
        print_error "Environment file .env.docker not found!"
        print_warning "Please copy .env.docker.example to .env.docker and configure it."
        exit 1
    fi
    print_status "Environment file found."
}

# Main deployment function
deploy() {
    print_header
    
    print_status "Starting deployment process..."
    
    # Check prerequisites
    check_docker
    check_env_file
    
    # Load environment variables
    export $(cat .env.docker | grep -v '^#' | xargs)
    
    # Build and start services
    print_status "Building and starting services..."
    docker compose --env-file .env.docker up --build -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service status
    print_status "Checking service health..."
    docker compose ps
    
    echo ""
    print_status "Deployment completed!"
    echo ""
    echo -e "${GREEN}Services are now running:${NC}"
    echo -e "  Frontend: http://localhost:${FRONTEND_PORT:-8080}"
    echo -e "  Backend:  http://localhost:${BACKEND_PORT:-8081}"
    echo -e "  Redis:    localhost:${REDIS_PORT:-6379}"
    echo ""
    echo -e "${YELLOW}Use the following commands to manage the deployment:${NC}"
    echo "  View logs:    docker compose --env-file .env.docker logs -f"
    echo "  Stop:         docker compose --env-file .env.docker down"
    echo "  Restart:      docker compose --env-file .env.docker restart"
    echo ""
}

# Stop function
stop() {
    print_status "Stopping services..."
    docker compose --env-file .env.docker down
    print_status "Services stopped."
}

# Logs function
logs() {
    docker compose --env-file .env.docker logs -f
}

# Clean function
clean() {
    print_warning "This will remove all containers, networks, and volumes."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker compose --env-file .env.docker down -v --rmi all
        print_status "Cleanup completed."
    else
        print_status "Cleanup cancelled."
    fi
}

# Help function
show_help() {
    echo "Room Booking System - Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy    Build and start all services (default)"
    echo "  stop      Stop all services"
    echo "  logs      View logs from all services"
    echo "  clean     Remove all containers, networks, and volumes"
    echo "  help      Show this help message"
    echo ""
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    stop)
        stop
        ;;
    logs)
        logs
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac