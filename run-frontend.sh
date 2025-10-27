#!/bin/bash

# High-Precision Contract Advisor RAG - Frontend Only Runner
# Starts only the Next.js frontend service

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
FRONTEND_PORT=3000
FRONTEND_PID_FILE=".frontend.pid"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if node_modules exists
check_dependencies() {
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        print_status "Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        npm install
        cd ..
        print_success "Dependencies installed"
    fi
}

# Function to check port availability
check_port() {
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $FRONTEND_PORT is already in use!"
        read -p "Do you want to kill the process and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
        else
            print_error "Cannot start frontend - port $FRONTEND_PORT is occupied"
            exit 1
        fi
    fi
}

# Function to start frontend
start_frontend() {
    print_status "Starting Next.js frontend server..."

    check_port
    check_dependencies

    cd "$FRONTEND_DIR"

    print_status "Frontend starting on: http://localhost:$FRONTEND_PORT"
    print_status "Note: Make sure backend is running on http://127.0.0.1:8081"

    # Start frontend
    npm run dev
}

# Function to stop frontend
stop_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "Stopping frontend (PID: $pid)..."
            kill $pid 2>/dev/null || true
            rm -f "$FRONTEND_PID_FILE"
        fi
    fi

    # Kill any process on the port
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
}

# Handle command line arguments
case "${1:-start}" in
    "start")
        start_frontend
        ;;
    "stop")
        stop_frontend
        ;;
    *)
        echo "Usage: $0 [start|stop]"
        echo "  start - Start frontend server (default)"
        echo "  stop  - Stop frontend server"
        exit 1
        ;;
esac