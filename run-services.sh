#!/bin/bash

# High-Precision Contract Advisor RAG - Services Runner Script
# Starts backend and frontend services separately with proper monitoring

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
VENV_NAME=".venv"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BACKEND_PORT=8081
FRONTEND_PORT=3000
HEALTH_CHECK_TIMEOUT=30
LOG_DIR="logs"

# PID files for service management
BACKEND_PID_FILE=".backend.pid"
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

print_service() {
    echo -e "${MAGENTA}[SERVICE]${NC} $1"
}

print_header() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

# Function to check if virtual environment exists
check_virtual_environment() {
    print_status "Checking virtual environment..."

    if [ ! -d "$VENV_NAME" ]; then
        print_error "Virtual environment '$VENV_NAME' not found!"
        print_status "Please run: ./setup-dependencies310.sh"
        exit 1
    fi

    if [ ! -f "$VENV_NAME/bin/activate" ]; then
        print_error "Virtual environment activation script not found!"
        exit 1
    fi

    print_success "Virtual environment found"
}

# Function to check .env file
check_environment_file() {
    print_status "Checking environment configuration..."

    if [ ! -f ".env" ]; then
        print_error ".env file not found!"
        print_status "Please run: ./setup-dependencies310.sh"
        exit 1
    fi

    # Check for critical environment variables
    source .env

    if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" = "gsk_your-actual-key-here" ]; then
        print_warning "GROQ_API_KEY is not configured!"
        print_status "Please edit .env file and add your Groq API key:"
        print_status "Get your key from: https://console.groq.com/keys"
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    print_success "Environment configuration checked"
}

# Function to create log directory
setup_logging() {
    print_status "Setting up logging..."

    mkdir -p "$LOG_DIR"

    # Create log files with timestamp
    BACKEND_LOG="$LOG_DIR/backend_$(date +%Y%m%d_%H%M%S).log"
    FRONTEND_LOG="$LOG_DIR/frontend_$(date +%Y%m%d_%H%M%S).log"

    print_success "Logging configured:"
    echo "  Backend:  $BACKEND_LOG"
    echo "  Frontend: $FRONTEND_LOG"
}

# Function to check if port is available
check_port() {
    local port=$1
    local service_name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use!"
        print_status "Process using port $port:"
        lsof -Pi :$port -sTCP:LISTEN
        read -p "Do you want to kill the process and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Killing process on port $port..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 2
        else
            print_error "Cannot start $service_name - port $port is occupied"
            exit 1
        fi
    fi
}

