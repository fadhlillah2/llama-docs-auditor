#!/bin/bash

# High-Precision Contract Advisor RAG - Dependency Setup Script
# Optimized for Python 3.10 with EasyOCR support
# This script installs all dependencies from requirements-python310.txt

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PYTHON_VERSION="3.10"
VENV_NAME=".venv"
REQUIREMENTS_FILE="requirements-python310.txt"

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

# Function to check Python version
check_python_version() {
    print_status "Checking Python version..."

    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        print_error "Python is not installed. Please install Python 3.10 or higher."
        exit 1
    fi

    # Get Python version
    PY_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
    PY_MAJOR=$(echo $PY_VERSION | cut -d'.' -f1)
    PY_MINOR=$(echo $PY_VERSION | cut -d'.' -f2)

    print_status "Found Python $PY_VERSION"

    # Check if version is 3.10 or higher
    if [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -ge 10 ]; then
        print_success "Python version $PY_VERSION is compatible"
    else
        print_warning "Python 3.10+ recommended, found $PY_VERSION. Some dependencies may not work correctly."
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to check system dependencies
check_system_dependencies() {
    print_status "Checking system dependencies..."

    # Check for pip
    if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
        print_error "pip is not installed. Please install pip first."
        exit 1
    fi

    # Check for virtualenv
    if ! command -v virtualenv &> /dev/null && ! $PYTHON_CMD -m venv --help &> /dev/null; then
        print_error "virtualenv is not available. Please install python3-venv."
        exit 1
    fi

    # Check for git (required for some packages)
    if ! command -v git &> /dev/null; then
        print_warning "git is not installed. Some packages may require git."
    fi

    print_success "System dependencies check passed"
}

# Function to create virtual environment
create_virtual_environment() {
    print_status "Setting up Python virtual environment..."

    if [ -d "$VENV_NAME" ]; then
        print_warning "Virtual environment '$VENV_NAME' already exists."
        read -p "Do you want to recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Removing existing virtual environment..."
            rm -rf "$VENV_NAME"
        else
            print_status "Using existing virtual environment"
            return 0
        fi
    fi

    print_status "Creating virtual environment '$VENV_NAME'..."
    $PYTHON_CMD -m venv "$VENV_NAME"

    if [ $? -eq 0 ]; then
        print_success "Virtual environment created successfully"
    else
        print_error "Failed to create virtual environment"
        exit 1
    fi
}

# Function to activate virtual environment
activate_virtual_environment() {
    print_status "Activating virtual environment..."

    if [ -f "$VENV_NAME/bin/activate" ]; then
        source "$VENV_NAME/bin/activate"
        print_success "Virtual environment activated"
    else
        print_error "Virtual environment activation failed"
        exit 1
    fi
}

# Function to upgrade pip and install build tools
upgrade_pip_and_tools() {
    print_status "Upgrading pip and installing build tools..."

    # Upgrade pip
    pip install --upgrade pip setuptools wheel

    if [ $? -eq 0 ]; then
        print_success "pip and build tools upgraded"
    else
        print_error "Failed to upgrade pip"
        exit 1
    fi
}

# Function to install dependencies with progress tracking
install_dependencies() {
    print_status "Installing Python dependencies from $REQUIREMENTS_FILE..."

    if [ ! -f "$REQUIREMENTS_FILE" ]; then
        print_error "Requirements file '$REQUIREMENTS_FILE' not found!"
        exit 1
    fi

    # Install dependencies with verbose output
    pip install -r "$REQUIREMENTS_FILE" --verbose

    if [ $? -eq 0 ]; then
        print_success "All dependencies installed successfully"
    else
        print_error "Failed to install some dependencies"
        exit 1
    fi
}

# Function to verify critical installations
verify_installations() {
    print_status "Verifying critical installations..."

    # List of critical packages to verify
    local critical_packages=(
        "flask"
        "langchain"
        "easyocr"
        "torch"
        "transformers"
        "sentence-transformers"
        "chromadb"
        "ragas"
    )

    local failed_packages=()

    for package in "${critical_packages[@]}"; do
        if python3 -c "import $package" 2>/dev/null; then
            print_success "$package installed correctly"
        else
            print_error "$package installation failed"
            failed_packages+=("$package")
        fi
    done

    if [ ${#failed_packages[@]} -eq 0 ]; then
        print_success "All critical packages verified successfully"
    else
        print_error "The following packages failed to install: ${failed_packages[*]}"
        print_status "You may need to install these manually:"
        for pkg in "${failed_packages[@]}"; do
            echo "  pip install $pkg"
        done
        return 1
    fi
}

# Function to check GPU availability for PyTorch
check_gpu_support() {
    print_status "Checking GPU support for PyTorch..."

    python3 -c "
import torch
if torch.cuda.is_available():
    print(f'CUDA available: {torch.cuda.device_count()} device(s)')
    print(f'CUDA device: {torch.cuda.get_device_name(0)}')
elif torch.backends.mps.is_available():
    print('Apple Metal Performance Shaders (MPS) available')
else:
    print('GPU not available - using CPU mode (slower but functional)')
"

    print_success "GPU support check completed"
}

# Function to test EasyOCR installation
test_easyocr() {
    print_status "Testing EasyOCR installation..."

    python3 -c "
import easyocr
print(f'EasyOCR version: {easyocr.__version__}')

# Test reader initialization (this may take a moment)
try:
    reader = easyocr.Reader(['en', 'id'], gpu=False)
    print('EasyOCR reader initialized successfully for English and Indonesian')
    print('Note: GPU is disabled by default for compatibility')
except Exception as e:
    print(f'EasyOCR initialization test failed: {e}')
    print('You may need to run: easyocr download')
"

    if [ $? -eq 0 ]; then
        print_success "EasyOCR installation verified"
    else
        print_warning "EasyOCR test failed - you may need to download models manually"
        print_status "Run: easyocr download"
    fi
}

# Function to create project directories
create_project_directories() {
    print_status "Creating project directories..."

    local directories=(
        "data/uploads"
        "data/uploads_test"
        "data/chroma_db"
        "cache/embeddings"
        "cache/queries"
        "cache/evaluations"
        "logs/evaluation"
        "evaluation_results"
    )

    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done

    print_success "Project directories created"
}

# Function to generate .env file if not exists
setup_environment_file() {
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success ".env file created from .env.example"
            print_warning "Please edit .env file and add your GROQ_API_KEY"
        else
            print_status "Creating basic .env file..."
            cat > .env << EOF
# Flask Configuration
FLASK_ENV=development
FLASK_SECRET_KEY=your-secret-key-here-change-in-production
SERVER_PORT=8081

# Groq API Configuration (REQUIRED)
GROQ_API_KEY=gsk_your-actual-key-here
GROQ_MODEL_NAME=llama-3.3-70b-versatile

# EasyOCR Configuration
EASYOCR_GPU=false
EASYOCR_LANGUAGES=en,id

# Rate Limiting
RATE_LIMIT_UPLOADS=5 per 5 minutes
RATE_LIMIT_QUERIES=30 per minute
RATE_LIMIT_GENERAL=100 per minute

# File Upload
MAX_UPLOAD_SIZE=16777216

# Session Management
SESSION_TIMEOUT_MINUTES=30
MAX_CONCURRENT_SESSIONS=5
EOF
            print_success "Basic .env file created"
            print_warning "Please edit .env file and add your GROQ_API_KEY"
        fi
    else
        print_status ".env file already exists"
    fi
}

# Function to display final instructions
display_final_instructions() {
    print_success "Dependency setup completed successfully!"
    echo
    echo -e "${GREEN}=== Next Steps ===${NC}"
    echo
    echo "1. Activate virtual environment:"
    echo "   source $VENV_NAME/bin/activate"
    echo
    echo "2. Configure your environment:"
    echo "   - Edit .env file"
    echo "   - Add your GROQ_API_KEY (get from https://console.groq.com/keys)"
    echo
    echo "3. Start the application:"
    echo "   ./run-project.sh"
    echo
    echo "4. Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://127.0.0.1:8081"
    echo
    echo -e "${YELLOW}Important Notes:${NC}"
    echo "- Groq API key is REQUIRED for the application to work"
    echo "- EasyOCR models will be downloaded on first use (~500MB)"
    echo "- GPU support is disabled by default for compatibility"
    echo "- First query may take 10-30 seconds for initialization"
    echo
    echo -e "${BLUE}For troubleshooting, see CLAUDE.md or run:${NC}"
    echo "python3 -c 'import easyocr; print(easyocr.__version__)'"
}

# Function to handle script interruption
cleanup() {
    print_warning "Setup interrupted by user"
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution flow
main() {
    echo -e "${GREEN}=== High-Precision Contract Advisor RAG - Dependency Setup ===${NC}"
    echo -e "${GREEN}Python 3.10 with EasyOCR Support${NC}"
    echo

    # Execute setup steps
    check_python_version
    check_system_dependencies
    create_virtual_environment
    activate_virtual_environment
    upgrade_pip_and_tools
    install_dependencies
    verify_installations
    check_gpu_support
    test_easyocr
    create_project_directories
    setup_environment_file
    display_final_instructions
}

# Run main function
main "$@"