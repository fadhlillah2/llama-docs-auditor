#!/bin/bash

# High-Precision Contract Advisor RAG - Backend Only Runner
# Starts only the Flask backend service

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VENV_NAME=".venv"
BACKEND_DIR="backend"
BACKEND_PORT=8081
LOG_DIR="logs"
BACKEND_PID_FILE=".backend.pid"

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

# Function to check virtual environment
check_virtual_environment() {
    if [ ! -d "$VENV_NAME" ]; then
        print_error "Virtual environment '$VENV_NAME' not found!"
        print_status "Please run: ./setup-dependencies310.sh"
        exit 1
    fi
}

# Function to check .env file
check_environment_file() {
    if [ ! -f ".env" ]; then
        print_error ".env file not found!"
        print_status "Please run: ./setup-dependencies310.sh"
        exit 1
    fi
}

# Function to check port availability
check_port() {
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $BACKEND_PORT is already in use!"
        read -p "Do you want to kill the process and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
        else
            print_error "Cannot start backend - port $BACKEND_PORT is occupied"
            exit 1
        fi
    fi
}

# Function to start backend
start_backend() {
    print_status "Starting Flask backend server..."

    check_port

    # Create log directory
    mkdir -p "$LOG_DIR"
    BACKEND_LOG="$LOG_DIR/backend_$(date +%Y%m%d_%H%M%S).log"

    # Activate virtual environment and start backend
    source "$VENV_NAME/bin/activate"
    cd "$BACKEND_DIR"

    print_status "Backend starting on: http://127.0.0.1:$BACKEND_PORT"
    print_status "Log file: $BACKEND_LOG"

    # Start backend with logs
    python3 server.py 2>&1 | tee "../$BACKEND_LOG"
}

# Function to stop backend
stop_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "Stopping backend (PID: $pid)..."
            kill $pid 2>/dev/null || true
            rm -f "$BACKEND_PID_FILE"
        fi
    fi

    # Kill any process on the port
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
}

# Handle command line arguments
case "${1:-start}" in
    "start")
        check_virtual_environment
        check_environment_file
        start_backend
        ;;
    "stop")
        stop_backend
        ;;
    *)
        echo "Usage: $0 [start|stop]"
        echo "  start - Start backend server (default)"
        echo "  stop  - Stop backend server"
        exit 1
        ;;
esac