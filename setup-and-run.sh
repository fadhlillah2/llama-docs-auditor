#!/bin/bash

# =============================================================================
# HIGH-PRECISION CONTRACT ADVISOR RAG - COMPLETE SETUP & RUN SCRIPT
# =============================================================================
# Uses requirements-python310.txt for Python 3.10 compatible dependencies
# Ensures all functionality works including OCR, RAG, and AI features
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PYTHON_MIN_VERSION="3.10"
VENV_DIR=".venv"
REQUIREMENTS_FILE="requirements-python310.txt"
BACKEND_PORT="8081"
FRONTEND_PORT="3000"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
    echo -e "${PURPLE}==============================================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}==============================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

show_banner() {
    echo -e "${PURPLE}"
    echo "███████╗ ██████╗ ██╗   ██╗██████╗  ██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗"
    echo "██╔════╝██╔═══╗ ██║   ██║██╔══██╗██╔═══██╗████╗ ████║██║████╗  ██║██╔══██╗██║"
    echo "█████╗  ██║   ██║██║   ██║██████╔╝██║   ██║██╔████╔██║██║██╔██╗ ██║███████║██║"
    echo "██╔══╝  ██║   ██║██║   ██║██╔══██╗██║   ██║██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║"
    echo "██║     ╚██████╔╝╚██████╔╝██║  ██║╚██████╔╝██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗"
    echo "╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝"
    echo ""
    echo -e "${CYAN}🚀 HIGH-PRECISION CONTRACT ADVISOR RAG - SETUP & RUN${NC}"
    echo -e "${BLUE}📝 AI-Powered Contract Analysis with OCR Support${NC}"
    echo -e "${BLUE}🤖 Built with Python 3.10, LangChain, and Groq${NC}"
    echo -e "${NC}"
}

# =============================================================================
# SYSTEM CHECKS
# =============================================================================

check_system_requirements() {
    print_header "SYSTEM REQUIREMENTS CHECK"

    # Check Python
    print_step "Checking Python installation..."
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        print_error "Python not found! Please install Python 3.10+"
        print_info "Download from: https://www.python.org/downloads/"
        exit 1
    fi

    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
    print_info "Found Python version: $PYTHON_VERSION"

    # Check if version meets minimum requirement
    if $PYTHON_CMD -c "import sys; exit(0 if sys.version_info >= (3, 10) else 1)"; then
        print_success "Python version is compatible (3.10+)"
    else
        print_error "Python 3.10+ is required. Found: $PYTHON_VERSION"
        print_info "Please install Python 3.10+ from https://www.python.org/"
        exit 1
    fi

    # Check Node.js
    print_step "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"

        # Check if Node.js version is adequate (18+)
        NODE_MAJOR=$(node --version | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_success "Node.js version is compatible"
        else
            print_warning "Node.js 18+ recommended, found: $NODE_VERSION"
        fi
    else
        print_error "Node.js not found! Please install Node.js 18+"
        print_info "Download from: https://nodejs.org/"
        exit 1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm not found!"
        exit 1
    fi

    # Check system package manager
    print_step "Checking system package manager..."
    if command -v brew &> /dev/null; then
        PKG_MANAGER="brew"
        print_success "Homebrew found (macOS)"
    elif command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt-get"
        print_success "APT found (Debian/Ubuntu)"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        print_success "YUM found (CentOS/RHEL)"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        print_success "DNF found (Fedora)"
    else
        PKG_MANAGER="unknown"
        print_warning "No supported package manager found"
    fi
}

install_system_dependencies() {
    print_header "INSTALLING SYSTEM DEPENDENCIES"

    # Install Tesseract OCR
    print_step "Installing Tesseract OCR..."
    if command -v tesseract &> /dev/null; then
        TESSERACT_VERSION=$(tesseract --version 2>&1 | head -n 1)
        print_success "Tesseract OCR already installed: $TESSERACT_VERSION"
    else
        print_info "Installing Tesseract OCR..."
        case $PKG_MANAGER in
            "brew")
                brew install tesseract
                ;;
            "apt-get")
                sudo apt-get update
                sudo apt-get install -y tesseract-ocr
                ;;
            "yum"|"dnf")
                sudo yum install -y tesseract
                ;;
            *)
                print_warning "Cannot auto-install Tesseract. Please install manually:"
                print_info "  macOS: brew install tesseract"
                print_info "  Ubuntu: sudo apt-get install tesseract-ocr"
                print_info "  CentOS: sudo yum install tesseract"
                ;;
        esac
    fi

    # Verify Tesseract installation
    if command -v tesseract &> /dev/null; then
        TESSERACT_VERSION=$(tesseract --version 2>&1 | head -n 1)
        print_success "Tesseract OCR installed: $TESSERACT_VERSION"
    else
        print_warning "Tesseract OCR installation failed - OCR functionality will be limited"
    fi

    # Additional system tools
    print_step "Installing additional system tools..."
    case $PKG_MANAGER in
        "brew")
            # Install additional tools on macOS if needed
            if ! command -v gsed &> /dev/null; then
                brew install gnu-sed 2>/dev/null || true
            fi
            ;;
        "apt-get")
            sudo apt-get install -y build-essential curl wget git
            ;;
        "yum"|"dnf")
            sudo yum groupinstall -y "Development Tools"
            sudo yum install -y curl wget git
            ;;
    esac

    print_success "System dependencies installation completed"
}

