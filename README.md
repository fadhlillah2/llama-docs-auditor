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
- **Groq API Key** - Get from https://console.groq.com/keys (REQUIRED)
  - Add to .env file: `GROQ_API_KEY=gsk_your-actual-key`
  - This is the primary LLM provider - Ollama is deprecated
- **Ollama** (deprecated, optional fallback only) - Install from [ollama.ai](https://ollama.ai)
  - macOS: `brew install ollama`
  - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`

## ✨ Features

- 📄 **Document Upload**: PDF, TXT, DOCX support
- 🤖 **AI Chat**: Ask questions about your contracts
- 🔍 **RAG Technology**: Retrieves relevant context before answering
- 💾 **Session Management**: Maintains conversation context
- 🚀 **Fast AI**: Powered by Groq cloud inference (fast, high-quality responses)
- 🔄 **Fallback**: Local Ollama support when internet is unavailable (deprecated)

## 🎯 How It Works

1. **Upload** a contract document through the web interface
2. **Ask questions** like "What are the payment terms?" or "Who is liable for damages?"
3. **Get intelligent answers** based on the actual document content
4. **Continue the conversation** with follow-up questions

## ⏰ Performance Notes

- **First AI response**: 10-30 seconds (Groq cloud inference, API initialization)
- **Subsequent responses**: 5-15 seconds (cached embeddings, established session)
- **Models used**: Groq llama-3.3-70b-versatile (primary), HuggingFace embeddings (local)

## 🛠️ What's Included

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Flask API with LangChain RAG pipeline
- **AI Models**: Groq cloud inference (primary) with Ollama fallback (deprecated)
- **Document Processing**: PDF parsing and text chunking
- **Vector Search**: In-memory retrieval system

## 📚 Documentation

- **Full Setup Guide**: [docs/CLAUDE.md](docs/CLAUDE.md)
- **Development Docs**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Architecture Overview**: [docs/README.md](docs/README.md)

## 🐛 Troubleshooting

**Services won't start?**
```bash
# Check if Groq API key is set
echo $GROQ_API_KEY

# Check if Ollama is installed (deprecated)
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

---

Need something like this built for your product? See [services & proven outcomes](https://fadhlillah2.github.io/Bio/#services) · WhatsApp: [wa.me/6285157043131](https://wa.me/6285157043131)
