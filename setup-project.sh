#!/bin/bash

# High-Precision Contract Advisor RAG - Automated Setup Script
# This script sets up the entire project based on tested configurations

set -e  # Exit on any error

echo "🚀 High-Precision Contract Advisor RAG - Automated Setup"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 1. Check Prerequisites
print_status "Checking prerequisites..."

# Check Python 3
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed. Please install Python 3.8+ first."
    exit 1
fi
print_success "Python 3 found: $(python3 --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed. Please install Node.js 18+ first."
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed."
    exit 1
fi
print_success "npm found: $(npm --version)"

# 2. Check/Install Ollama
print_status "Checking Ollama installation..."
if ! command -v ollama &> /dev/null; then
    print_warning "Ollama not found. Please install Ollama first:"
    echo ""
    echo "  macOS:   brew install ollama"
    echo "  Linux:   curl -fsSL https://ollama.ai/install.sh | sh"
    echo "  Other:   Download from https://ollama.ai"
    echo ""
    print_error "Please install Ollama and run this script again."
    exit 1
fi
print_success "Ollama found: $(ollama --version 2>/dev/null | head -1)"

# 3. Setup Python Environment
print_status "Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    print_success "Created virtual environment: .venv"
else
    print_success "Virtual environment already exists: .venv"
fi

# Activate virtual environment
source .venv/bin/activate
print_success "Activated virtual environment"

# 4. Install Python Dependencies
print_status "Installing Python dependencies (this may take a few minutes)..."
pip install --upgrade pip
pip install -r requirements-working.txt
print_success "Python dependencies installed successfully"

# 5. Install Frontend Dependencies
print_status "Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi
cd ..

# 6. Start Ollama and Pull Models
print_status "Starting Ollama and pulling required models..."

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    print_warning "Ollama server not running. Starting Ollama in background..."
    ollama serve &
    OLLAMA_PID=$!
    
    # Wait for Ollama to start
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
        print_error "Failed to start Ollama server"
        exit 1
    fi
    print_success "Ollama server started"
else
    print_success "Ollama server is already running"
fi

# Pull required models
print_status "Pulling Ollama models (this may take several minutes)..."

# Pull the main model (llama3.2:3b-instruct-q4_0)
if ! ollama list | grep -q "llama3.2:3b-instruct-q4_0"; then
    print_status "Pulling llama3.2:3b-instruct-q4_0 model..."
    ollama pull llama3.2:3b-instruct-q4_0
    print_success "llama3.2:3b-instruct-q4_0 model downloaded"
else
    print_success "llama3.2:3b-instruct-q4_0 model already available"
fi

# Pull the embedding model (nomic-embed-text)
if ! ollama list | grep -q "nomic-embed-text:latest"; then
    print_status "Pulling nomic-embed-text:latest model..."
    ollama pull nomic-embed-text:latest
    print_success "nomic-embed-text:latest model downloaded"
else
    print_success "nomic-embed-text:latest model already available"
fi

# 7. Create data directories
print_status "Creating data directories..."
mkdir -p data/uploads
mkdir -p data/chroma_db
print_success "Data directories created"

# 8. Setup Complete
echo ""
echo "🎉 Setup Complete!"
echo "==================="
echo ""
print_success "All dependencies installed and configured"
print_success "Ollama models downloaded and ready"
print_success "Project ready to run"
echo ""
echo "Next steps:"
echo "1. Run the project:    ./run-project.sh"
echo "2. Access frontend:    http://localhost:3000"
echo "3. Backend API:        http://127.0.0.1:8081"
echo ""
print_warning "Note: First AI query will take 3-5 minutes as the model loads"

# Keep Ollama running if we started it
if [ ! -z "$OLLAMA_PID" ]; then
    print_status "Ollama server will continue running in background (PID: $OLLAMA_PID)"
fi