# =============================================================================
# PYTHON ENVIRONMENT SETUP
# =============================================================================

setup_python_environment() {
    print_header "SETTING UP PYTHON ENVIRONMENT"

    # Create virtual environment
    if [ ! -d "$VENV_DIR" ]; then
        print_step "Creating Python virtual environment..."
        $PYTHON_CMD -m venv $VENV_DIR
        print_success "Virtual environment created: $VENV_DIR"
    else
        print_info "Virtual environment already exists: $VENV_DIR"
    fi

    # Activate virtual environment
    print_step "Activating virtual environment..."
    source $VENV_DIR/bin/activate

    # Upgrade pip and essential tools
    print_step "Upgrading pip and essential tools..."
    pip install --upgrade pip setuptools wheel

    # Verify Python in virtual environment
    PYTHON_VENV_VERSION=$(python --version 2>&1)
    print_success "Virtual environment activated: $PYTHON_VENV_VERSION"
}

install_python_dependencies() {
    print_header "INSTALLING PYTHON DEPENDENCIES"

    # Activate virtual environment
    source $VENV_DIR/bin/activate

    # Check if requirements file exists
    if [ ! -f "$REQUIREMENTS_FILE" ]; then
        print_error "Requirements file not found: $REQUIREMENTS_FILE"
        exit 1
    fi

    print_step "Installing dependencies from $REQUIREMENTS_FILE..."
    print_info "This may take 10-15 minutes on first installation..."

    # Install dependencies with error handling
    if pip install -r "$REQUIREMENTS_FILE"; then
        print_success "Python dependencies installed successfully"
    else
        print_error "Failed to install some dependencies"
        print_info "Attempting to install core dependencies manually..."

        # Fallback: Install core dependencies in phases
        print_step "Phase 1: Installing core Flask dependencies..."
        pip install flask>=3.1.0 flask-cors>=6.0.0 werkzeug>=3.1.0 python-dotenv>=1.1.0

        print_step "Phase 2: Installing LangChain dependencies..."
        pip install langchain>=0.3.20 langchain-community>=0.3.20 langchain-groq>=0.2.0

        print_step "Phase 3: Installing document processing..."
        pip install pypdf>=6.0.0 python-docx>=0.8.11 pdfplumber>=0.11.0 beautifulsoup4>=4.12.0

        print_step "Phase 4: Installing OCR dependencies..."
        pip install pytesseract>=0.3.10 pillow>=10.0.0 opencv-python>=4.10.0

        print_step "Phase 5: Installing EasyOCR..."
        pip install easyocr>=1.7.0

        print_step "Phase 6: Installing PyTorch (CPU version for EasyOCR)..."
        pip install torch>=2.0.0 torchvision>=0.15.0 --index-url https://download.pytorch.org/whl/cpu

        print_step "Phase 7: Installing Machine Learning dependencies..."
        pip install "numpy>=1.21.0,<2.0.0" scikit-learn>=1.5.0 transformers>=4.36.0

        print_step "Phase 8: Installing Vector Database..."
        pip install chromadb>=0.5.0

        print_step "Phase 9: Installing Evaluation Framework..."
        pip install ragas>=0.1.0 datasets>=2.14.0

        print_step "Phase 10: Installing Additional utilities..."
        pip install psutil>=5.9.0 matplotlib>=3.6.0 requests>=2.28.0

        print_success "Fallback installation completed"
    fi

    # Install sentence-transformers separately (often causes conflicts)
    print_step "Installing sentence-transformers..."
    pip install "sentence-transformers>=2.7.0" || print_warning "sentence-transformers installation failed"
}

