# Development Environment Setup Guide

*High-Precision Contract Advisor RAG - Complete Developer Onboarding*

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Python 3.8+ (check: `python3 --version`)
- Node.js 18+ (check: `node --version`)
- Git (check: `git --version`)

### One-Command Setup
```bash
# Clone and setup everything
git clone <repository-url>
cd High-Precision-Contract-Advisor-RAG
./setup-venv.sh dev  # Sets up Python environment with dev dependencies
cd frontend && npm install  # Sets up frontend dependencies
```

### Start Development Servers
```bash
# Terminal 1: Start Ollama (required for AI)
ollama serve

# Terminal 2: Start Backend (with hot reload)
source venv/bin/activate
cd backend && python3 dev_server.py

# Terminal 3: Start Frontend (with hot reload)
cd frontend && npm run dev
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8081
- Ollama API: http://localhost:11434

## 📋 Development Workflow

### Daily Development Routine
```bash
# 1. Activate environment
source venv/bin/activate  # or ./activate-env.sh

# 2. Pull latest changes
git pull origin main

# 3. Install any new dependencies
pip install -r requirements-dev.txt
cd frontend && npm install

# 4. Format and check code
./format-python.sh        # Format Python code
cd frontend && npm run fix-all  # Format frontend code

# 5. Run tests
cd backend && python -m pytest
cd frontend && npm test

# 6. Start development
# Follow "Start Development Servers" above
```

### Code Quality Checks
```bash
# Backend (Python)
./format-python.sh                    # Format with Black, isort
source venv/bin/activate
cd backend && python -m pytest        # Run tests
flake8 backend/ rag/                  # Style checking
mypy backend/ rag/                    # Type checking

# Frontend (TypeScript/React)  
cd frontend
npm run lint                          # ESLint checking
npm run format                        # Prettier formatting
npm run type-check                    # TypeScript checking
npm test                             # Jest testing
```

## 🏗️ Project Structure

```
High-Precision-Contract-Advisor-RAG/
├── backend/                 # Flask API server
│   ├── server.py           # Main application
│   ├── dev_server.py       # Development server with hot reload
│   ├── session_manager.py  # Session management
│   └── test_*.py          # Backend tests
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── components/    # React components (TSX)
│   │   ├── types/         # TypeScript type definitions
│   │   └── pages/         # Next.js pages
│   ├── __tests__/         # Frontend tests
│   └── package.json       # Frontend dependencies
├── rag/                    # RAG pipeline modules
│   ├── rag_pipeline.py    # Main orchestrator
│   ├── retriever.py       # Document retrieval
│   ├── vector_store.py    # ChromaDB integration
│   └── *.py              # Other RAG components
├── docs/                   # Documentation
│   ├── CLAUDE.md          # Main documentation
│   ├── tasks.md           # Implementation tasks
│   └── DEVELOPMENT.md     # This file
├── requirements.minimal.txt # Production dependencies (21 packages)
├── requirements-dev.txt    # Development dependencies
├── setup-venv.sh          # Environment setup script
└── format-python.sh       # Python formatting script
```

## 🔧 Configuration Files

### Python Configuration
- `pyproject.toml` - Black, isort, flake8, mypy configuration
- `requirements.minimal.txt` - Minimal production dependencies (21 packages)
- `requirements-dev.txt` - Development tools and testing dependencies
- `.env.example` - Environment variables template (200+ variables documented)

### Frontend Configuration
- `tsconfig.json` - TypeScript strict configuration
- `.eslintrc.json` - ESLint rules for React/TypeScript
- `.prettierrc` - Code formatting rules
- `package.json` - NPM scripts and dependencies
- `.husky/pre-commit` - Git pre-commit hooks

### Development Scripts
- `setup-venv.sh` - Automated Python environment setup
- `activate-env.sh` - Quick environment activation
- `format-python.sh` - Python code formatting
- `backend/dev_server.py` - Enhanced development server

## 🧪 Testing Strategy

### Backend Testing (pytest)
```bash
source venv/bin/activate
cd backend

# Run all tests
python -m pytest -v

# Run with coverage
python -m pytest --cov=. --cov-report=html

# Run specific test
python -m pytest test_server.py::test_upload_file -v

# Run tests in parallel
python -m pytest -n auto  # requires pytest-xdist
```

### Frontend Testing (Jest)
```bash
cd frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --testNamePattern="Upload"
```

### Integration Testing
```bash
# Start all services, then test full workflow
# 1. Ollama: ollama serve
# 2. Backend: python3 server.py  
# 3. Frontend: npm run dev
# 4. Upload a document via frontend
# 5. Ask questions and verify responses
```

## 🛠️ Development Tools

### Essential VS Code Extensions
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.pylint", 
    "ms-python.black-formatter",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-eslint"
  ]
}
```

