# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

High-Precision Contract Advisor RAG is a contract Q&A system using Retrieval-Augmented Generation (RAG) technology. The system combines a Flask backend with LangChain for document processing and a Next.js frontend for user interaction. Built for Lizzy AI, an Israeli startup developing autonomous AI contract lawyers.

## Architecture

### Backend (Flask + LangChain RAG)
- **Entry point**: `backend/server.py` - Flask server running on port 8081 (not 8080)
- **RAG pipeline**: `rag/rag_pipeline.py` - Main orchestrator for document processing
- **Core modules**:
  - `rag/data_loader.py` - Document loading (PDF, DOCX, TXT)
  - `rag/embedding.py` - Vector embeddings creation using HuggingFace
  - `rag/retriever.py` - Document retrieval with ChromaDB vector store
  - `rag/chat_model.py` - Ollama integration (not OpenAI)
  - `rag/conversation_chain.py` - LangChain conversation chain creation

### Frontend (Next.js + TypeScript)
- **Entry point**: `frontend/src/pages/index.tsx` - Main layout with Upload and Chat components
- **Key components**: 
  - `Upload.jsx` - File upload interface
  - `Chat.jsx` - Chat interface for Q&A
  - `Bot.jsx` - Bot response handling
- **Styling**: Tailwind CSS with Ionic React components
- **State management**: Uses React hooks with Axios for API calls

## Development Commands

### Backend Setup and Run
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (essential packages only due to conflicts)
pip install flask flask-cors langchain langchain-community python-dotenv werkzeug pypdf ollama

# Ensure Ollama is running (in separate terminal)
ollama serve

# Run backend server
cd backend && python3 server.py
```

### Frontend Setup and Run
```bash
# Install dependencies
cd frontend && npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Configuration

### Ollama Setup (Required)
1. **Install Ollama**:
```bash
# Download from https://ollama.ai or use package manager
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh
```

2. **Pull the model**:
```bash
# Pull the qwen3:1.7b model (default for this project)
ollama pull qwen3:1.7b

# Other available models:
# ollama pull llama2
# ollama pull mistral
# ollama pull deepseek-r1:8b
```

3. **Start Ollama server**:
```bash
ollama serve  # Runs on http://localhost:11434
```

No API keys required - Ollama runs completely locally and is free!

## Key Endpoints

- **Backend**: http://127.0.0.1:8081 (note: configured for port 8081, not 8080)
  - `POST /upload_file` - Upload contract documents (PDF, DOCX, DOC, TXT)
  - `POST /ask_ai` - Query uploaded documents with chat history
  - `GET /` - Health check endpoint
- **Frontend**: http://localhost:3000

## RAG Pipeline Flow

1. **Document Upload** (`/upload_file`): 
   - File validation and secure storage in `backend/uploads/`
   - Instantiates `RAGPipeline` class with uploaded file
   - Creates global `qa_chain` for conversation state

2. **Document Processing** (`rag_pipeline.py`):
   - `LoadDocuments` - Loads and parses document content
   - `EmbeddingsCreator` - Creates HuggingFace embeddings
   - `Retriever` - Sets up ChromaDB vector store at `../data/chroma_db/`
   - `ChatModel` - Initializes Ollama model connection
   - `ConversationChain` - Creates LangChain retrieval QA chain

3. **Query Processing** (`/ask_ai`):
   - Accepts user questions via JSON POST
   - Uses global `qa_chain.invoke()` with question and chat history
   - Returns AI-generated answers based on retrieved document context

## Architecture Patterns

- **Stateful Backend**: Global `qa_chain` variable maintains conversation context
- **Modular RAG Components**: Each RAG step is encapsulated in separate classes
- **File-based State**: Vector embeddings persist in ChromaDB directory
- **Direct Model Integration**: Ollama runs locally without API key requirements

## Development Workflow

### Testing RAG Pipeline
- Upload test contracts in `backend/uploads/` (Raptor.pdf, test_contract.txt available)
- Use Jupyter notebook `notebooks/experimentation.ipynb` for RAG experimentation
- Monitor ChromaDB vector store creation in `../data/chroma_db/`

### Code Organization
- **Frontend**: React components are in JSX (not TSX), mixing JS and TS patterns
- **Backend**: Pure Python with Flask, uses global state for simplicity
- **RAG modules**: Each step isolated in separate Python classes for maintainability
- **Configuration**: Model name centralized in `OLLAMA_MODEL_NAME` constant

## Common Issues

