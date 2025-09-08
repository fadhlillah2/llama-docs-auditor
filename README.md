# High-Precision Contract Advisor RAG

An AI-powered contract analysis system using Retrieval-Augmented Generation (RAG) technology. Upload contracts and ask questions to get intelligent responses.

## 🚀 Quick Start (2 Commands)

```bash
# 1. Setup everything (one time only)
./setup-project.sh

# 2. Run the project  
./run-project.sh
```

Then open: **http://localhost:3000**

## 📋 Requirements

- **Python 3.8+** 
- **Node.js 18+**
- **Ollama** - Install from [ollama.ai](https://ollama.ai)
  - macOS: `brew install ollama`
  - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`

## ✨ Features

- 📄 **Document Upload**: PDF, TXT, DOCX support
- 🤖 **AI Chat**: Ask questions about your contracts
- 🔍 **RAG Technology**: Retrieves relevant context before answering
- 💾 **Session Management**: Maintains conversation context
- 🚀 **Local AI**: Runs entirely on your machine (no API keys!)

## 🎯 How It Works

1. **Upload** a contract document through the web interface
2. **Ask questions** like "What are the payment terms?" or "Who is liable for damages?"
3. **Get intelligent answers** based on the actual document content
4. **Continue the conversation** with follow-up questions

## ⏰ Performance Notes

- **First AI response**: Takes 3-5 minutes (model loading)
- **Subsequent responses**: Much faster (~10-30 seconds)
- **Models used**: llama3.1:8b (main), qwen3:1.7b (embeddings)

## 🛠️ What's Included

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Flask API with LangChain RAG pipeline
- **AI Models**: Ollama with local LLM models
- **Document Processing**: PDF parsing and text chunking
- **Vector Search**: In-memory retrieval system

## 📚 Documentation

- **Full Setup Guide**: [docs/CLAUDE.md](docs/CLAUDE.md)
- **Development Docs**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Architecture Overview**: [docs/README.md](docs/README.md)

## 🐛 Troubleshooting

**Services won't start?**
```bash
# Check if Ollama is installed
ollama --version

# Check if ports are free
lsof -i :3000 -i :8081 -i :11434
```

**Dependencies issues?**
```bash
# Clean install
rm -rf .venv frontend/node_modules
./setup-project.sh
```

**Still having issues?** Check the detailed troubleshooting in [docs/CLAUDE.md](docs/CLAUDE.md)

---

Built for **Lizzy AI** - Autonomous AI Contract Lawyers