#!/bin/bash

# High-Precision Contract Advisor RAG - Virtual Environment Setup
# Automated script for consistent development environment setup

set -e  # Exit on any error

echo "🚀 Setting up High-Precision Contract Advisor RAG environment..."

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d" " -f2 | cut -d"." -f1-2)
MIN_VERSION="3.8"

if [ "$(printf '%s\n' "$MIN_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$MIN_VERSION" ]; then
    echo "❌ Python $MIN_VERSION or higher is required. You have $PYTHON_VERSION"
    exit 1
fi

echo "✓ Python version: $PYTHON_VERSION"

# Create virtual environment
if [ -d "venv" ]; then
    echo "⚠️ Virtual environment already exists. Remove it? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf venv
        echo "✓ Removed existing virtual environment"
    else
        echo "❌ Keeping existing virtual environment. Exiting."
        exit 1
    fi
fi

echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate
echo "✓ Virtual environment activated"

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Determine which requirements to install
if [ "$1" = "dev" ]; then
    echo "🔧 Installing development dependencies..."
    pip install -r requirements-dev.txt
    echo "✓ Development environment ready"
elif [ -f "requirements.minimal.txt" ]; then
    echo "⚡ Installing minimal production dependencies..."
    pip install -r requirements.minimal.txt
    echo "✓ Production environment ready with minimal dependencies"
else
    echo "⚠️ Installing full requirements (not recommended)..."
    pip install -r requirements.txt
    echo "✓ Full environment ready (consider using requirements.minimal.txt)"
fi

# Verify key packages
echo "🔍 Verifying installation..."
python -c "import flask; print('✓ Flask:', flask.__version__)"
python -c "import langchain; print('✓ LangChain:', langchain.__version__)"
python -c "import chromadb; print('✓ ChromaDB: Available')" 2>/dev/null || echo "⚠️ ChromaDB: Not available"
python -c "import ollama; print('✓ Ollama client: Available')" 2>/dev/null || echo "⚠️ Ollama client: Not available"

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Activate the environment: source venv/bin/activate"
echo "2. Start Ollama server: ollama serve"
echo "3. Pull the model: ollama pull nomic-embed-text:latest"
echo "4. Start backend: cd backend && python3 server.py"
echo "5. Start frontend: cd frontend && npm run dev"
echo ""
echo "📚 Documentation: README.md and docs/"

# Create activation script
cat > activate-env.sh << 'EOF'
#!/bin/bash
# Quick activation script for High-Precision Contract Advisor RAG
echo "🔧 Activating High-Precision Contract Advisor RAG environment..."
source venv/bin/activate
echo "✓ Environment activated"
echo "💡 Run 'deactivate' to exit the environment"
EOF

chmod +x activate-env.sh
echo "✓ Created activate-env.sh for quick activation"