1. **Port conflict**: Backend runs on 8081, not 8080 as documentation may suggest
2. **Ollama not running**: Ensure `ollama serve` is running before starting backend
3. **Model not available**: Run `ollama pull qwen3:1.7b` to download the model
4. **Dependency conflicts**: Large requirements.txt with many packages - install essential ones manually:
   ```bash
   pip install flask flask-cors langchain langchain-community python-dotenv werkzeug pypdf ollama
   ```
5. **LangChain deprecations**: Uses `langchain_community` imports for Ollama and document loaders
6. **Virtual environment**: Always use venv to avoid system package conflicts
7. **Global state**: `qa_chain` must be initialized via file upload before querying

## Model Configuration

Change model by updating `OLLAMA_MODEL_NAME` in both `backend/server.py:23` and `rag/rag_pipeline.py:11`:
- `qwen3:1.7b` (default, 1.7B parameters, fast and efficient)
- `llama2` (7B parameters, larger context)
- `mistral` (7B parameters, good quality)
- `deepseek-r1:8b` (8B parameters, reasoning focused but slow)
- `codellama` (specialized for technical/code documents)

## Testing

### Backend Testing
The backend uses Python's built-in `unittest` framework for testing:

```bash
# Run all backend tests
cd backend && python3 -m unittest discover -v

# Run specific test file
cd backend && python3 -m unittest test_server.py -v
cd backend && python3 -m unittest test_rag_pipeline.py -v

# Run tests with virtual environment
source venv/bin/activate
cd backend && python3 -m unittest discover -v
```

**Test Files**:
- `backend/test_server.py` - Tests Flask API endpoints, file upload validation, and error handling
- `backend/test_rag_pipeline.py` - Tests RAG pipeline components, document loading, and embeddings

**Testing Notes**:
- Tests require dependencies to be installed: `pip install flask flask-cors langchain langchain-community python-dotenv werkzeug pypdf ollama`
- Some tests mock external dependencies (Ollama model, file system) to run in isolation
- RAG pipeline tests use sample documents from `backend/uploads/test_contract.txt`

### Frontend Testing  
The frontend uses Jest with React Testing Library:

```bash
# Install test dependencies (already added to package.json)
cd frontend && npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

**Test Configuration**:
- `frontend/jest.config.js` - Jest configuration with Next.js integration
- `frontend/jest.setup.js` - Test setup with React Testing Library matchers
- `frontend/__tests__/` - Test files directory

**Test Files**:
- `frontend/__tests__/Upload.test.js` - Tests file upload component rendering and interactions

**Testing Notes**:
- Jest configuration includes Next.js support for proper component testing
- Tests mock Next.js router and axios HTTP calls to avoid external dependencies
- Some tests may require additional setup for complex Next.js components with hooks
- Testing library focuses on user interaction patterns rather than implementation details

### Integration Testing Workflow
1. **Backend**: Start with unit tests, then integration tests with actual Ollama model
2. **Frontend**: Component tests, then E2E tests with running backend
3. **Full Stack**: Upload document → Query AI → Verify response flow

### Test Data Setup
- Use `backend/uploads/test_contract.txt` for consistent test data
- Mock Ollama responses for faster test execution
- Create temporary test files when needed, clean up after tests

### Continuous Integration
Run both frontend and backend tests before commits:
```bash
# Full test suite
cd backend && python3 -m unittest discover -v
cd ../frontend && npm test -- --watchAll=false
```

## Build & Configuration Details

### Python Environment Management
**Critical**: Always use virtual environment to avoid dependency conflicts:
```bash
# Create virtual environment (one time setup)
python3 -m venv venv

# Activate virtual environment (every session)
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install essential dependencies only
pip install flask flask-cors langchain langchain-community python-dotenv werkzeug pypdf ollama

# Verify installation
python3 -c "import langchain; print('LangChain installed successfully')"
python3 -c "import ollama; print('Ollama client installed successfully')"
```

### Frontend Build Configuration
**Next.js Configuration**:
- TypeScript enabled with mixed JS/JSX components
- Tailwind CSS for styling with Ionic React components
- Jest configured for testing with Next.js integration

**Package Management**:
```bash
# Clean install (if node_modules corruption)
rm -rf node_modules package-lock.json && npm install

# Check for security vulnerabilities
npm audit && npm audit fix

# Update dependencies (use with caution)
npm update
```

### Port Configuration
**Backend Server**: `backend/server.py:110`
- Default: `port="8081"`
- Health check: `GET http://127.0.0.1:8081/`
- Upload endpoint: `POST http://127.0.0.1:8081/upload_file`
- Query endpoint: `POST http://127.0.0.1:8081/ask_ai`

