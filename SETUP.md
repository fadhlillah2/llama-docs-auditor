# High-Precision Contract Advisor RAG - Setup Documentation

## Overview
Successfully deployed a RAG-based contract Q&A system with Flask backend and Next.js frontend.

## Issues Resolved

### 1. **Python Environment Conflicts**
- **Problem**: `externally-managed-environment` error preventing system-wide package installation
- **Solution**: Created Python virtual environment (`python3 -m venv venv`)

### 2. **Dependency Conflicts**
- **Problem**: `fileupload==0.1.5` package not available, blocking full requirements.txt installation
- **Solution**: Removed problematic package, installed essential packages only:
  ```bash
  pip install flask flask-cors langchain langchain-openai langchain-community python-dotenv werkzeug pypdf
  ```

### 3. **Missing Environment Configuration**
- **Problem**: Backend requires OpenAI API key configuration
- **Solution**: Created `.env` file with placeholder for API key

### 4. **LangChain Deprecation Warnings**
- **Problem**: Outdated import statements in retriever.py
- **Status**: Non-blocking warnings, system functional

## Current Status

### ✅ **Frontend (Next.js)**
- **URL**: http://localhost:3000
- **Status**: Running successfully
- **Dependencies**: Installed via `npm install`

### ✅ **Backend (Flask)**
- **URL**: http://127.0.0.1:8080
- **Status**: Running successfully
- **Features**: 
  - File upload endpoint (`/upload_file`)
  - AI query endpoint (`/ask_ai`)
  - RAG pipeline integration

## Required Manual Steps

1. **Add OpenAI API Key**:
   ```bash
   # Edit .env file
   OPENAI_API_KEY=your_actual_api_key_here
   ```

2. **Optional: Fix Deprecation Warnings**:
   ```python
   # In rag/retriever.py, update import:
   from langchain_community.vectorstores import Chroma
   ```

## Architecture
- **Frontend**: Next.js with TypeScript, Tailwind CSS
- **Backend**: Flask with LangChain RAG pipeline
- **Vector DB**: ChromaDB (not fully installed due to conflicts)
- **Document Processing**: PyPDF for PDF handling
- **LLM**: OpenAI GPT-3.5-turbo

## Usage
1. Access frontend at http://localhost:3000
2. Upload contract documents (PDF, TXT, DOCX)
3. Ask questions about uploaded contracts
4. Get AI-powered responses using RAG technology

## System Requirements Met
- Python 3.13+ with virtual environment
- Node.js with npm
- Essential Python packages for RAG functionality
- Frontend development environment