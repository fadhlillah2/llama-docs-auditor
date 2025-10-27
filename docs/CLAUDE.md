# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Guide - SIMPLIFIED ⚡

### 🚀 One-Command Setup & Run
```bash
# 1. Setup everything (one time only)
./setup-project.sh

# 2. Run the project (starts all services)
./run-project.sh
```

That's it! The scripts handle everything automatically.

### 📋 Manual Prerequisites (if needed)
If the automated setup fails, ensure these are installed:
- **Python 3.8+**: `python3 --version`
- **Node.js 18+**: `node --version`
- **Groq API Key**: Get from https://console.groq.com/keys
  - Add to .env file: `GROQ_API_KEY=gsk_your-actual-key`

### 🎯 Access Points
- **Frontend**: http://localhost:3000
- **Backend**: http://127.0.0.1:8081

### ✅ Current Status - FULLY WORKING
- ✅ **File upload**: Works perfectly
- ✅ **Document processing**: Loads, chunks, creates embeddings
- ✅ **Chat AI**: Fully functional with transformers dependency
- ✅ **Session management**: Proper session-based state
- ✅ **All dependencies**: Tested and verified

### 🧪 Quick Test
1. Run `./run-project.sh`
2. Open http://localhost:3000
3. Upload any PDF/TXT file
4. Ask questions about the document
5. **First response is fast with Groq** (no local model loading)
6. All responses are consistently fast!

### 🔧 What the Scripts Do

**setup-project.sh:**
- Creates Python virtual environment
- Installs working dependencies (no conflicts!)
- Installs Groq dependencies (langchain-groq)
- Sets up Groq API integration for fast cloud inference
- Sets up frontend dependencies
- Creates data directories

**run-project.sh:**
- Starts Ollama server
- Starts backend (Flask API)
- Starts frontend (Next.js)
- Monitors all services
- Provides status updates
- Handles graceful shutdown with Ctrl+C

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

## Development Commands - UPDATED ✨

### 🚀 Simplified Development Workflow
```bash
# Setup (one time only)
./setup-project.sh

# Development (daily use)
./run-project.sh

# That's it! All services start automatically
```

### 🛠️ Manual Development (Advanced)
If you need to run services individually:

**Backend:**
```bash
source .venv/bin/activate  # Use the created venv
cd backend && python3 server.py
```

**Frontend:**
```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Code linting
```

**Ollama:**
```bash
ollama serve         # Start Ollama server
ollama pull llama3.2:3b-instruct-q4_0  # Pull main model
ollama pull nomic-embed-text:latest   # Pull embedding model
```

### 📦 Dependencies - WORKING SET
The project now uses `requirements-working.txt` with tested dependencies:
- ✅ **Core**: flask, flask-cors, werkzeug, python-dotenv  
- ✅ **LangChain**: langchain, langchain-community, langchain-ollama
- ✅ **ML**: scikit-learn, numpy, transformers (critical!)
- ✅ **Documents**: pypdf
- ✅ **LLM**: ollama
- ❌ **ChromaDB**: Excluded due to conflicts (uses in-memory fallback)

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
# Pull the llama3.2:3b-instruct-q4_0 model (default for this project)
ollama pull llama3.2:3b-instruct-q4_0

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
3. **Model not available**: Run `ollama pull nomic-embed-text:latest` to download the embedding model
4. **Dependency conflicts**: Large requirements.txt with many packages - install essential ones manually:
   ```bash
   pip install flask flask-cors langchain langchain-community python-dotenv werkzeug pypdf ollama
   ```
5. **LangChain deprecations**: Uses `langchain_community` imports for Ollama and document loaders
6. **Virtual environment**: Always use venv to avoid system package conflicts
7. **Global state**: `qa_chain` must be initialized via file upload before querying

## Model Configuration

Change model by updating `OLLAMA_MODEL_NAME` in `rag/rag_pipeline.py:12` and default parameter in `rag/chat_model.py:4`:
- `llama3.2:3b-instruct-q4_0` (default, 3B parameters quantized, fast and efficient, **first load: 1-2 min**)
- `nomic-embed-text:latest` (embedding model, fast and efficient, first load: 10-30 sec)
- `llama2` (7B parameters, larger context, first load: 2-3 min)
- `mistral` (7B parameters, good quality, first load: 2-3 min)
- `deepseek-r1:8b` (8B parameters, reasoning focused but slow, first load: 3-5 min)
- `codellama` (specialized for technical/code documents, first load: 2-3 min)

