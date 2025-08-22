# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

High-Precision Contract Advisor RAG is a contract Q&A system using Retrieval-Augmented Generation (RAG) technology. The system combines a Flask backend with LangChain for document processing and a Next.js frontend for user interaction.

## Architecture

### Backend (Flask + LangChain RAG)
- **Entry point**: `backend/server.py` - Flask server running on port 8080
- **RAG pipeline**: `rag/rag_pipeline.py` - Main orchestrator for document processing
- **Core modules**:
  - `rag/data_loader.py` - Document loading (PDF, DOCX, TXT)
  - `rag/embedding.py` - Vector embeddings creation
  - `rag/retriever.py` - Document retrieval logic
  - `rag/chat_model.py` - OpenAI GPT-3.5-turbo integration
  - `rag/conversation_chain.py` - Chain creation for Q&A

### Frontend (Next.js + TypeScript)
- **Entry point**: `frontend/src/pages/index.tsx`
- **Key components**: Upload interface, Chat interface, and Bot components
- **Styling**: Tailwind CSS with Ionic React components

## Development Commands

### Backend Setup and Run
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (essential packages only due to conflicts)
pip install flask flask-cors langchain langchain-openai langchain-community python-dotenv werkzeug pypdf

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

Create `.env` file in project root:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Key Endpoints

- **Backend**: http://127.0.0.1:8080
  - `POST /upload_file` - Upload contract documents
  - `POST /ask_ai` - Query uploaded documents
- **Frontend**: http://localhost:3000

## File Upload Support

Supported formats: PDF, DOCX, DOC, TXT
Upload directory: `backend/uploads/`
Vector store: `../data/chroma_db/`

## Important Notes

- Uses OpenAI GPT-3.5-turbo model for chat completion
- ChromaDB for vector storage (minimal installation due to dependency conflicts)
- Global `qa_chain` variable maintains conversation state in Flask server
- Document processing pipeline: Load → Embed → Store → Retrieve → Generate

## Common Issues

1. **Dependency conflicts**: Some packages in requirements.txt may conflict - install essential packages manually
2. **LangChain deprecations**: Update imports to use `langchain_community` modules
3. **OpenAI API key**: Required for backend functionality
4. **Virtual environment**: Always use venv to avoid system package conflicts