**Frontend Development Server**: `frontend/package.json`
- Default: `http://localhost:3000`
- Production build: `npm run build && npm start`

### Database Configuration
**ChromaDB Vector Store**:
- Location: `../data/chroma_db/` (relative to backend directory)
- Auto-created when first document is processed
- Persistent storage for document embeddings
- **Cleanup**: Delete directory to reset vector store

## Development Workflow & Debugging

### Recommended Development Sequence
1. **Environment Setup**:
   ```bash
   # Terminal 1: Start Ollama
   ollama serve
   
   # Terminal 2: Backend
   source venv/bin/activate
   cd backend && python3 server.py
   
   # Terminal 3: Frontend  
   cd frontend && npm run dev
   ```

2. **Testing Workflow**:
   ```bash
   # Run tests before committing
   source venv/bin/activate
   cd backend && python3 -m unittest discover -v
   cd ../frontend && npm test -- --watchAll=false
   ```

### Common Development Issues & Solutions

**1. ModuleNotFoundError: langchain_community**
```bash
# Solution: Activate virtual environment and install dependencies
source venv/bin/activate
pip install langchain-community
```

**2. Ollama Connection Error**
```bash
# Check Ollama is running
curl http://localhost:11434/api/version

# If not running:
ollama serve

# Verify model is available
ollama list
```

**3. Frontend Build Issues**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**4. CORS Issues**
- Backend uses `flask-cors` for cross-origin requests
- Default allows all origins in development
- Modify `backend/server.py:20` for production restrictions

### Debugging Tools & Techniques

**Backend Debugging**:
```bash
# Enable Flask debug mode (backend/server.py:110)
app.run(debug=True, port="8081")

# Check RAG pipeline logs
# Add print statements in rag_pipeline.py for document processing flow

# Monitor ChromaDB creation
ls -la ../data/chroma_db/
```

**Frontend Debugging**:
```bash
# Start development server with detailed logging
npm run dev -- --debug

# Check browser console for JavaScript errors
# Use React Developer Tools browser extension

# Component state debugging
console.log('Component state:', state) # Add to component code
```

**Full Stack Integration Debugging**:
```bash
# Monitor network requests
# Browser DevTools → Network tab
# Check request/response for /upload_file and /ask_ai

# Backend request logging
# Flask automatically logs requests in debug mode

# Test endpoints directly
curl -X GET http://127.0.0.1:8081/
curl -X POST http://127.0.0.1:8081/upload_file -F "file=@backend/uploads/test_contract.txt"
```

### Performance Considerations

**Backend Optimization**:
- RAG pipeline creates global `qa_chain` variable for conversation state
- ChromaDB vector store persists between requests (no re-indexing)
- Ollama model loads on first request (can take 10-30 seconds)

**Frontend Optimization**:
- Next.js auto-optimizes components and images
- Use `npm run build` for production optimization
- Lazy load components for better performance

### Code Style Guidelines

**Python Backend**:
- Follow PEP 8 style guidelines
- Use global state sparingly (currently: `qa_chain`)
- Error handling with try/catch blocks
- File paths use forward slashes for cross-platform compatibility

**JavaScript/TypeScript Frontend**:
- Mixed JS/JSX and TS/TSX files (maintain existing pattern)
- Tailwind CSS classes for styling
- React hooks for state management
- Async/await for API calls

### Security Best Practices
- No API keys required (Ollama runs locally)
- File uploads restricted to: PDF, DOC, DOCX, TXT
- Upload directory: `backend/uploads/` (server-side validation)
- Use `secure_filename()` for uploaded files
- CORS configured for development (review for production)

## Troubleshooting Quick Reference

**Backend Won't Start**:
1. Check virtual environment is activated
2. Verify all dependencies installed: `pip list | grep -E "(flask|langchain|ollama)"`
3. Ensure Ollama is running: `ollama list`
4. Check port 8081 is available: `lsof -i :8081`

**Frontend Build Fails**:
1. Clear cache: `rm -rf .next node_modules`
2. Reinstall: `npm install`
3. Check Node.js version compatibility
4. Review TypeScript errors: `npx tsc --noEmit`

**Tests Failing**:
1. Backend: Check virtual environment and mocked dependencies
2. Frontend: Verify Jest configuration and mocked modules
3. Run tests individually to isolate issues: `npm test -- --testNamePattern="specific test"`

**RAG Pipeline Issues**:
1. Check document upload success in `backend/uploads/`
2. Verify ChromaDB directory creation: `../data/chroma_db/`
3. Monitor Ollama model loading time (first request is slow)
4. Check document format is supported (PDF, DOCX, TXT)