**Note**: Larger models provide better quality responses but take longer to load initially. Once loaded, response times are similar.

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

## Code Style & Development Guidelines

### Python Backend Code Style
- **PEP 8 Compliance**: Follow PEP 8 style guidelines strictly
- **Import Organization**: Standard library imports first, then third-party, then local imports
- **Global State**: Minimize use of global variables (currently: `qa_chain` in server.py)
- **Error Handling**: Always use try/except blocks for external API calls and file operations
- **Type Hints**: Use type hints where possible for better code documentation
- **File Paths**: Use forward slashes for cross-platform compatibility

**Example Code Pattern**:
```python
from typing import Optional
import os
from flask import Flask, request, jsonify

def process_file(file_path: str) -> Optional[dict]:
    """Process uploaded file with proper error handling."""
    try:
        # Processing logic here
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
```

### Frontend Code Style (Next.js + TypeScript)
- **Mixed JS/JSX and TS/TSX**: Maintain existing pattern (components in JSX, pages in TSX)
- **Component Structure**: Use functional components with hooks
- **State Management**: React hooks for local state, Axios for API calls
- **Styling**: Tailwind CSS classes with Ionic React components
- **Async Operations**: Use async/await pattern consistently

**Example Component Pattern**:
```jsx
import { useState, useEffect } from 'react'
import axios from 'axios'

const MyComponent = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleApiCall = async () => {
    setLoading(true)
    try {
      const response = await axios.post('http://127.0.0.1:8081/api', data)
      setData(response.data)
    } catch (error) {
      console.error('API call failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      {loading ? 'Loading...' : 'Ready'}
    </div>
  )
}
```

## Environment & Dependency Management

### Python Virtual Environment (Critical)
**Always use virtual environments** to prevent dependency conflicts:

```bash
# Initial setup (one time)
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Essential packages only (avoid full requirements.txt)
pip install flask flask-cors langchain langchain-community python-dotenv werkzeug pypdf ollama

# Verify critical dependencies
python3 -c "import langchain; print('✓ LangChain:', langchain.__version__)"
python3 -c "import ollama; print('✓ Ollama client installed')"
python3 -c "from flask import Flask; print('✓ Flask installed')"
```

### Node.js Package Management
```bash
# Clean reinstall if issues occur
rm -rf node_modules package-lock.json
npm install

# Security audit
npm audit && npm audit fix

# Check for outdated packages
npm outdated
```

### Ollama Model Management
```bash
# Essential model operations
ollama list                    # List installed models
ollama pull nomic-embed-text:latest        # Install embedding model
ollama serve                  # Start Ollama server

# Alternative models for different use cases
ollama pull llama2            # 7B params, good quality
ollama pull mistral           # 7B params, efficient
ollama pull deepseek-r1:8b    # 8B params, reasoning (slow)
ollama pull codellama         # Specialized for code/technical docs

# Check model status
curl http://localhost:11434/api/version
```

## Development Workflow Best Practices

### Recommended Terminal Setup
```bash
# Terminal 1: Ollama (always running)
ollama serve

# Terminal 2: Backend Development
source venv/bin/activate
cd backend
python3 server.py  # Development server with debug=True

# Terminal 3: Frontend Development  
cd frontend
npm run dev  # Next.js development server

# Terminal 4: Testing
source venv/bin/activate
cd backend && python3 -m unittest discover -v  # Backend tests
cd ../frontend && npm test -- --watchAll=false  # Frontend tests
```

### Git Workflow & Version Control
```bash
# Pre-commit testing workflow
git add .
source venv/bin/activate
cd backend && python3 -m unittest discover -v
cd ../frontend && npm test -- --watchAll=false
git commit -m "feat: your changes"

# Branch management
git checkout -b feature/your-feature
git push -u origin feature/your-feature
```

### File Organization Conventions
```
backend/
├── server.py              # Main Flask application
├── test_server.py         # Flask endpoint tests
├── test_rag_pipeline.py   # RAG component tests
└── uploads/               # Document storage (server-side)

frontend/
├── src/components/        # Reusable UI components (JSX)
├── src/pages/            # Next.js pages (TSX)
├── __tests__/            # Jest test files
└── jest.config.js        # Test configuration

rag/
├── rag_pipeline.py       # Main orchestrator
├── data_loader.py        # Document processing
├── embedding.py          # Vector embeddings
├── retriever.py          # ChromaDB integration
├── chat_model.py         # Ollama integration
└── conversation_chain.py # LangChain chain creation
```

