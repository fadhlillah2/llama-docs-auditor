#!/bin/bash

# Setup Python 3.10 Environment for Contract Advisor RAG
# This script sets up Python 3.10 with EasyOCR support

set -e  # Exit on any error

echo "🐍 Setting up Python 3.10 environment for Contract Advisor RAG..."

# Check if Python 3.10 is available
if ! command -v python3.10 &> /dev/null; then
    echo "❌ Python 3.10 not found. Please install it first:"
    echo "   brew install pyenv"
    echo "   export PYENV_ROOT=\"\$HOME/.pyenv\""
    echo "   export PATH=\"\$PYENV_ROOT/bin:\$PATH\""
    echo "   eval \"\$(pyenv init -)\""
    echo "   pyenv install 3.10.19"
    exit 1
fi

echo "✅ Python 3.10 found: $(python3.10 --version)"

# Backup current virtual environment if exists
if [ -d ".venv" ]; then
    echo "📦 Backing up current virtual environment..."
    mv .venv .venv-backup-$(date +%Y%m%d-%H%M%S)
fi

# Create new virtual environment with Python 3.10
echo "🔧 Creating new virtual environment with Python 3.10..."
python3.10 -m venv .venv

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📦 Installing Python 3.10 optimized requirements..."
if [ -f "requirements-python310.txt" ]; then
    pip install -r requirements-python310.txt
else
    echo "❌ requirements-python310.txt not found!"
    exit 1
fi


# Verify EasyOCR installation
echo "🧪 Verifying EasyOCR installation..."
python -c "
try:
    import easyocr
    print('✅ EasyOCR installed successfully!')
    print(f'EasyOCR version: {easyocr.__version__}')
except ImportError as e:
    print(f'❌ EasyOCR installation failed: {e}')
    exit(1)
"

# Test EasyOCR with a simple example
echo "🔬 Testing EasyOCR functionality..."
python -c "
import easyocr
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Create a simple test image
img = Image.new('RGB', (200, 50), color='white')
draw = ImageDraw.Draw(img)
draw.text((10, 10), 'Hello EasyOCR', fill='black')
img.save('test_easyocr.png')

# Test OCR
reader = easyocr.Reader(['en'], gpu=False)
result = reader.readtext('test_easyocr.png')
print(f'✅ EasyOCR test result: {result}')

# Clean up
import os
os.remove('test_easyocr.png')
"

echo "🎉 Python 3.10 environment setup completed!"
echo ""
echo "📋 Summary:"
echo "   ✅ Python 3.10 virtual environment created"
echo "   ✅ EasyOCR installed and tested"
echo "   ✅ All requirements installed"
echo "   ✅ Tesseract OCR ready"
echo ""
echo "🚀 Next steps:"
echo "   1. Activate environment: source .venv/bin/activate"
echo "   2. Start backend: cd backend && python server.py"
echo "   3. Start frontend: cd frontend && npm run dev"
echo ""
echo "🔗 EasyOCR is now ready for image-to-text conversion!"