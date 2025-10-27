# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Guide

### 🚀 One-Command Setup & Run
```bash
# 1. Setup everything (one time only)
./setup-project.sh

# 2. Run the project (starts all services)
./run-project.sh
```

### 📋 Prerequisites
- **Python 3.8+**
- **Node.js 18+**
- **Groq API Key** - Get from https://console.groq.com/keys (REQUIRED)
  - Add to .env file: `GROQ_API_KEY=gsk_your-actual-key`
  - This is the primary LLM provider - Ollama is deprecated
- **Ollama** (deprecated, optional fallback only) - Install from [ollama.ai](https://ollama.ai)
  - macOS: `brew install ollama`
  - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`
  - Only used if Groq API is unavailable

### 🎯 Access Points
- **Frontend**: http://localhost:3000
- **Backend**: http://127.0.0.1:8081
- **Groq API**: https://api.groq.com/openai/v1

## Project Overview

High-Precision Contract Advisor RAG is an AI-powered contract analysis system using Retrieval-Augmented Generation (RAG) technology. Upload contracts and ask questions to get intelligent responses based on the actual document content.

## Architecture

### Three-Tier Stack

**Backend (Flask + Python)**
- `backend/server.py` (61KB) - Flask API server with 3 endpoints, session management, rate limiting
- `backend/config.py` - Environment-based configuration (Development/Production/Testing)
- `backend/session_manager.py` - Global state management for conversation sessions

**RAG Pipeline (LangChain Orchestration)**
- `rag/rag_pipeline.py` - Main orchestrator with retry logic (3 attempts, exponential backoff)
- `rag/data_loader.py` - Parses PDF, DOCX, TXT with PyPDF, python-docx, pdfplumber
- `rag/chunk_documents.py` - Text splitting into 800-char chunks with 100-char overlap
- `rag/embedding.py` - Vector embeddings via HuggingFace `sentence-transformers/all-MiniLM-L6-v2`
- `rag/retriever.py` - ChromaDB vector store with persistent caching (1000+ embeddings)
- `rag/chat_model.py` - Groq LLM integration with 300s timeout (primary) + Ollama fallback (deprecated)
- `rag/conversation_chain.py` - LangChain retrieval QA chain with prompt templating
- **Primary LLM**: Groq cloud inference (llama-3.3-70b-versatile) - fast, high-quality responses
- **Fallback LLM**: Ollama local models (deprecated) - only used if Groq unavailable

**Frontend (Next.js + React)**
- `frontend/src/pages/index.tsx` - Main layout with Upload and Chat components
- 30+ React components (TypeScript, strict mode): DocumentManager, Chat, MobileChat, EnhancedErrorDisplay, ContextualHelpSystem, KeyboardShortcutsHint, QuickActionsMenu, OnboardingTour, DocumentAnalyticsDashboard, etc.
- Advanced features: Mobile-responsive chat, Keyboard shortcuts (Ctrl+K, Ctrl+/), Contextual help system, Onboarding tours, Document analytics, Enhanced error handling
- Tailwind CSS styling with Ionic React (v7.8.0) and Framer Motion animations
- Axios HTTP client for API calls with comprehensive error handling
- Pre-commit hooks with Husky and lint-staged for code quality enforcement

### Data Flow
```
1. Upload (POST /upload_file)
   ↓
2. LoadDocuments → ChunkDocuments (800 chars) → CreateEmbeddings (HuggingFace)
   ↓
3. Setup Retriever (ChromaDB) → Initialize ChatModel (Groq) → Create QA Chain
   ↓
4. Query (POST /ask_ai with chat history)
   ↓
5. Retrieve relevant chunks → Generate response via Groq LLM (fast, cloud inference)
   ↓
6. Return response with metadata (sources, confidence scores)
```

### Performance Characteristics
- **First query**: 10-30 seconds (Groq cloud inference, API initialization)
- **Subsequent queries**: 5-15 seconds (cached embeddings, established session)
- **Document processing**: ~1 chunk per second (800-char chunks with overlap)
- **Embedding generation**: HuggingFace local models (fast, persistent caching)
- **Concurrent sessions**: 5 sessions max per IP (configurable via environment)

## Development Commands

### Setup & Deployment
```bash
# Full automated setup (validates prerequisites, installs deps, downloads models)
./setup-project.sh

# Start all services (Ollama → Backend → Frontend with health checks)
./run-project.sh
```

### Backend Development
```bash
# Activate virtual environment (critical!)
source .venv/bin/activate

# Run Flask server (port 8081)
cd backend && python3 server.py

# Run tests
cd backend && python3 -m unittest discover -v          # All tests
python3 -m unittest backend.test_server -v             # Server tests
python3 -m unittest backend.test_rag_pipeline -v       # RAG pipeline tests
python3 -m unittest backend.test_config -v             # Config tests
python3 -m unittest backend.test_evaluation -v         # Evaluation framework tests

# Code quality (individual commands)
black backend rag                                       # Format code
isort backend rag                                       # Sort imports
mypy backend rag                                        # Type checking
flake8 backend rag                                      # Lint code

# Code quality (all in one command)
cd backend && black . && isort . && mypy . && flake8 .

# Run tests with coverage and detailed output
cd backend && python3 -m unittest discover -v --tb=short

# Dependency management
pip list --outdated                                    # Check outdated packages
pip install -r requirements-working.txt --upgrade      # Update dependencies (tested version)
```

### Frontend Development
```bash
cd frontend

npm run dev          # Development server with hot reload (port 3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checks
npm run lint:fix     # Auto-fix ESLint issues
npm run test         # Jest tests
npm run test:watch   # Jest tests in watch mode
npm run test:coverage # Jest tests with coverage
npm run type-check   # TypeScript validation
npm run format       # Prettier formatting
npm run format:check # Check Prettier formatting
npm run check-all    # Run type-check, lint, and format:check
npm run fix-all      # Run lint:fix and format
npm run clean        # Clean build artifacts (.next, out, dist, coverage)

# Dependency management
npx depcheck         # Check for unused dependencies
npm outdated         # Check for outdated packages
```

### Ollama Management (Deprecated Fallback)
```bash
# Note: Ollama is deprecated. Use Groq API for optimal performance.
ollama serve         # Start Ollama server (port 11434)
ollama list          # List downloaded models
ollama pull llama3.2:3b-instruct-q4_0      # Legacy fallback model (3B, quantized)
ollama pull nomic-embed-text:latest        # Legacy fallback embedding model
```

### Environment Configuration
```bash
# Copy example and customize (80+ configurable settings)
cp .env.example .env

# Required variables:
# GROQ_API_KEY=gsk_your-actual-key (REQUIRED - get from https://console.groq.com/keys)
# FLASK_ENV=development|production|testing

# Important configuration:
# GROQ_MODEL_NAME=llama-3.3-70b-versatile
# EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
# MAX_UPLOAD_SIZE=16777216 (16MB)
# SESSION_TIMEOUT_MINUTES=30
# SERVER_PORT=8081

# Production variables:
# FLASK_SECRET_KEY=your-secret-key-here-change-in-production (REQUIRED for production)
# API_KEYS=key1,key2,key3 (for production authentication)
# ALLOWED_ORIGINS=https://yourdomain.com (CORS for production)

# See .env.example for comprehensive configuration options including:
# - Rate limiting settings (5 uploads/5min, 30 queries/min, 100 general/min)
# - Feature flags (hybrid search, query caching, batch processing, async embeddings)
# - Monitoring and logging configuration
# - SSL/TLS settings for production
# - Ollama fallback configuration (deprecated)
```

## API Reference

### Health Check
```
GET /
```

### Upload Contract
```
POST /upload_file
Content-Type: multipart/form-data
- file: binary (PDF, DOCX, DOC, TXT, max 16MB)
```

### Query with Chat History
```
POST /ask_ai
Content-Type: application/json
{
  "question": "What are the payment terms?",
  "chat_history": [
    {"type": "human", "content": "..."},
    {"type": "ai", "content": "..."}
  ]
}
```

## Testing & Evaluation Framework

### RAG Evaluation System
The project includes a comprehensive RAG evaluation framework using RAGAS metrics and custom contract-specific evaluations.

**Core Evaluation Components:**
- `rag/evaluation/rag_evaluator.py` - Main evaluation orchestrator with RAGAS integration
- `rag/evaluation/test_datasets.py` - Contract-specific test datasets and questions
- `tests/evaluation/automated_evaluation.py` - Automated evaluation pipeline with trend analysis
- `tests/performance/benchmark_rag.py` - Performance benchmarking and load testing
- `backend/test_evaluation.py` - Comprehensive test suite for evaluation framework
- `evaluation_config.json` - Configurable evaluation settings and parameters

**Evaluation Metrics:**
- Faithfulness, Answer Relevancy, Context Recall, Context Precision (RAGAS)
- Answer Similarity, Custom Contract Metrics
- Response Time, Throughput, Error Rate
- Performance trend analysis and historical tracking
- Benchmark comparisons across different document types and query complexities

### Backend Test Strategy
- Unit tests in `backend/test_server.py`, `backend/test_rag_pipeline.py`
- Integration tests in `backend/test_evaluation.py`
- Uses unittest framework with mocking for Groq/LLM calls
- Test environment uses temp directories (/tmp/test_*)
- Configuration validation testing
- RAG evaluation framework testing with mock datasets

### Frontend Test Strategy
- Jest tests in `frontend/__tests__/Upload.test.js`
- Mock API responses for isolated component testing
- React Testing Library for component testing
- Coverage reporting available

### Testing Commands

```bash
# Backend tests with coverage
cd backend && python3 -m unittest discover -v --tb=short

# Frontend tests with coverage
cd frontend && npm run test:coverage

# Run specific backend tests
python3 -m unittest backend.test_server -v
python3 -m unittest backend.test_rag_pipeline -v
python3 -m unittest backend.test_evaluation -v

# Run evaluation framework tests
python3 tests/evaluation/test_rag_integration.py -v
python3 tests/evaluation/automated_evaluation.py -v

# Watch mode for frontend tests
cd frontend && npm run test:watch

# Performance benchmarking
python3 tests/performance/benchmark_rag.py data/uploads_test/sample_contract.txt --questions 10

# Automated evaluation pipeline
python3 tests/evaluation/automated_evaluation.py data/uploads_test/sample_contract.txt --questions 15

# RAG evaluation with custom questions
python3 -m rag.evaluation.rag_evaluator $(pwd)/data/uploads_test/sample_contract.txt

# Quick evaluation test (3 questions, no RAGAS)
python3 -c "
from rag.evaluation.rag_evaluator import ContractQAEvaluator
evaluator = ContractQAEvaluator()
result = evaluator.evaluate_rag_pipeline(
    'data/uploads_test/sample_contract.txt',
    test_questions=['What are the payment terms?', 'When can this contract be terminated?']
)
evaluator.print_evaluation_summary(result)
"
```

### Evaluation Setup & Usage

```bash
# Setup evaluation framework (one time)
./scripts/setup_evaluation.sh

# Quick evaluation test
source .venv/bin/activate
python3 -m rag.evaluation.rag_evaluator $(pwd)/data/uploads_test/sample_contract.txt

# Custom evaluation with specific questions
python3 -c "
import sys, os
sys.path.append('.')
from rag.evaluation.rag_evaluator import ContractQAEvaluator
evaluator = ContractQAEvaluator()
result = evaluator.evaluate_rag_pipeline(
    os.path.abspath('data/uploads_test/sample_contract.txt'),
    test_questions=['What are the payment terms?', 'When can this contract be terminated?']
)
evaluator.print_evaluation_summary(result)
"
```

## Code Quality Standards

### Python (Backend & RAG)
- **Format**: Black (88-char lines) - enforced via pyproject.toml
- **Sort imports**: isort with Black profile
- **Type checking**: mypy with strict mode (disallow_untyped_defs=true)
- **Linting**: flake8 (ignores E203, E501, W503)
- **Configuration**: pyproject.toml defines all standards
- **Testing**: unittest framework with mocking

### TypeScript (Frontend)
- **Strict mode**: Enabled (`strict: true` in tsconfig.json)
- **Format**: Prettier with Tailwind CSS plugin
- **Lint**: ESLint for React/TypeScript
- **Components**: Functional with hooks (no class components)
- **Testing**: Jest + React Testing Library
- **Build**: Next.js with TypeScript compilation

### Pre-commit Hooks
- Husky configured for auto-linting on commit (via `npm run prepare`)
- lint-staged for efficient file checking (runs ESLint + Prettier on staged files)
- Prevents committing code that fails Black/ESLint/mypy/Prettier
- Configuration in `frontend/package.json` lint-staged section

### Quality Enforcement
```bash
# Python - Run all quality checks
cd backend && black . && isort . && mypy . && flake8 .

# Frontend - Run all quality checks
cd frontend && npm run check-all

# Fix all formatting issues
cd frontend && npm run fix-all
```

## User Interface Features

### Keyboard Shortcuts
- **Ctrl+K**: Open Quick Actions Menu
- **Ctrl+/**: Show Contextual Help & Keyboard Shortcuts
- **Escape**: Close modals, dropdowns, and overlays
- **Enter**: Submit forms and chat messages
- **Tab/Shift+Tab**: Navigate between interactive elements

### Mobile Features
- **Responsive Design**: Mobile-optimized chat interface
- **Touch Gestures**: Swipe navigation for mobile chat
- **Mobile Chat Component**: Dedicated mobile chat experience
- **Progressive Enhancement**: Core functionality works on all devices

### Help & Onboarding
- **Contextual Help System**: Context-aware help widgets
- **Onboarding Tours**: Guided tours for first-time users
- **Smart Tooltips**: Helpful hints for complex features
- **Error Recovery**: User-friendly error messages with recovery options

### Document Analytics
- **Document Insights**: Automatic document analysis and summaries
- **Analytics Dashboard**: Usage statistics and document metrics
- **Performance Monitoring**: Query response times and system health
- **Enhanced Error Display**: Detailed error information with debugging help

## Configuration Management

### Environment-Based Config (backend/config.py)
- **BaseConfig**: Common settings for all environments
- **DevelopmentConfig**: Debug enabled, localhost CORS, verbose logging
- **ProductionConfig**: SSL/TLS support, strict CORS, requires FLASK_SECRET_KEY env var
- **TestingConfig**: Temp storage paths, smaller limits, faster timeouts
- **ConfigValidator**: Validates environment configuration on startup

### Key Configuration Constants
- **Max file upload**: 16MB (configurable via MAX_UPLOAD_SIZE)
- **Session timeout**: 30 minutes (configurable)
- **Rate limits**: 5 uploads/5min, 30 queries/min, 100 general/min
- **Model timeout**: 300 seconds (Groq API)
- **Embedding cache**: 1000+ persistent JSON files in `cache/embeddings/`
- **Vector store**: ChromaDB with persistent storage
- **Feature flags**: Hybrid search, query caching, batch processing, async embeddings

## Deployment & Performance

### Performance Characteristics
- **First query**: 10-30 seconds (Groq cloud inference, API initialization)
- **Subsequent queries**: 5-15 seconds (cached embeddings + retrieval)
- **Document processing**: ~1 chunk per second (800-char chunks with 100-char overlap)
- **Vector store**: ChromaDB with persistence between requests
- **Embeddings**: HuggingFace sentence-transformers (local, fast)
- **Concurrent sessions**: 5 sessions max per IP (configurable)
- **File processing**: PDF, DOCX, TXT with multiple parsing libraries
- **Rate limiting**: 30 queries/min per IP (configurable via environment)

### Scaling Considerations
- **Global state**: `qa_chain` stored per session (not thread-safe for concurrent uploads)
- **Embedding cache**: Grows with document volume (manageable up to 10GB)
- **Session management**: 5 sessions max per IP by default (configurable)
- **Rate limiting**: Enforced at endpoint level (upload/query/general)
- **Groq API limits**: Monitor usage at https://console.groq.com/ - default 30 requests/min

### Production Deployment
```bash
# Production environment setup
export FLASK_ENV=production
export FLASK_SECRET_KEY=your-secure-secret-key-here
export API_KEYS=key1,key2,key3
export ALLOWED_ORIGINS=https://yourdomain.com
export SERVER_HOST=0.0.0.0
export SSL_CERT_PATH=/path/to/cert.pem
export SSL_KEY_PATH=/path/to/key.pem

# Use production requirements
pip install -r requirements.txt

# Configure reverse proxy (nginx example)
# Forward https://yourdomain.com to http://localhost:8081
# Handle SSL termination and static file serving
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Port conflict (8081)** | Change SERVER_PORT in .env or `backend/config.py` |
| **Groq API key missing** | Add `GROQ_API_KEY=gsk_...` to .env file (REQUIRED) |
| **Groq API errors** | Check API key validity and rate limits at https://console.groq.com/ |
| **Groq rate limits** | Monitor usage at https://console.groq.com/ - default 30 requests/min |
| **Dependency conflicts** | Always use `.venv`: `source .venv/bin/activate` |
| **Query before upload** | `qa_chain` initialized only after successful file upload |
| **Embedding model errors** | Ensure sentence-transformers installed: `pip install sentence-transformers` |
| **ChromaDB errors** | Delete `data/chroma_db/` and re-upload document |
| **Type checking failures** | Run `mypy backend rag` to check for type errors |
| **Test failures** | Ensure virtual environment activated: `source .venv/bin/activate` |
| **Frontend build issues** | Run `npm run clean` then `npm install` in frontend directory |
| **Pre-commit hook failures** | Run `npm run fix-all` and `black backend rag` to fix formatting |

## File Organization

```
project/
├── backend/              # Flask API server
│   ├── server.py        # Main Flask app with ConfigValidator
│   ├── config.py        # Environment configuration
│   ├── session_manager.py
│   ├── test_*.py        # Unit tests (server, RAG pipeline, evaluation)
│   └── uploads/         # Uploaded contracts (runtime)
├── rag/                 # LangChain RAG pipeline
│   ├── rag_pipeline.py  # Main orchestrator with retry logic
│   ├── data_loader.py   # PDF, DOCX, TXT parsing
│   ├── chunk_documents.py # 800-char chunks with 100-char overlap
│   ├── embedding.py     # HuggingFace sentence-transformers
│   ├── retriever.py     # ChromaDB vector store
│   ├── chat_model.py    # Groq LLM integration
│   ├── conversation_chain.py # LangChain QA chain
│   ├── evaluation/      # RAG evaluation framework
│   │   ├── rag_evaluator.py    # Main evaluation orchestrator
│   │   └── test_datasets.py    # Contract test datasets
│   ├── test_*.py        # Integration tests
│   └── uploads/         # Documents for processing (runtime)
├── tests/               # Comprehensive test suite
│   ├── evaluation/      # Evaluation framework tests
│   │   ├── automated_evaluation.py  # Automated evaluation pipeline
│   │   └── test_rag_integration.py  # RAG integration tests
│   ├── performance/     # Performance and benchmarking tests
│   │   └── benchmark_rag.py         # RAG performance benchmarking
│   └── __init__.py
├── frontend/            # Next.js React app
│   ├── src/pages/       # Page routes
│   ├── src/components/  # React components (Upload, Chat, etc.)
│   ├── __tests__/       # Jest tests
│   ├── package.json     # NPM scripts and dependencies
│   └── public/          # Static assets
├── data/                # Runtime data (created by setup-project.sh)
│   ├── uploads/         # Contract files
│   ├── uploads_test/    # Test contract documents
│   └── chroma_db/       # Vector store
├── cache/               # Runtime caches (created on first query)
│   ├── embeddings/      # HuggingFace embedding cache files
│   ├── queries/         # Query result cache
│   └── evaluations/     # Evaluation result cache
├── evaluation_results/  # Evaluation outputs and reports
├── logs/                # Application and evaluation logs
├── scripts/             # Utility scripts
│   └── setup_evaluation.sh  # Evaluation framework setup
├── docs/                # Documentation
│   ├── EVALUATION_USAGE.md   # Evaluation usage guide
│   └── *.md             # Additional documentation
├── setup-project.sh     # One-time setup automation
├── run-project.sh       # Start all services
├── requirements-working.txt # Tested dependencies (Groq + HuggingFace)
├── requirements.txt         # Standard dependencies
├── requirements-dev.txt     # Development dependencies
├── requirements.minimal.txt # Minimal dependencies for testing
├── evaluation_config.json  # Evaluation configuration
├── .env.example         # Environment variables template (80+ settings)
├── pyproject.toml       # Python code quality standards
└── CLAUDE.md            # This file
```

## Debugging Tips

### General Debugging
- **Enable debug mode**: Set `FLASK_ENV=development` (enables stack traces)
- **Monitor logs**: Backend logs to `logs/app.log` (rotated at 10MB), evaluation logs to `logs/evaluation/`
- **Test endpoints manually**: Use `curl` or Postman against `http://127.0.0.1:8081`
- **Frontend debugging**: Browser DevTools + `npm run dev` for hot reload

### Groq API Debugging
- **Check Groq API**: Verify API key and connectivity:
  ```bash
  # Test API key validity
  curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models

  # Test model availability and response time
  curl -X POST https://api.groq.com/openai/v1/chat/completions \
    -H "Authorization: Bearer $GROQ_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 10}'
  ```

### RAG System Debugging
- **Inspect embeddings**: Check `cache/embeddings/` for HuggingFace embedding files
- **ChromaDB issues**: Delete `data/chroma_db/` directory and re-upload document
- **Session issues**: Clear browser cookies or wait 30 minutes for session timeout
- **Dependency issues**: Use `requirements-working.txt` for tested dependencies
- **Rate limiting**: Check `backend/config.py` for current rate limit settings

### Evaluation Framework Debugging
- **Setup issues**: Run `./scripts/setup_evaluation.sh` to ensure proper installation
- **Import errors**: Ensure virtual environment is activated and dependencies installed:
  ```bash
  source .venv/bin/activate
  pip install ragas datasets psutil matplotlib
  ```
- **Evaluation failures**: Check `logs/evaluation/evaluation_pipeline.log` for detailed error traces
- **RAGAS issues**: Verify RAGAS installation with `python3 -c "import ragas; print(ragas.__version__)"`
- **Test data missing**: Ensure sample contract exists at `data/uploads_test/sample_contract.txt`
- **Permission issues**: Check write permissions for `evaluation_results/` and `cache/evaluations/`
- **Memory issues**: Reduce number of questions in evaluation_config.json for large documents
- **Timeout issues**: Increase timeout_seconds in evaluation configuration

### Performance Debugging
- **Benchmarking**: Use `python3 tests/performance/benchmark_rag.py` to identify bottlenecks
- **Memory usage**: Monitor with `python3 -c "import psutil; print(psutil.virtual_memory())"`
- **Response time analysis**: Check evaluation results for avg_response_time metrics
- **Concurrent issues**: Test with `--concurrent` flag in benchmark_rag.py

## Key Development Patterns

### State Management
- **Backend**: Global `qa_chain` variable per session for conversation context in `rag/rag_pipeline.py:25`
- **Frontend**: React hooks for component state, Axios for API calls with error handling
- **Sessions**: Session-based storage with `backend/session_manager.py` for conversation history

### Error Handling Patterns
- **Backend**: Comprehensive try/catch blocks with detailed error messages and HTTP status codes
- **Frontend**: Error boundaries and HTTP error handling with user-friendly messages
- **RAG Pipeline**: Retry logic with exponential backoff (3 attempts) in `rag/rag_pipeline.py:40`

### File Processing Architecture
- **Supported formats**: PDF, DOCX, DOC, TXT (max 16MB) via `rag/data_loader.py`
- **Chunking strategy**: 800 characters with 100-character overlap for better retrieval in `rag/chunk_documents.py`
- **Embedding generation**: HuggingFace `sentence-transformers/all-MiniLM-L6-v2` with persistent caching
- **Vector storage**: ChromaDB with persistent storage in `data/chroma_db/`

### API Design Patterns
- **RESTful endpoints**: `/` (health), `/upload_file`, `/ask_ai` with proper HTTP methods
- **Rate limiting**: Configurable via environment variables with different limits per endpoint
- **CORS handling**: Properly configured for development and production environments
- **Session management**: Cookie-based sessions with configurable timeout

## Important Implementation Details

### Critical Architecture Notes
- **Global state management**: The `qa_chain` variable is stored globally per session, making the system NOT thread-safe for concurrent uploads on the same session
- **Dependency order**: Services must start in specific order (Backend → Frontend) with proper health checks
- **Memory management**: Embedding cache grows with document volume but is manageable up to 10GB
- **File processing**: All file operations use secure_filename() and validate file types/sizes

### Configuration System
- **Environment-based config**: Three modes (development/production/testing) with different defaults
- **Config validation**: Automatic validation on startup with `backend/config.py:ConfigValidator`
- **Feature flags**: Enable/disable features like hybrid search, query caching, batch processing
- **Security**: Production mode requires SSL/TLS, API keys, and strict CORS settings

### Data Flow Architecture
1. **Upload Phase**: File validation → Document parsing → Text chunking → Embedding generation → Vector storage
2. **Query Phase**: Query reception → Context retrieval → LLM generation → Response formatting
3. **Session Management**: Conversation history storage → Context maintenance → Session cleanup

### Dependencies & Version Management
- **Python requirements**: Three-tier requirements files (minimal.txt, working.txt, requirements.txt)
- **Frontend dependencies**: npm with package-lock.json for reproducible builds
- **Virtual environment**: Required for all Python development (`source .venv/bin/activate`)
- **Tested configurations**: `requirements-working.txt` contains verified dependency versions