## Advanced Configuration

### Performance Tuning
**Backend Optimization**:
- RAG pipeline caches `qa_chain` globally for performance
- ChromaDB persists vectors at `../data/chroma_db/` (no re-indexing)
- First Ollama request loads model (10-30 seconds delay expected)
- Use `debug=False` in production for Flask

**Frontend Optimization**:
- Next.js automatically optimizes components and images
- Use `npm run build` for production builds
- Consider lazy loading for large components
- Optimize bundle size with Next.js built-in analyzer

### Security Configuration
```python
# Production Flask settings (backend/server.py)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = '/secure/upload/path'   # Secure upload path
CORS(app, origins=['https://yourdomain.com'])         # Restrict CORS

# Secure file handling
from werkzeug.utils import secure_filename
filename = secure_filename(file.filename)
```

### Database & Vector Store Management
```bash
# ChromaDB operations
ls -la ../data/chroma_db/                    # Check vector store
rm -rf ../data/chroma_db/                    # Reset vector store
du -sh ../data/chroma_db/                    # Check storage usage

# Vector store debugging
python3 -c "
import chromadb
client = chromadb.PersistentClient(path='../data/chroma_db')
collections = client.list_collections()
print('Collections:', [c.name for c in collections])
"
```

## Debugging & Troubleshooting Guide

### Backend Debugging Techniques
```python
# Enable detailed logging (add to server.py)
import logging
logging.basicConfig(level=logging.DEBUG)

# Debug RAG pipeline (add to rag_pipeline.py)
def create_conversation_chain(self):
    print(f"📄 Loading documents from: {self.file_path}")
    documents = self.load_documents.load_documents()
    print(f"📄 Loaded {len(documents)} documents")
    # ... rest of pipeline
```

### Frontend Debugging Techniques
```javascript
// Component debugging (add to any component)
useEffect(() => {
  console.log('🔍 Component state:', { data, loading, error })
}, [data, loading, error])

// API call debugging
const handleApiCall = async () => {
  console.log('🚀 API Request:', { url, data })
  try {
    const response = await axios.post(url, data)
    console.log('✅ API Response:', response.data)
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message)
  }
}
```

### Network & Integration Debugging
```bash
# Test backend endpoints directly
curl -X GET http://127.0.0.1:8081/                                          # Health check
curl -X POST http://127.0.0.1:8081/upload_file -F "file=@test_contract.txt" # Upload test
curl -X POST http://127.0.0.1:8081/ask_ai -H "Content-Type: application/json" -d '{"prompt":"test"}' # Query test

# Monitor network traffic
# Use browser DevTools → Network tab for frontend requests
# Use Flask debug mode for backend request logging
```

### Common Error Solutions

**"ModuleNotFoundError: langchain_community"**
```bash
source venv/bin/activate
pip install langchain-community
```

**"Connection refused to Ollama"**
```bash
ollama serve  # Ensure Ollama is running
curl http://localhost:11434/api/version  # Test connection
```

**"TypeError: Cannot read properties of undefined"** (Frontend)
```bash
rm -rf .next node_modules
npm install
npm run dev
```

**"ChromaDB permission denied"**
```bash
sudo chown -R $USER:$USER ../data/chroma_db/
chmod -R 755 ../data/chroma_db/
```

**"Port 8081 already in use"**
```bash
lsof -i :8081          # Find process using port
kill -9 <PID>          # Kill process
# Or change port in backend/server.py line 110
```

### Development Tools & Extensions

**Recommended VS Code Extensions**:
- Python (Microsoft)
- Pylance (Microsoft) 
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Thunder Client (API testing)

**Chrome DevTools Setup**:
- React Developer Tools
- Network tab for API monitoring
- Console for JavaScript debugging

**Python Debugging Tools**:
```bash
# Interactive debugging
pip install ipdb
# Add to code: import ipdb; ipdb.set_trace()

# Code formatting
pip install black
black backend/server.py

# Linting
pip install flake8
flake8 backend/
```