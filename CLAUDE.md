# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

High-Precision Contract Advisor RAG - An AI-powered contract analysis system using Retrieval-Augmented Generation (RAG) with local LLM (Ollama). Built for Lizzy AI, providing intelligent Q&A on uploaded contract documents.

**Tech Stack:**
- **Backend**: Flask + LangChain RAG pipeline (Python 3.8+)
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS (Node.js 18+)
- **AI**: Ollama (local LLM) with llama3.2:3b-instruct-q4_0 and nomic-embed-text:latest
- **Vector Store**: ChromaDB for embeddings persistence

## Quick Start

```bash
# One-time setup (Windows Git Bash or WSL)
./setup-project.sh

# Daily development
./run-project.sh

# Access points
# Frontend: http://localhost:3000
# Backend: http://127.0.0.1:8081
# Ollama: http://localhost:11434
```

**Note**: This project is developed on Windows (MINGW64_NT) and uses Git Bash for shell scripts.

## Common Commands

### Development
```bash
# Backend (port 8081, not 8080!)
source venv/bin/activate
cd backend && python3 server.py

# Frontend
cd frontend && npm run dev

# Ollama (required)
ollama serve
ollama pull llama3.2:3b-instruct-q4_0
ollama pull nomic-embed-text:latest
```

### Testing
```bash
# Backend tests (unittest framework)
source venv/bin/activate  # Windows: source venv/Scripts/activate
cd backend && python3 -m unittest discover -v

# Frontend tests (Jest)
cd frontend && npm test

# Run specific tests
cd backend && python3 -m unittest test_server.TestUploadFile -v
cd frontend && npm test -- --testNamePattern="Upload"
```

### Code Quality
```bash
# Python formatting
./format-python.sh  # Runs black, isort, flake8, mypy

# Frontend linting
cd frontend
npm run lint        # ESLint
npm run format      # Prettier
npm run type-check  # TypeScript
npm run fix-all     # Fix all auto-fixable issues
```

## Architecture Overview

### Backend RAG Pipeline (`backend/server.py` + `rag/`)

The RAG pipeline is **session-based** with modular components. **Critical**: State is managed per-session via `session_manager`, NOT global variables.

1. **Document Upload Flow** (`POST /upload_file`):
   - File validation → stores in `../data/uploads/` (NOT `backend/uploads/`)
   - Creates session via `session_manager.create_session()`
   - Returns session_id immediately, processes QA chain async in background thread
   - Processing status checkable via `GET /status`

2. **RAG Pipeline Stages** (`rag/rag_pipeline.py`):
   - `data_loader.py` - Loads PDF/DOCX/TXT via LangChain loaders
   - `chunk_documents.py` - RecursiveCharacterTextSplitter (800 chars, 100 overlap)
   - `embedding.py` - Ollama embeddings (nomic-embed-text:latest) with file-based caching
   - `retriever.py` - ChromaDB vector store at `../data/chroma_db/` (persisted)
   - `chat_model.py` - Ollama LLM (llama3.2:3b-instruct-q4_0)
   - `conversation_chain.py` - LangChain ConversationalRetrievalChain

3. **Query Processing** (`POST /ask_ai`):
   - Gets session_id from Flask session or X-Session-ID header
   - Retrieves session's `qa_chain` via `session_manager.get_qa_chain(session_id)`
   - Invokes chain with question + chat_history
   - Updates session stats (response time, query count, errors)

**Session Management** (`backend/session_manager.py`):
- Thread-safe session storage with RLock
- Each session stores: qa_chain, file_path, timestamps, performance_stats
- Auto-cleanup thread runs every 10 minutes (configurable)
- Default timeout: 30 minutes (configurable via SESSION_TIMEOUT_MINUTES env var)
- Session ID generated via SHA256(file_path + size + mtime + user_id)

### Frontend Structure (`frontend/src/`)

- **Pages**: `pages/index.tsx` - Main layout with routing
- **Components**:
  - `components/Upload.jsx` - File upload interface
  - `components/Chat.jsx` - Chat interface for Q&A
  - `components/Bot.jsx` - Bot response rendering
- **Styling**: Tailwind CSS + Ionic React components
- **State**: React hooks + Axios for API calls

### Configuration Files

- **Python**: `pyproject.toml` (black, isort, flake8, mypy)
- **Dependencies**: `requirements.minimal.txt` (21 core packages, no ChromaDB conflicts)
- **Frontend**: `tsconfig.json`, `.eslintrc.json`, `jest.config.js`
- **Environment**: `.env.example` (200+ documented variables)

## Key Technical Details

### Port Configuration
- **Backend**: Port **8081** (NOT 8080) - `backend/server.py:110`
- **Frontend**: Port 3000 (Next.js default)
- **Ollama**: Port 11434 (local API)

