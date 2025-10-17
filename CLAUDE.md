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
- **Groq API Key** - Get from https://console.groq.com/keys
  - Add to .env file: `GROQ_API_KEY=gsk_your-actual-key`
- **Ollama** (optional, for local model fallback) - Install from [ollama.ai](https://ollama.ai)
  - macOS: `brew install ollama`
  - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`

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
- `rag/chat_model.py` - Groq LLM integration with 300s timeout (primary) + Ollama fallback
- `rag/conversation_chain.py` - LangChain retrieval QA chain with prompt templating

**Frontend (Next.js + React)**
- `frontend/src/pages/index.tsx` - Main layout with Upload and Chat components
- 22 React components (TypeScript, strict mode): DocumentManager, MarkdownRenderer, etc.
- Tailwind CSS styling with Ionic React (v7.8.0)
- Axios HTTP client for API calls with proper error handling

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
```

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

# Run all backend tests
cd backend && python3 -m unittest discover -v

# Run specific test file
python3 -m unittest backend.test_server -v
python3 -m unittest backend.test_rag_pipeline -v

# Format code (Black, 88-char lines)
black backend rag

# Sort imports (isort)
isort backend rag

# Check type hints (mypy)
mypy backend rag

# Lint code (flake8)
flake8 backend rag

# Run with coverage
cd backend && python3 -m unittest discover -v --tb=short
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
npm run clean        # Clean build artifacts
```

### Ollama Management (Optional Fallback)
```bash
ollama serve         # Start Ollama server (port 11434)
ollama list          # List downloaded models
ollama pull llama3.2:3b-instruct-q4_0      # Fallback model (3B, quantized)
ollama pull nomic-embed-text:latest        # Fallback embedding model
```

### Environment Configuration
```bash
# Copy example and customize (50+ configurable settings)
cp .env.example .env

# Critical variables:
# GROQ_API_KEY=gsk_your-actual-key (REQUIRED)
# FLASK_ENV=development|production|testing
# GROQ_MODEL_NAME=llama-3.3-70b-versatile
# EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
# MAX_UPLOAD_SIZE=16777216 (16MB)
# SESSION_TIMEOUT_MINUTES=30
# SERVER_PORT=8081

# Production variables:
# FLASK_SECRET_KEY=your-secret-key-here-change-in-production (REQUIRED for production)
# API_KEYS=key1,key2,key3 (for production authentication)
# ALLOWED_ORIGINS=https://yourdomain.com (CORS for production)
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

## Testing

### Backend Test Strategy
- Unit tests in `backend/test_server.py`, `backend/test_rag_pipeline.py`
- Uses unittest framework with mocking for Groq/LLM calls
- Test environment uses temp directories (/tmp/test_*)
- Configuration validation testing

### Frontend Test Strategy
- Jest tests in `frontend/__tests__/Upload.test.js`
- Mock API responses for isolated component testing
- React Testing Library for component testing
- Coverage reporting available

```bash
# Backend tests with coverage
cd backend && python3 -m unittest discover -v --tb=short

# Frontend tests with coverage
cd frontend && npm run test:coverage

# Run specific backend tests
python3 -m unittest backend.test_server -v
python3 -m unittest backend.test_rag_pipeline -v

# Watch mode for frontend tests
cd frontend && npm run test:watch
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
- Husky configured for auto-linting on commit
- lint-staged for efficient file checking
- Prevents committing code that fails Black/ESLint/mypy/Prettier

### Quality Enforcement
```bash
# Python - Run all quality checks
cd backend && black . && isort . && mypy . && flake8 .

# Frontend - Run all quality checks
cd frontend && npm run check-all

# Fix all formatting issues
cd frontend && npm run fix-all
```

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
- **First query**: 10-30 seconds (Groq cloud inference, no local model loading)
- **Subsequent queries**: 5-15 seconds (cached embeddings + retrieval)
- **Document processing**: ~1 chunk per second (800-char chunks with 100-char overlap)
- **Vector store**: ChromaDB with persistence between requests
- **Embeddings**: HuggingFace sentence-transformers (local, fast)
- **Concurrent sessions**: 5 sessions max per IP (configurable)
- **File processing**: PDF, DOCX, TXT with multiple parsing libraries

### Scaling Considerations
- **Global state**: `qa_chain` stored per session (not thread-safe for concurrent uploads)
- **Embedding cache**: Grows with document volume (manageable up to 10GB)
- **Session management**: 5 sessions max per IP by default (configurable)
- **Rate limiting**: Enforced at endpoint level (upload/query/general)

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Port conflict (8081)** | Change SERVER_PORT in .env or `backend/config.py` |
| **Groq API key missing** | Add `GROQ_API_KEY=gsk_...` to .env file |
| **Groq API errors** | Check API key validity and rate limits at https://console.groq.com/ |
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
│   ├── test_*.py        # Unit tests (server, RAG pipeline)
│   └── uploads/         # Uploaded contracts (runtime)
├── rag/                 # LangChain RAG pipeline
│   ├── rag_pipeline.py  # Main orchestrator with retry logic
│   ├── data_loader.py   # PDF, DOCX, TXT parsing
│   ├── chunk_documents.py # 800-char chunks with 100-char overlap
│   ├── embedding.py     # HuggingFace sentence-transformers
│   ├── retriever.py     # ChromaDB vector store
│   ├── chat_model.py    # Groq LLM integration
│   ├── conversation_chain.py # LangChain QA chain
│   ├── test_*.py        # Integration tests
│   └── uploads/         # Documents for processing (runtime)
├── frontend/            # Next.js React app
│   ├── src/pages/       # Page routes
│   ├── src/components/  # React components (Upload, Chat, etc.)
│   ├── __tests__/       # Jest tests
│   ├── package.json     # NPM scripts and dependencies
│   └── public/          # Static assets
├── data/                # Runtime data (created by setup-project.sh)
│   ├── uploads/         # Contract files
│   └── chroma_db/       # Vector store
├── cache/               # Runtime caches (created on first query)
│   ├── embeddings/      # HuggingFace embedding cache files
│   └── queries/         # Query result cache
├── setup-project.sh     # One-time setup automation
├── run-project.sh       # Start all services
├── requirements-working.txt # Working dependencies (Groq + HuggingFace)
├── .env.example         # Environment variables template (50+ settings)
├── pyproject.toml       # Python code quality standards
└── CLAUDE.md            # This file
```

## Debugging Tips

- **Enable debug mode**: Set `FLASK_ENV=development` (enables stack traces)
- **Check Groq API**: Verify API key with `curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models`
- **Monitor logs**: Backend logs to `logs/app.log` (rotated at 10MB)
- **Inspect embeddings**: Check `cache/embeddings/` for HuggingFace embedding files
- **Test endpoints manually**: Use `curl` or Postman against `http://127.0.0.1:8081`
- **Frontend debugging**: Browser DevTools + `npm run dev` for hot reload
- **Dependency issues**: Use `requirements-working.txt` for tested dependencies