#!/bin/bash

# High-Precision Contract Advisor RAG - Python Code Formatting Script
# Automated script for consistent Python code style

set -e  # Exit on any error

echo "🐍 Python Code Formatting with Black, isort, and flake8..."

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️ No virtual environment detected. Activating venv..."
    if [ -d "venv" ]; then
        source venv/bin/activate
        echo "✓ Virtual environment activated"
    else
        echo "❌ Virtual environment not found. Run setup-venv.sh first."
        exit 1
    fi
fi

# Check if development dependencies are installed
if ! python -c "import black" 2>/dev/null; then
    echo "🔧 Installing development dependencies..."
    pip install -r requirements-dev.txt
fi

# Python directories to format
PYTHON_DIRS=("backend" "rag")

echo "📁 Formatting Python code in: ${PYTHON_DIRS[*]}"

# Format with Black
echo "🖤 Running Black formatter..."
for dir in "${PYTHON_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        black "$dir"
        echo "✓ Black formatting completed for $dir"
    else
        echo "⚠️ Directory $dir not found, skipping"
    fi
done

# Sort imports with isort
echo "📦 Running isort for import sorting..."
for dir in "${PYTHON_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        isort "$dir"
        echo "✓ Import sorting completed for $dir"
    fi
done

# Check code style with flake8
echo "🔍 Running flake8 style checker..."
for dir in "${PYTHON_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        if flake8 "$dir"; then
            echo "✓ flake8 checks passed for $dir"
        else
            echo "⚠️ flake8 found style issues in $dir"
        fi
    fi
done

# Run mypy type checking
echo "🔬 Running mypy type checker..."
for dir in "${PYTHON_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        if mypy "$dir" 2>/dev/null; then
            echo "✓ mypy type checks passed for $dir"
        else
            echo "⚠️ mypy found type issues in $dir (this is normal for the current codebase)"
        fi
    fi
done

echo ""
echo "🎉 Python code formatting completed!"
echo ""
echo "📋 Summary:"
echo "- Black: Formatted code to PEP 8 standards"
echo "- isort: Sorted imports for consistency"
echo "- flake8: Checked code style"
echo "- mypy: Performed type checking"
echo ""
echo "💡 To run individual tools:"
echo "black backend/ rag/"
echo "isort backend/ rag/"
echo "flake8 backend/ rag/"
echo "mypy backend/ rag/"