### Model Configuration
Change models in `rag/rag_pipeline.py:12` and `rag/chat_model.py`:
- Default: `llama3.2:3b-instruct-q4_0` (3B params, fast, first load: 1-2 min)
- Embeddings: `nomic-embed-text:latest` (required for vector search)
- Alternatives: `llama2`, `mistral`, `deepseek-r1:8b`, `codellama`

### State Management
- **Backend**: Session-based global state via `session_manager` (not single global `qa_chain`)
- **Vector Store**: Persists in `../data/chroma_db/` relative to backend
- **Sessions**: Auto-cleanup after 1 hour, isolated contexts per user

### Dependencies Management
**Critical**: Always use virtual environment to avoid conflicts:
```bash
python3 -m venv venv
source venv/bin/activate  # Windows Git Bash: source venv/Scripts/activate
pip install -r requirements.minimal.txt  # 21 core packages, no ChromaDB conflicts
```

**Important**: Use `requirements.minimal.txt` (21 packages) NOT `requirements.txt` (313+ packages with conflicts)

## Development Workflow Patterns

### RAG Pipeline Development
- Test contracts in `../data/uploads/` (relative to backend)
- Jupyter notebook at `notebooks/experimentation.ipynb` for RAG experiments
- Monitor ChromaDB: `ls -la data/chroma_db/` (from project root)
- **First AI query loads model into memory**: 1-2 minutes expected (llama3.2:3b is ~2GB)
- Subsequent queries: 10-30 seconds
- Embeddings are cached in `cache/embeddings/` (JSON files, keyed by content hash)

### Code Style Guidelines
**Python**:
- PEP 8 compliance via black/isort/flake8
- Type hints where possible
- Try/except blocks for external API calls
- Forward slashes for paths (cross-platform)

**TypeScript/React**:
- Mixed JS/JSX and TS/TSX (maintain existing patterns)
- Functional components with hooks
- Async/await for API calls
- Tailwind classes for styling

### Testing Strategy
- **Backend**: unittest framework, mock external dependencies (Ollama)
- **Frontend**: Jest + React Testing Library, mock Next.js router and axios
- **Integration**: Upload document → query AI → verify response flow
- **Pre-commit**: Run both test suites before committing

## Common Issues & Solutions

### "ModuleNotFoundError: langchain_community"
```bash
source venv/bin/activate  # Windows: source venv/Scripts/activate
pip install langchain-community
```

### "Connection refused to Ollama" or "Model not found"
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Start Ollama (if not running)
ollama serve

# Pull required models
ollama pull llama3.2:3b-instruct-q4_0   # Main LLM (~2GB)
ollama pull nomic-embed-text:latest     # Embeddings (~274MB)

# Verify models
ollama list
```

### "Port 8081 already in use"
```bash
# Linux/Mac
lsof -i :8081
kill -9 <PID>

# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Frontend build fails
```bash
cd frontend
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### ChromaDB permission denied or corrupt
```bash
# Remove and recreate vector DB
rm -rf data/chroma_db/
mkdir -p data/chroma_db/