verify_python_installation() {
    print_header "VERIFYING PYTHON INSTALLATION"

    # Activate virtual environment
    source $VENV_DIR/bin/activate

    # Test critical imports
    print_step "Testing critical Python imports..."

    python3 -c "
import sys
import importlib

critical_modules = {
    'flask': 'Flask web framework',
    'langchain': 'LangChain framework',
    'sklearn': 'Machine learning (scikit-learn)',
    'numpy': 'Numerical computing',
    'torch': 'PyTorch for EasyOCR',
    'easyocr': 'EasyOCR for text extraction',
    'cv2': 'OpenCV for image processing',
    'transformers': 'HuggingFace transformers',
    'chromadb': 'ChromaDB vector store',
    'ragas': 'RAG evaluation framework'
}

failed_modules = []
passed_modules = []

for module, description in critical_modules.items():
    try:
        importlib.import_module(module)
        print(f'✅ {module} - {description}')
        passed_modules.append(module)
    except ImportError as e:
        print(f'❌ {module} - {description}: {str(e)[:50]}...')
        failed_modules.append(module)

print(f'\\n📊 Installation Summary:')
print(f'✅ Passed: {len(passed_modules)}/{len(critical_modules)}')
print(f'❌ Failed: {len(failed_modules)}/{len(critical_modules)}')

if failed_modules:
    print(f'\\n⚠️  Failed modules: {', '.join(failed_modules)}')
    print('Some features may not work correctly')
else:
    print('\\n🎉 All critical modules imported successfully!')
"

    # Additional verification for key functionality
    print_step "Verifying key functionality..."

    # Test Flask
    if python -c "import flask; print('Flask OK')" 2>/dev/null; then
        print_success "Flask web framework working"
    else
        print_error "Flask not working - backend will fail"
    fi

    # Test LangChain
    if python -c "import langchain; print('LangChain OK')" 2>/dev/null; then
        print_success "LangChain framework working"
    else
        print_error "LangChain not working - RAG pipeline will fail"
    fi

    # Test OCR components
    if python -c "import pytesseract; print('Pytesseract OK')" 2>/dev/null; then
        print_success "Pytesseract OCR interface working"
    else
        print_warning "Pytesseract not working - OCR will fail"
    fi

    if python -c "import easyocr; print('EasyOCR OK')" 2>/dev/null; then
        print_success "EasyOCR library working"
    else
        print_warning "EasyOCR not working - image OCR will be limited"
    fi
}

# =============================================================================
# PROJECT SETUP
# =============================================================================

setup_project_directories() {
    print_header "SETTING UP PROJECT DIRECTORIES"

    # Create necessary directories
    directories=(
        "data/uploads"
        "data/uploads_test"
        "cache/embeddings"
        "cache/queries"
        "cache/evaluations"
        "logs"
        "logs/evaluation"
        "evaluation_results"
        "backend/uploads"
        "rag/uploads"
    )

    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        else
            print_info "Directory exists: $dir"
        fi
    done

    # Set permissions for uploads
    chmod 755 data/uploads backend/uploads rag/uploads 2>/dev/null || true

    print_success "Project directories created"
}