# Function to start backend service
start_backend() {
    print_header "Starting Backend Service"

    check_port $BACKEND_PORT "Backend"

    print_service "Starting Flask backend server..."
    print_status "Backend will be available at: http://127.0.0.1:$BACKEND_PORT"

    # Activate virtual environment and start backend
    source "$VENV_NAME/bin/activate"

    # Start backend in background with logging
    cd "$BACKEND_DIR"
    python3 server.py > "../$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "../$BACKEND_PID_FILE"
    cd ..

    print_service "Backend started with PID: $BACKEND_PID"
    print_status "Waiting for backend to initialize..."

    # Wait for backend to start
    local wait_time=0
    while [ $wait_time -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -s http://127.0.0.1:$BACKEND_PORT/ > /dev/null 2>&1; then
            print_success "Backend is ready! 🚀"
            return 0
        fi
        sleep 1
        wait_time=$((wait_time + 1))
        echo -n "."
    done

    echo
    print_error "Backend failed to start within $HEALTH_CHECK_TIMEOUT seconds"
    print_status "Check backend log: $BACKEND_LOG"
    return 1
}

# Function to start frontend service
start_frontend() {
    print_header "Starting Frontend Service"

    check_port $FRONTEND_PORT "Frontend"

    print_service "Starting Next.js frontend..."
    print_status "Frontend will be available at: http://localhost:$FRONTEND_PORT"

    # Check if node_modules exists
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        print_status "Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        npm install > "../$FRONTEND_LOG" 2>&1
        cd ..
    fi

    # Start frontend in background
    cd "$FRONTEND_DIR"
    npm run dev > "../$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "../$FRONTEND_PID_FILE"
    cd ..

    print_service "Frontend started with PID: $FRONTEND_PID"
    print_status "Waiting for frontend to initialize..."

    # Wait for frontend to start
    local wait_time=0
    while [ $wait_time -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -s http://localhost:$FRONTEND_PORT/ > /dev/null 2>&1; then
            print_success "Frontend is ready! 🎨"
            return 0
        fi
        sleep 2
        wait_time=$((wait_time + 2))
        echo -n "."
    done

    echo
    print_warning "Frontend may still be starting (Next.js takes longer)"
    print_status "Check frontend log: $FRONTEND_LOG"
    return 0
}

# Function to monitor services
monitor_services() {
    print_header "Monitoring Services"

    # Function to show service status
    show_service_status() {
        local service_name=$1
        local pid_file=$2
        local port=$3

        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if ps -p $pid > /dev/null 2>&1; then
                print_success "$service_name: Running (PID: $pid, Port: $port)"
            else
                print_error "$service_name: Process died"
                rm -f "$pid_file"
            fi
        else
            print_warning "$service_name: Not running"
        fi
    }

    while true; do
        clear
        print_header "High-Precision Contract Advisor RAG - Service Monitor"
        echo
        print_success "🌐 Application URLs:"
        echo "  Frontend: http://localhost:$FRONTEND_PORT"
        echo "  Backend:  http://127.0.0.1:$BACKEND_PORT"
        echo
        print_status "📊 Service Status:"
        echo
        show_service_status "Backend" "$BACKEND_PID_FILE" $BACKEND_PORT
        show_service_status "Frontend" "$FRONTEND_PID_FILE" $FRONTEND_PORT
        echo
        print_status "📝 Recent Logs (last 5 lines):"
        echo
        echo -e "${BLUE}Backend:${NC}"
        if [ -f "$BACKEND_LOG" ]; then
            tail -5 "$BACKEND_LOG" | sed 's/^/  /'
        fi
        echo
        echo -e "${BLUE}Frontend:${NC}"
        if [ -f "$FRONTEND_LOG" ]; then
            tail -5 "$FRONTEND_LOG" | sed 's/^/  /'
        fi
        echo
        print_status "Press Ctrl+C to stop all services"
        echo
        sleep 5
    done
}

# Function to stop services
stop_services() {
    print_header "Stopping Services"

    # Stop backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        local backend_pid=$(cat "$BACKEND_PID_FILE")
        if ps -p $backend_pid > /dev/null 2>&1; then
            print_service "Stopping backend (PID: $backend_pid)..."
            kill $backend_pid 2>/dev/null || true
            sleep 2
            if ps -p $backend_pid > /dev/null 2>&1; then
                print_warning "Force killing backend..."
                kill -9 $backend_pid 2>/dev/null || true
            fi
            print_success "Backend stopped"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi

    # Stop frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local frontend_pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p $frontend_pid > /dev/null 2>&1; then
            print_service "Stopping frontend (PID: $frontend_pid)..."
            kill $frontend_pid 2>/dev/null || true
            sleep 2
            if ps -p $frontend_pid > /dev/null 2>&1; then
                print_warning "Force killing frontend..."
                kill -9 $frontend_pid 2>/dev/null || true
            fi
            print_success "Frontend stopped"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi

    # Kill any remaining processes on ports
    print_status "Cleaning up any remaining processes..."
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

    print_success "All services stopped"
}

# Function to handle script interruption
cleanup() {
    echo
    print_warning "Received interrupt signal..."
    stop_services
    exit 0
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [option]"
    echo
    echo "Options:"
    echo "  start     Start all services (default)"
    echo "  stop      Stop all services"
    echo "  status    Show service status"
    echo "  restart   Restart all services"
    echo "  monitor   Start in monitor mode"
    echo "  help      Show this help message"
    echo
    echo "Examples:"
    echo "  $0            # Start all services"
    echo "  $0 start      # Start all services"
    echo "  $0 monitor    # Start with monitoring"
    echo "  $0 stop       # Stop all services"
}

# Function to show service status
show_status() {
    print_header "Service Status"

    if [ -f "$BACKEND_PID_FILE" ]; then
        local backend_pid=$(cat "$BACKEND_PID_FILE")
        if ps -p $backend_pid > /dev/null 2>&1; then
            print_success "Backend: Running (PID: $backend_pid)"
            echo "  URL: http://127.0.0.1:$BACKEND_PORT"
        else
            print_error "Backend: Not running (PID file exists but process dead)"
            rm -f "$BACKEND_PID_FILE"
        fi
    else
        print_warning "Backend: Not running"
    fi

    if [ -f "$FRONTEND_PID_FILE" ]; then
        local frontend_pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p $frontend_pid > /dev/null 2>&1; then
            print_success "Frontend: Running (PID: $frontend_pid)"
            echo "  URL: http://localhost:$FRONTEND_PORT"
        else
            print_error "Frontend: Not running (PID file exists but process dead)"
            rm -f "$FRONTEND_PID_FILE"
        fi
    else
        print_warning "Frontend: Not running"
    fi

    echo
    print_status "Port usage:"
    echo "  Backend port $BACKEND_PORT:"
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -Pi :$BACKEND_PORT -sTCP:LISTEN
    else
        echo "    Available"
    fi

    echo "  Frontend port $FRONTEND_PORT:"
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN
    else
        echo "    Available"
    fi
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution logic
case "${1:-start}" in
    "start")
        echo -e "${GREEN}=== High-Precision Contract Advisor RAG - Services Runner ===${NC}"
        echo
        check_virtual_environment
        check_environment_file
        setup_logging
        start_backend
        start_frontend
        echo
        print_header "🎉 All Services Started Successfully!"
        print_success "🌐 Access your application:"
        echo "  Frontend: http://localhost:$FRONTEND_PORT"
        echo "  Backend:  http://127.0.0.1:$BACKEND_PORT"
        echo
        print_status "📝 Logs:"
        echo "  Backend:  $BACKEND_LOG"
        echo "  Frontend: $FRONTEND_LOG"
        echo
        print_status "Press Ctrl+C to stop all services"
        echo
        monitor_services
        ;;
    "stop")
        stop_services
        ;;
    "status")
        show_status
        ;;
    "restart")
        print_status "Restarting all services..."
        stop_services
        sleep 2
        exec "$0" start
        ;;
    "monitor")
        monitor_services
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac