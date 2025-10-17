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
    # No Ollama service to stop - using Groq cloud inference
    # if [ ! -z "$OLLAMA_PID" ]; then
    #     kill $OLLAMA_PID 2>/dev/null || true
    #     print_status "Ollama stopped"
    # fi
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

# 1. Verify Groq API Configuration
print_status "Verifying Groq API configuration..."

# Check if .env file exists and has Groq API key
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please run './setup-project.sh' first."
    exit 1
fi

if ! grep -q "GROQ_API_KEY=gsk_" .env; then
    print_error "GROQ_API_KEY not configured in .env file."
    print_error "Please add your API key from https://console.groq.com/keys"
    exit 1
fi

# Test Groq API connection
source .env
if curl -s -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models > /dev/null 2>&1; then
    print_success "Groq API connection verified"
else
    print_warning "Could not verify Groq API connection. Please check your API key."
fi

print_success "Groq cloud LLM ready (no local setup needed)"

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
print_success "✅ Groq LLM:   Connected to cloud (fast responses)"
print_success "✅ Backend:    http://127.0.0.1:8081"
print_success "✅ Frontend:   http://localhost:3000"
echo ""
print_header "📖 How to Use:"
echo "1. Open your browser and go to: http://localhost:3000"
echo "2. Upload a contract document (PDF, TXT, DOCX)"
echo "3. Ask questions about your contract"
echo ""
print_success "⚡ Fast AI responses: 10-30 seconds (no local model loading)"
print_success "   Powered by Groq cloud inference"
echo ""
print_header "🛑 To Stop: Press Ctrl+C"
echo ""

# Keep script running and monitor services
print_status "Monitoring services... (Press Ctrl+C to stop all)"
while true; do
    # Check if services are still running
    # No Ollama service to check - using Groq cloud inference
    # if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    #     print_error "Ollama server stopped unexpectedly"
    #     break
    # fi
    
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