# Re-upload document to regenerate embeddings
```

### "Session expired or not found"
- Sessions timeout after 30 minutes of inactivity
- Re-upload the document to create a new session
- Adjust timeout via `SESSION_TIMEOUT_MINUTES` env var

## File Organization

```
llama-docs-auditor/
├── backend/                    # Flask API (port 8081)
│   ├── server.py              # Main Flask app (1287 lines) with routes, auth, rate limiting
│   ├── session_manager.py     # Thread-safe session management (296 lines)
│   ├── test_*.py              # Unit tests (unittest framework)
│   └── .env.example           # Environment config reference (200+ variables)
├── rag/                        # RAG pipeline modules (imported by backend)
│   ├── rag_pipeline.py        # Main orchestrator with retry logic & fallbacks
│   ├── data_loader.py         # PDF/DOCX/TXT loaders via LangChain
│   ├── chunk_documents.py     # RecursiveCharacterTextSplitter
│   ├── embedding.py           # Ollama embeddings with file-based caching
│   ├── retriever.py           # ChromaDB vector store setup
│   ├── chat_model.py          # Ollama LLM initialization
│   └── conversation_chain.py  # ConversationalRetrievalChain creation
├── frontend/                   # Next.js 14 app (port 3000)
│   ├── src/
│   │   ├── pages/index.tsx    # Main page with routing
│   │   ├── components/        # Upload.jsx, Chat.jsx, Bot.jsx (mixed JS/TS)
│   │   └── types/             # TypeScript definitions
│   ├── __tests__/             # Jest + React Testing Library
│   └── package.json           # Scripts: dev, build, test, lint, format
├── data/                       # Runtime data (gitignored)
│   ├── uploads/               # Uploaded contract files
│   └── chroma_db/             # ChromaDB vector store (persisted)
├── cache/                      # Embedding cache (gitignored)
│   └── embeddings/            # JSON files keyed by content hash
├── docs/                       # Extended documentation
│   ├── DEVELOPMENT.md         # Setup guide
│   └── tasks.md               # Implementation tracking
├── notebooks/                  # Jupyter experimentation
├── pyproject.toml             # Black, isort, flake8, mypy config
├── requirements.minimal.txt   # 21 core packages (USE THIS)
├── requirements-dev.txt       # Dev tools (black, flake8, pytest)
├── setup-project.sh           # One-time setup script
├── run-project.sh             # Start all services
└── format-python.sh           # Run all Python formatters
```

**Key Directories**:
- `backend/` - Flask server runs from here (relative paths: `../data/`, `../rag/`)
- `data/` - All persistent data (uploads, vector DB)
- `cache/` - Embeddings cache (improves loading speed 10x)
- `frontend/` - Next.js app, independent npm workspace

## Security Features

The backend implements comprehensive security (see `server.py:1-1287`):

1. **Authentication** (`BasicAuth` class):
   - Optional API key authentication (enabled in production)
   - Bearer token or X-API-Key header support
   - Auto-generates secure key if none provided

2. **Rate Limiting** (`RateLimiter` class):
   - Upload: 5 requests per 5 minutes
   - Query: 30 requests per minute
   - General: 100 requests per minute
   - Returns 429 with rate limit headers

3. **Input Sanitization**:
   - `sanitize_user_input()` - HTML escape, script injection prevention
   - `validate_prompt()` - SQL injection, code execution pattern detection
   - `sanitize_response_data()` - XSS prevention in API responses
   - `validate_file_content()` - File signature verification (prevents disguised files)

4. **File Upload Security**:
   - Whitelist: PDF, DOC, DOCX, TXT only
   - `secure_filename()` sanitization
   - File signature validation (magic bytes)
   - Max size: 16MB (configurable via MAX_UPLOAD_SIZE)
   - Uploads stored outside web root (`../data/uploads/`)

5. **CORS**:
   - Development: localhost:3000 only
   - Production: Configurable whitelist via ALLOWED_ORIGINS env var

6. **Configuration Validation** (`ConfigValidator` class):
   - Validates all env vars on startup
   - Warns about insecure defaults in production
   - Exports config summary via `GET /config` (auth required)

**No API keys for Ollama** - runs 100% locally on port 11434

## API Endpoints

### Public Endpoints
- `GET /` - Health check
- `POST /upload_file` - Upload document, returns session_id (rate limited: 5/5min)
- `GET /status` - Check document processing status for current session
- `POST /ask_ai` - Query document (rate limited: 30/min)
  - Body: `{"prompt": "question", "chat_history": []}`
  - Returns: `{"result": "answer", "response_time": 1.23, "session_info": {...}}`
- `GET /session/info` - Get current session details
- `GET /features` - Get feature flag status

### Admin Endpoints (require auth)
- `GET /session/list` - List all active sessions
- `POST /session/cleanup` - Manually trigger session cleanup
- `GET /config` - Get configuration summary
- `POST /config/reload` - Hot-reload config (development only)
- `POST /features/<name>` - Toggle feature flags (development only)

### Session Headers
- `X-Session-ID` - Explicit session ID (optional, fallback to Flask session)
- `X-User-ID` - User identifier for session isolation (optional)

## Feature Flags System

The backend uses a feature flag system (`FeatureFlags` class) for experimental features:

**RAG Pipeline Features**:
- `hybrid_search` - Hybrid keyword + semantic search (default: true)
- `query_caching` - Cache query results (default: true)
- `batch_processing` - Batch document processing (default: true)
- `async_embeddings` - Async embedding generation (default: true)

**Analytics**:
- `performance_monitoring` - Track response times, errors (default: true)
- `usage_analytics` - User behavior tracking (default: false)

**Debug Features** (auto-disabled in production):
- `debug_logging` - Verbose logging (default: false)
- `verbose_errors` - Detailed error messages (default: false)

**Experimental**:
- `auto_retry_failed_queries` - Auto-retry on failures (default: false)
- `smart_chunk_sizing` - Dynamic chunk size (default: false)
- `multi_model_fallback` - Fallback to different models (default: false)

Configure via environment variables:
```bash
FEATURE_HYBRID_SEARCH=true
FEATURE_DEBUG_LOGGING=false
```

Toggle at runtime (development only):
```bash
curl -X POST http://localhost:8081/features/debug_logging \
  -H "Content-Type: application/json" \
  -d '{"action": "enable"}'
```