setup_environment_file() {
    print_header "SETTING UP ENVIRONMENT CONFIGURATION"

    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_step "Creating .env file from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success ".env file created from template"
        else
            print_warning ".env.example not found, creating basic .env file..."
            cat > .env << EOF
# =============================================================================
# HIGH-PRECISION CONTRACT ADVISOR RAG - ENVIRONMENT CONFIGURATION
# =============================================================================

# Flask Configuration
FLASK_ENV=development
SERVER_PORT=8081
FLASK_SECRET_KEY=dev-secret-key-change-in-production
DEBUG=True

# Groq API Configuration (REQUIRED for AI functionality)
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL_NAME=llama-3.3-70b-versatile

# OCR Configuration
TESSERACT_CMD=tesseract
ENABLE_OCR=true
EASYOCR_GPU=false

# Feature Flags
ENABLE_SESSION_MANAGEMENT=true
ENABLE_RATE_LIMITING=true
ENABLE_HYBRID_SEARCH=true
ENABLE_QUERY_CACHING=true
ENABLE_BATCH_PROCESSING=true
ENABLE_ASYNC_EMBEDDINGS=true
ENABLE_PERFORMANCE_MONITORING=true

# Usage Analytics (disabled in development)
ENABLE_USAGE_ANALYTICS=false
ENABLE_DEBUG_LOGGING=false
ENABLE_VERBOSE_ERRORS=false

# File Upload Configuration
MAX_UPLOAD_SIZE=16777216
ALLOWED_EXTENSIONS=pdf,docx,doc,txt,png,jpg,jpeg,tiff,bmp

# Session Configuration
SESSION_TIMEOUT_MINUTES=30
MAX_SESSIONS_PER_IP=5

# Rate Limiting
UPLOAD_RATE_LIMIT=5_per_5_minute
QUERY_RATE_LIMIT=30_per_minute
GENERAL_RATE_LIMIT=100_per_minute

# Vector Database Configuration
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
CHROMA_PERSIST_DIRECTORY=./data/chroma_db
CHROMA_COLLECTION_NAME=contract_documents

# Cache Configuration
EMBEDDING_CACHE_DIR=./cache/embeddings
QUERY_CACHE_DIR=./cache/queries
EVALUATION_CACHE_DIR=./cache/evaluations

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10485760
LOG_BACKUP_COUNT=5

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001

# Security Configuration
SSL_CERT_PATH=
SSL_KEY_PATH=
API_KEYS=
REQUIRE_AUTH=false

# Performance Configuration
MAX_WORKERS=4
REQUEST_TIMEOUT=300
CHUNK_SIZE=800
CHUNK_OVERLAP=100
MAX_TOKENS_PER_CHUNK=4000

# AI Configuration
DEFAULT_TEMPERATURE=0.1
DEFAULT_MAX_TOKENS=1024
CONTEXT_WINDOW_SIZE=8192

# EasyOCR Configuration
EASYOCR_LANGUAGES=en,id
EASYOCR_MODEL_SIZE=base
EASYOCR_CONFIDENCE_THRESHOLD=0.5

# Evaluation Configuration
ENABLE_EVALUATION_FRAMEWORK=true
RAGAS_METRICS=faithfulness,answer_relevancy,context_recall,context_precision
EVALUATION_OUTPUT_DIR=./evaluation_results
EOF
            print_success "Basic .env file created"
        fi
    else
        print_success ".env file already exists"
    fi

    # Check for Groq API key
    if grep -q "your-groq-api-key-here" .env; then
        print_warning "⚠️  IMPORTANT: Please update your GROQ_API_KEY in .env file"
        print_info "Get your API key from: https://console.groq.com/keys"
        print_info "Edit .env file and replace 'your-groq-api-key-here' with your actual key"
    else
        if grep -q "gsk_" .env; then
            print_success "Groq API key appears to be configured"
        else
            print_warning "Groq API key not found in .env file"
        fi
    fi
}

