#!/bin/bash

# High-Precision Contract Advisor RAG - Run Script
# Starts all services in the correct order

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}$1${NC}"
}

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

# Function to cleanup background processes on exit
cleanup() {
    print_status "Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_status "Backend stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_status "Frontend stopped"
    fi
    if [ ! -z "$OLLAMA_PID" ]; then
        kill $OLLAMA_PID 2>/dev/null || true
        print_status "Ollama stopped"
    fi
    echo ""
    print_success "All services stopped gracefully"
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

print_header "🚀 High-Precision Contract Advisor RAG"
print_header "====================================="

# Check if setup has been run
if [ ! -d ".venv" ] || [ ! -f "requirements-working.txt" ]; then
    print_error "Project not set up. Please run './setup-project.sh' first."
    exit 1
fi

# Check if virtual environment has dependencies
source .venv/bin/activate
if ! python -c "import flask" 2>/dev/null; then
    print_error "Dependencies not installed. Please run './setup-project.sh' first."
    exit 1
fi

# 1. Start Ollama Server
print_status "Starting Ollama server..."
if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    ollama serve &
    OLLAMA_PID=$!
    
    # Wait for Ollama to start (max 30 seconds)
    print_status "Waiting for Ollama to start..."
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
    
    if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
        print_error "Failed to start Ollama server after 30 seconds"
        exit 1
    fi
    print_success "Ollama server started (PID: $OLLAMA_PID)"
else
    print_success "Ollama server already running"
fi

# Verify models are available
if ! ollama list | grep -q "llama3.2:3b-instruct-q4_0"; then
    print_warning "llama3.2:3b-instruct-q4_0 model not found. Pulling now..."
    ollama pull llama3.2:3b-instruct-q4_0
fi

if ! ollama list | grep -q "nomic-embed-text:latest"; then
    print_warning "nomic-embed-text:latest model not found. Pulling now..."  
    ollama pull nomic-embed-text:latest
fi

print_success "Ollama models ready"

# 2. Start Backend Server
print_status "Starting backend server..."
cd backend
python3 server.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
print_status "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8081/ > /dev/null 2>&1; then
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

if ! curl -s http://127.0.0.1:8081/ > /dev/null 2>&1; then
    print_error "Backend server failed to start after 30 seconds"
    exit 1
fi
print_success "Backend server started (PID: $BACKEND_PID) - http://127.0.0.1:8081"

# 3. Start Frontend Server
print_status "Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
print_status "Waiting for frontend to start..."
for i in {1..60}; do  # Frontend takes longer to start
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_error "Frontend server failed to start after 60 seconds"
    exit 1
fi
print_success "Frontend server started (PID: $FRONTEND_PID) - http://localhost:3000"

# Display status and instructions
echo ""
print_header "🎉 All Services Running Successfully!"
print_header "====================================="
echo ""
print_success "✅ Ollama:   Running with llama3.2:3b-instruct-q4_0 and nomic-embed-text:latest models"
print_success "✅ Backend:  http://127.0.0.1:8081"
print_success "✅ Frontend: http://localhost:3000"
echo ""
print_header "📖 How to Use:"
echo "1. Open your browser and go to: http://localhost:3000"
echo "2. Upload a contract document (PDF, TXT, DOCX)"
echo "3. Ask questions about your contract"
echo ""
print_warning "⏰ Important: First AI query takes 3-5 minutes as model loads"
print_warning "   Subsequent queries will be much faster!"
echo ""
print_header "🛑 To Stop: Press Ctrl+C"
echo ""

# Keep script running and monitor services
print_status "Monitoring services... (Press Ctrl+C to stop all)"
while true; do
    # Check if services are still running
    if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
        print_error "Ollama server stopped unexpectedly"
        break
    fi
    
    if ! curl -s http://127.0.0.1:8081/ > /dev/null 2>&1; then
        print_error "Backend server stopped unexpectedly"
        break
    fi
    
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_error "Frontend server stopped unexpectedly"
        break
    fi
    
    sleep 5
done