### Browser Developer Tools
- React Developer Tools
- Redux DevTools (if using Redux)
- Network tab for API debugging
- Console for JavaScript debugging

### Command Line Tools
```bash
# Python tools (included in requirements-dev.txt)
black --version      # Code formatter
isort --version      # Import sorter  
flake8 --version     # Style checker
mypy --version       # Type checker
pytest --version     # Testing framework

# Node.js tools (included in package.json)
npm run lint         # ESLint
npm run format       # Prettier
npm run type-check   # TypeScript compiler
```

## 🚨 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check Python version
python3 --version  # Should be 3.8+

# Check virtual environment
source venv/bin/activate
which python  # Should point to venv/bin/python

# Check dependencies
pip list | grep -E "(flask|langchain|ollama)"

# Check port availability
lsof -i :8081  # Kill if occupied: kill -9 <PID>
```

**Frontend build fails:**
```bash
# Clear cache
rm -rf .next node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+

# Check TypeScript errors
npm run type-check
```

**Ollama not working:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Start Ollama
ollama serve

# Pull required model
ollama pull nomic-embed-text:latest

# List available models
ollama list
```

**Tests failing:**
```bash
# Backend tests
source venv/bin/activate
cd backend
python -m pytest -v --tb=short

# Frontend tests  
cd frontend
npm test -- --verbose

# Clear test cache
cd frontend && npm test -- --clearCache
```

**Git pre-commit hooks failing:**
```bash
# Install pre-commit dependencies
cd frontend && npm install

# Run checks manually
npm run check-all
./format-python.sh

# Skip hooks temporarily (not recommended)
git commit --no-verify
```

### Performance Issues

**Slow AI responses (30s+):**
- Expected on first query (model loading)
- Check Ollama logs: `ollama logs`
- Try smaller model: `ollama pull nomic-embed-text:latest`
- Monitor system resources during queries

**Memory usage high:**
- Restart development servers periodically
- Clear browser cache and refresh
- Check ChromaDB storage: `du -sh ../data/chroma_db/`

### Development Environment Corruption

**Nuclear option (reset everything):**
```bash
# Stop all servers (Ctrl+C)

# Reset Python environment
rm -rf venv
./setup-venv.sh dev

# Reset frontend
cd frontend
rm -rf node_modules .next package-lock.json
npm install

# Reset ChromaDB
rm -rf ../data/chroma_db/

# Restart Ollama
killall ollama
ollama serve
ollama pull nomic-embed-text:latest
```

## 📈 Performance Monitoring

### Development Metrics
```bash
# Backend performance
curl http://127.0.0.1:8081/session/info  # Session stats

# Frontend bundle size
cd frontend && npm run build
# Check .next folder size

# Python memory usage
pip install memory-profiler
python -m memory_profiler backend/server.py
```

### Production Readiness Checklist
- [ ] All tests passing (`npm test` and `pytest`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`, `flake8`)
- [ ] Code formatted (`npm run format`, `./format-python.sh`)
- [ ] Environment variables configured (`.env.example` → `.env`)
- [ ] SSL certificates configured for production
- [ ] Rate limiting and authentication enabled
- [ ] Dependencies reviewed and updated
- [ ] Performance tested with realistic load
- [ ] Security scan completed (`npm audit`, `safety check`)

## 🆘 Getting Help

### Documentation Hierarchy
1. **CLAUDE.md** - Main technical documentation
2. **DEVELOPMENT.md** - This file (development guide)
3. **tasks.md** - Implementation progress tracking
4. **plan.md** - Technical specifications and rationale

### Debug Information Collection
When reporting issues, include:
```bash
# Environment information
python3 --version
node --version
ollama version

# Dependency versions
pip list | grep -E "(flask|langchain|ollama)"
cd frontend && npm list --depth=0

# Server status
curl http://127.0.0.1:8081/
curl http://localhost:11434/api/version

# Recent logs (last 50 lines)
tail -50 ~/.ollama/logs/server.log
```

### Community Resources
- GitHub Issues: Report bugs and request features
- Documentation: Comprehensive guides in `docs/` folder
- Code Examples: Check test files for usage examples

---

*This development environment is optimized for the High-Precision Contract Advisor RAG system. For production deployment, refer to CLAUDE.md for additional configuration requirements.*