setup_frontend_dependencies() {
    print_header "SETTING UP FRONTEND DEPENDENCIES"

    # Check if we're in the right directory
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found!"
        return 1
    fi

    cd frontend

    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in frontend directory!"
        cd ..
        return 1
    fi

    # Install npm dependencies
    print_step "Installing frontend npm dependencies..."
    if npm install; then
        print_success "Frontend dependencies installed successfully"
    else
        print_error "Failed to install frontend dependencies"
        cd ..
        return 1
    fi

    # Verify key frontend packages
    print_step "Verifying frontend packages..."
    key_packages=("next" "react" "react-dom" "typescript" "tailwindcss")

    for package in "${key_packages[@]}"; do
        if [ -d "node_modules/$package" ]; then
            print_success "✓ $package"
        else
            print_warning "✗ $package (may affect functionality)"
        fi
    done

    cd ..
    print_success "Frontend setup completed"
}

# =============================================================================
# APPLICATION LAUNCH
# =============================================================================

stop_existing_services() {
    print_header "STOPPING EXISTING SERVICES"

    # Kill existing Python processes
    print_step "Stopping existing backend processes..."
    pkill -f "python.*server.py" 2>/dev/null || true
    pkill -f "python.*app.py" 2>/dev/null || true

    # Kill existing Node.js processes
    print_step "Stopping existing frontend processes..."
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "next.*dev" 2>/dev/null || true

    # Kill processes on specific ports
    print_step "Cleaning up ports..."
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true

    # Clean up PID files
    rm -f .backend.pid .frontend.pid

    print_success "Existing services stopped"
}

start_backend_server() {
    print_header "STARTING BACKEND SERVER"

    # Activate virtual environment
    source $VENV_DIR/bin/activate

    # Change to backend directory
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found!"
        return 1
    fi

    cd backend

    # Create log directory if it doesn't exist
    mkdir -p ../logs

    # Start backend server
    print_step "Starting Flask backend server..."
    python server.py > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../.backend.pid

    cd ..

    # Wait for backend to start
    print_step "Waiting for backend to initialize..."
    sleep 8

    # Test backend health
    max_attempts=10
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://127.0.0.1:$BACKEND_PORT/ > /dev/null 2>&1; then
            print_success "Backend server started successfully!"
            print_info "Backend URL: http://127.0.0.1:$BACKEND_PORT"
            print_info "Backend PID: $BACKEND_PID"
            return 0
        else
            print_info "Attempt $attempt/$max_attempts: Backend not ready yet..."
            sleep 3
            attempt=$((attempt + 1))
        fi
    done

    print_error "Backend server failed to start"
    print_info "Check logs/backend.log for details:"
    print_info "tail -f logs/backend.log"
    return 1
}

start_frontend_server() {
    print_header "STARTING FRONTEND SERVER"

    # Change to frontend directory
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found!"
        return 1
    fi

    cd frontend

    # Create log directory if it doesn't exist
    mkdir -p ../logs

    # Start frontend server
    print_step "Starting Next.js frontend server..."
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../.frontend.pid

    cd ..

    # Wait for frontend to start
    print_step "Waiting for frontend to initialize..."
    sleep 12

    # Test frontend on different ports
    FRONTEND_URL=""
    if curl -s -I http://localhost:$FRONTEND_PORT/ > /dev/null 2>&1; then
        FRONTEND_URL="http://localhost:$FRONTEND_PORT"
    elif curl -s -I http://localhost:3001/ > /dev/null 2>&1; then
        FRONTEND_URL="http://localhost:3001"
        FRONTEND_PORT="3001"
    fi

    if [ -n "$FRONTEND_URL" ]; then
        print_success "Frontend server started successfully!"
        print_info "Frontend URL: $FRONTEND_URL"
        print_info "Frontend PID: $FRONTEND_PID"
        return 0
    else
        print_error "Frontend server failed to start"
        print_info "Check logs/frontend.log for details:"
        print_info "tail -f logs/frontend.log"
        return 1
    fi
}

