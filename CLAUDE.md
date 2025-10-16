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
- **Ollama** - Install from [ollama.ai](https://ollama.ai)
  - macOS: `brew install ollama`
  - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`

### 🎯 Access Points
- **Frontend**: http://localhost:3000
- **Backend**: http://127.0.0.1:8081

## Project Overview

High-Precision Contract Advisor RAG is an AI-powered contract analysis system using Retrieval-Augmented Generation (RAG) technology. Upload contracts and ask questions to get intelligent responses based on the actual document content.

## Architecture

### Backend (Flask + LangChain RAG)
- **Entry point**: `backend/server.py` - Flask server running on port 8081
- **RAG pipeline**: `rag/rag_pipeline.py` - Main orchestrator for document processing
- **Core modules**:
  - `rag/data_loader.py` - Document loading (PDF, DOCX, TXT)
  - `rag/embedding.py` - Vector embeddings creation
  - `rag/retriever.py` - Document retrieval with vector store
  - `rag/chat_model.py` - Ollama integration for local AI
  - `rag/conversation_chain.py` - LangChain conversation chain creation

### Frontend (Next.js + TypeScript)
- **Entry point**: `frontend/src/pages/index.tsx` - Main layout with Upload and Chat components
- **Key components**:
  - `Upload.jsx` - File upload interface
  - `Chat.jsx` - Chat interface for Q&A
  - `Bot.jsx` - Bot response handling
- **Styling**: Tailwind CSS with Ionic React components
- **State management**: React hooks with Axios for API calls

## Development Commands

### Quick Development Workflow
```bash
# Setup (one time only)
./setup-project.sh

# Development (daily use)
./run-project.sh
```

### Manual Development (Advanced)
**Backend:**
```bash
source .venv/bin/activate
cd backend && python3 server.py
```

**Frontend:**
```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Code linting
npm run test         # Run tests
```

**Ollama:**
```bash
ollama serve         # Start Ollama server
ollama pull llama3.2:3b-instruct-q4_0  # Pull main model
ollama pull nomic-embed-text:latest   # Pull embedding model
```

## Key Endpoints

- **Backend**: http://127.0.0.1:8081
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
   - `EmbeddingsCreator` - Creates vector embeddings
   - `Retriever` - Sets up vector store for document retrieval
   - `ChatModel` - Initializes Ollama model connection
   - `ConversationChain` - Creates LangChain retrieval QA chain

3. **Query Processing** (`/ask_ai`):
   - Accepts user questions via JSON POST
   - Uses global `qa_chain.invoke()` with question and chat history
   - Returns AI-generated answers based on retrieved document context

## Testing

### Backend Testing
```bash
cd backend && python3 -m unittest discover -v
```

### Frontend Testing
```bash
cd frontend && npm test
```

## Common Issues

1. **Port conflict**: Backend runs on 8081
2. **Ollama not running**: Ensure `ollama serve` is running before starting backend
3. **Model not available**: Run `ollama pull llama3.2:3b-instruct-q4_0` to download the model
4. **Dependency conflicts**: Always use virtual environment
5. **Global state**: `qa_chain` must be initialized via file upload before querying

## Model Configuration

Default model: `llama3.2:3b-instruct-q4_0` (3B parameters, quantized, fast and efficient)
- First load: 1-2 minutes
- Subsequent queries: ~10-30 seconds
- Embedding model: `nomic-embed-text:latest`

## Environment & Dependencies

### Python Environment
**Critical**: Always use virtual environment:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend Dependencies
```bash
cd frontend && npm install
```

### Ollama Models
```bash
ollama pull llama3.2:3b-instruct-q4_0
ollama pull nomic-embed-text:latest
```

## Code Style Guidelines

- **Backend**: Follow PEP 8, use type hints, proper error handling
- **Frontend**: Functional components with hooks, Tailwind CSS, async/await for API calls
- **Security**: File uploads restricted to PDF, DOC, DOCX, TXT; use `secure_filename()`

## Performance Notes

- **First AI response**: Takes 1-2 minutes (model loading)
- **Subsequent responses**: Much faster (~10-30 seconds)
- **Vector store**: Persists between requests for performance
- **Global state**: Maintains conversation context via `qa_chain`