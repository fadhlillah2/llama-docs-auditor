#!/bin/bash

# Setup Script for RAG Evaluation Framework
# This script installs dependencies and sets up the evaluation environment

set -e  # Exit on any error

echo "🚀 Setting up RAG Evaluation Framework..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    print_warning "Virtual environment not found. Creating..."
    python3 -m venv .venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source .venv/bin/activate

# Check Python version
python_version=$(python3 --version | cut -d' ' -f2)
print_status "Python version: $python_version"

# Install/update pip
print_status "Updating pip..."
pip install --upgrade pip

# Install evaluation dependencies
print_header "📦 Installing RAG Evaluation Dependencies..."

pip install ragas>=0.1.0
pip install datasets>=2.14.0

# Install testing and benchmarking dependencies
print_status "Installing testing and benchmarking dependencies..."
pip install psutil>=5.9.0
pip install matplotlib>=3.6.0

# Verify installations
print_header "🔍 Verifying Installations..."

# Check RAGAS
python3 -c "
try:
    import ragas
    print(f'✅ RAGAS version: {ragas.__version__}')
except ImportError as e:
    print(f'❌ RAGAS not available: {e}')
    exit(1)
"

# Check datasets
python3 -c "
try:
    import datasets
    print(f'✅ Datasets version: {datasets.__version__}')
except ImportError as e:
    print(f'❌ Datasets not available: {e}')
    exit(1)
"

# Check psutil
python3 -c "
try:
    import psutil
    print(f'✅ psutil version: {psutil.__version__}')
except ImportError as e:
    print(f'❌ psutil not available: {e}')
    exit(1)
"

# Check matplotlib
python3 -c "
try:
    import matplotlib
    print(f'✅ Matplotlib version: {matplotlib.__version__}')
except ImportError as e:
    print(f'❌ Matplotlib not available: {e}')
    exit(1)
"

# Create necessary directories
print_status "Creating evaluation directories..."
mkdir -p evaluation_results
mkdir -p logs
mkdir -p data/uploads_test
mkdir -p cache/evaluations

# Create sample test document if it doesn't exist
if [ ! -f "data/uploads_test/sample_contract.txt" ]; then
    print_status "Creating sample contract document..."
    cat > data/uploads_test/sample_contract.txt << 'EOF'
SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into on January 15, 2024,
between Tech Solutions Inc. ("Provider") and Global Client Corp ("Client").

1. SERVICES AND PAYMENT

1.1 Provider shall provide software development and consulting services
as described in Exhibit A.

1.2 Client shall pay Provider $75,000 per month for the services.
Payments shall be made within 45 days of invoice date.

1.3 Late payments shall accrue interest at 8% per annum.

2. TERM AND TERMINATION

2.1 This Agreement shall commence on February 1, 2024 and continue
for 24 months unless terminated earlier.

2.2 Either party may terminate this Agreement with 90 days written notice.

2.3 Either party may terminate immediately for material breach that
is not cured within 30 days of notice.

3. CONFIDENTIALITY

3.1 All confidential information shall be protected for 7 years
after termination of this Agreement.

4. LIABILITY

4.1 Provider's total liability shall not exceed the total fees paid
in the preceding 12 months.

4.2 Neither party shall be liable for consequential or punitive damages.

5. GOVERNING LAW

5.1 This Agreement shall be governed by the laws of New York.
Disputes shall be resolved in New York courts.

IN WITNESS WHEREOF, the parties have executed this Agreement.
EOF
fi

# Test the evaluation framework
print_header "🧪 Testing Evaluation Framework..."

python3 -c "
import sys
import os
sys.path.append('rag')

try:
    from evaluation.rag_evaluator import ContractQAEvaluator
    from evaluation.test_datasets import ContractTestDataset
    print('✅ Evaluation modules imported successfully')

    # Test dataset creation
    dataset = ContractTestDataset()
    print(f'✅ Test dataset created with {len(dataset.test_cases)} test cases')

    print('✅ Evaluation framework is ready!')

except Exception as e:
    print(f'❌ Evaluation framework test failed: {e}')
    import traceback
    traceback.print_exc()
    exit(1)
"

# Create evaluation configuration file
print_status "Creating evaluation configuration..."
cat > evaluation_config.json << 'EOF'
{
  "default_settings": {
    "num_questions": 10,
    "include_ragas": true,
    "benchmark_runs": 3,
    "timeout_seconds": 300,
    "output_dir": "evaluation_results"
  },
  "quick_test": {
    "num_questions": 3,
    "include_ragas": false,
    "benchmark_runs": 1
  },
  "comprehensive_evaluation": {
    "num_questions": 20,
    "include_ragas": true,
    "benchmark_runs": 5
  }
}
EOF

# Create usage instructions
print_status "Creating usage instructions..."
cat > EVALUATION_USAGE.md << 'EOF'
# RAG Evaluation Framework Usage Guide

## Quick Start

### 1. Quick Evaluation Test
```bash
python3 -m rag.evaluation.rag_evaluator data/uploads_test/sample_contract.txt
```

### 2. Run with Custom Questions
```bash
python3 -c "
from rag.evaluation.rag_evaluator import ContractQAEvaluator
evaluator = ContractQAEvaluator()
result = evaluator.evaluate_rag_pipeline(
    'data/uploads_test/sample_contract.txt',
    test_questions=[
        'What are the payment terms?',
        'When can this contract be terminated?',
        'What is the liability limitation?'
    ]
)
evaluator.print_evaluation_summary(result)
"
```

### 3. Performance Benchmarking
```bash
python3 tests/performance/benchmark_rag.py data/uploads_test/sample_contract.txt --questions 10 --concurrent 1
```

### 4. Automated Evaluation Pipeline
```bash
python3 tests/evaluation/automated_evaluation.py data/uploads_test/sample_contract.txt --questions 15
```

### 5. Generate Trend Analysis
```bash
python3 tests/evaluation/automated_evaluation.py data/uploads_test/sample_contract.txt --trends 30
```

## Test Suite

### Run All Tests
```bash
python3 backend/test_evaluation.py
```

### Run Integration Tests
```bash
python3 tests/evaluation/test_rag_integration.py
```

## Configuration

Edit `evaluation_config.json` to customize evaluation parameters.

## Output

Results are saved in:
- `evaluation_results/` - Main evaluation results
- `logs/` - Detailed logs
- `cache/evaluations/` - Cached evaluation data

## Troubleshooting

1. **Import Errors**: Make sure virtual environment is activated
   ```bash
   source .venv/bin/activate
   ```

2. **RAGAS Issues**: Install dependencies manually
   ```bash
   pip install ragas datasets
   ```

3. **Memory Issues**: Reduce number of questions in evaluation

4. **Timeout Issues**: Increase timeout in evaluation_config.json
EOF

print_header "✅ Setup Complete!"
echo ""
print_status "RAG Evaluation Framework is ready to use!"
echo ""
echo "📚 Next Steps:"
echo "1. Read EVALUATION_USAGE.md for usage instructions"
echo "2. Test with: python3 -m rag.evaluation.rag_evaluator data/uploads_test/sample_contract.txt"
echo "3. Run performance benchmarks with: python3 tests/performance/benchmark_rag.py data/uploads_test/sample_contract.txt"
echo ""
print_status "Happy evaluating! 🎯"