verify_application_startup() {
    print_header "VERIFYING APPLICATION STARTUP"

    # Test Backend API
    print_step "Testing Backend API..."
    if curl -s http://127.0.0.1:$BACKEND_PORT/ > /dev/null; then
        BACKEND_RESPONSE=$(curl -s http://127.0.0.1:$BACKEND_PORT/)
        print_success "Backend API responding: $BACKEND_RESPONSE"
    else
        print_error "Backend API not responding"
        return 1
    fi

    # Test Frontend
    print_step "Testing Frontend..."
    if [ -n "$FRONTEND_URL" ]; then
        FRONTEND_STATUS=$(curl -s -I "$FRONTEND_URL/" | head -n 1)
        print_success "Frontend responding: $FRONTEND_STATUS"
    else
        print_error "Frontend not responding"
        return 1
    fi

    # Test additional endpoints
    print_step "Testing additional endpoints..."

    # Test features endpoint
    if curl -s http://127.0.0.1:$BACKEND_PORT/features > /dev/null; then
        print_success "Features endpoint working"
    else
        print_warning "Features endpoint not responding"
    fi

    print_success "Application startup verification completed"
}

show_application_status() {
    print_header "APPLICATION STATUS"

    echo -e "${BLUE}🔧 Backend Server:${NC}"
    if curl -s http://127.0.0.1:$BACKEND_PORT/ > /dev/null; then
        echo -e "  Status: ${GREEN}Running${NC}"
        echo -e "  URL: ${CYAN}http://127.0.0.1:$BACKEND_PORT${NC}"
        if [ -f .backend.pid ]; then
            echo -e "  PID: $(cat .backend.pid)"
        fi
    else
        echo -e "  Status: ${RED}Not Running${NC}"
    fi

    echo -e "\n${BLUE}🌐 Frontend Server:${NC}"
    if [ -n "$FRONTEND_URL" ]; then
        echo -e "  Status: ${GREEN}Running${NC}"
        echo -e "  URL: ${CYAN}$FRONTEND_URL${NC}"
        if [ -f .frontend.pid ]; then
            echo -e "  PID: $(cat .frontend.pid)"
        fi
    else
        echo -e "  Status: ${RED}Not Running${NC}"
    fi

    echo -e "\n${BLUE}📚 Available Features:${NC}"
    echo -e "  • 📄 Document upload (PDF, DOCX, TXT, Images)"
    echo -e "  • 🤖 AI-powered contract analysis"
    echo -e "  • 🔍 OCR text extraction from images"
    echo -e "  • 💬 Interactive Q&A with documents"
    echo -e "  • 📊 Document analytics and insights"
    echo -e "  • 🇮🇩 Indonesian language support"

    echo -e "\n${BLUE}🛠️  Available API Endpoints:${NC}"
    echo -e "  • ${CYAN}POST${NC} /upload_file - Upload document"
    echo -e "  • ${CYAN}POST${NC} /ask_ai - Query document with AI"
    echo -e "  • ${CYAN}GET${NC} /session/info - Session information"
    echo -e "  • ${CYAN}GET${NC} /features - Feature flags"
    echo -e "  • ${CYAN}GET${NC} /config - Configuration info"

    echo -e "\n${BLUE}📁 Important Files:${NC}"
    echo -e "  • .env - Environment configuration"
    echo -e "  • logs/backend.log - Backend logs"
    echo -e "  • logs/frontend.log - Frontend logs"
    echo -e "  • $REQUIREMENTS_FILE - Python dependencies"

    if grep -q "your-groq-api-key-here" .env; then
        echo -e "\n${RED}⚠️  WARNING: Groq API key not configured!${NC}"
        echo -e "${YELLOW}Edit .env file and add your GROQ_API_KEY${NC}"
        echo -e "${YELLOW}Get API key from: https://console.groq.com/keys${NC}"
    fi
}

# =============================================================================
# MAIN COMMAND HANDLING
# =============================================================================

show_usage() {
    echo -e "${PURPLE}HIGH-PRECISION CONTRACT ADVISOR RAG - SETUP & RUN SCRIPT${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup          Complete setup (recommended for first time)"
    echo "  install        Install dependencies only"
    echo "  start          Start services only"
    echo "  stop           Stop services"
    echo "  restart        Restart services"
    echo "  status         Show service status"
    echo "  verify         Verify installation"
    echo "  logs           Show application logs"
    echo "  help           Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 setup       # Complete first-time setup and run"
    echo "  $0 start       # Start services (after setup)"
    echo "  $0 status      # Check current status"
    echo "  $0 stop        # Stop all services"
    echo ""
    echo "Requirements:"
    echo "  • Python 3.10+"
    echo "  • Node.js 18+"
    echo "  • Groq API Key (for AI functionality)"
    echo "  • Tesseract OCR (for image processing)"
    echo ""
}

show_logs() {
    print_header "APPLICATION LOGS"

    if [ -f "logs/backend.log" ]; then
        echo -e "${BLUE}📋 Backend Logs (last 20 lines):${NC}"
        echo -e "${YELLOW}----------------------------------------${NC}"
        tail -n 20 logs/backend.log
        echo ""
    else
        print_warning "Backend logs not found"
    fi

    if [ -f "logs/frontend.log" ]; then
        echo -e "${BLUE}📋 Frontend Logs (last 20 lines):${NC}"
        echo -e "${YELLOW}----------------------------------------${NC}"
        tail -n 20 logs/frontend.log
    else
        print_warning "Frontend logs not found"
    fi

    echo -e "\n${BLUE}📋 To follow logs in real-time:${NC}"
    echo -e "${CYAN}  Backend: tail -f logs/backend.log${NC}"
    echo -e "${CYAN}  Frontend: tail -f logs/frontend.log${NC}"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    show_banner

    case "${1:-setup}" in
        "setup")
            print_header "COMPLETE SETUP AND LAUNCH"
            check_system_requirements
            install_system_dependencies
            setup_python_environment
            install_python_dependencies
            verify_python_installation
            setup_project_directories
            setup_environment_file
            setup_frontend_dependencies
            stop_existing_services
            if start_backend_server && start_frontend_server; then
                verify_application_startup
                show_application_status
                print_header "🎉 SETUP COMPLETED SUCCESSFULLY!"
                print_success "Your Contract Advisor RAG application is now running!"
                print_info "Frontend: $FRONTEND_URL"
                print_info "Backend: http://127.0.0.1:$BACKEND_PORT"

                if grep -q "your-groq-api-key-here" .env; then
                    print_warning "Remember to configure your GROQ_API_KEY in .env file"
                    print_info "Get your API key from: https://console.groq.com/keys"
                fi
            else
                print_error "Failed to start application"
                exit 1
            fi
            ;;
        "install")
            print_header "DEPENDENCIES INSTALLATION"
            check_system_requirements
            install_system_dependencies
            setup_python_environment
            install_python_dependencies
            verify_python_installation
            setup_project_directories
            setup_environment_file
            setup_frontend_dependencies
            print_success "Installation completed! Run '$0 start' to launch the application."
            ;;
        "start")
            print_header "STARTING APPLICATION SERVICES"
            setup_python_environment
            stop_existing_services
            if start_backend_server && start_frontend_server; then
                verify_application_startup
                show_application_status
            else
                print_error "Failed to start application"
                exit 1
            fi
            ;;
        "stop")
            print_header "STOPPING APPLICATION SERVICES"
            stop_existing_services
            print_success "All services stopped"
            ;;
        "restart")
            print_header "RESTARTING APPLICATION SERVICES"
            stop_existing_services
            sleep 3
            setup_python_environment
            if start_backend_server && start_frontend_server; then
                verify_application_startup
                show_application_status
            else
                print_error "Failed to restart application"
                exit 1
            fi
            ;;
        "status")
            show_application_status
            ;;
        "verify")
            print_header "INSTALLATION VERIFICATION"
            setup_python_environment
            verify_python_installation
            ;;
        "logs")
            show_logs
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Trap Ctrl+C and cleanup
trap 'print_info "\nSetup interrupted. Cleaning up..."; stop_existing_services; exit 1' INT

# Run main function
main "$@"