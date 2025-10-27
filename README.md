# High-Precision Contract Advisor RAG with EasyOCR

An AI-powered contract analysis system using Retrieval-Augmented Generation (RAG) technology with advanced EasyOCR support for Indonesian contract documents. Upload contracts (PDF, DOCX, TXT, **Images**) and ask questions to get intelligent responses.

## 🚀 Quick Start (2 Commands)

```bash
# 1. Setup everything (one time only)
./setup-project.sh

# 2. Run the project
./run-project.sh
```

Then open: **http://localhost:3000**

## 📋 Requirements

- **Python 3.8+** (Python 3.10 recommended for best EasyOCR compatibility)
- **Node.js 18+**
- **Groq API Key** - Get from https://console.groq.com/keys (REQUIRED)
  - Add to .env file: `GROQ_API_KEY=gsk_your-actual-key`
  - This is the primary LLM provider

## ✨ Features

### 🆕 **EasyOCR Image Processing**
- 📸 **Image Support**: PNG, JPG, JPEG, TIFF, BMP document scans
- 🇮🇩 **Indonesian Language**: Optimized OCR for Indonesian contract documents
- 📄 **Document Structure**: Preserves PASAL, AYAT, BAB formatting
- 💰 **Currency Recognition**: Proper Rupiah (Rp) symbol handling
- 🔧 **Advanced Preprocessing**: 6 image enhancement variants for best results
- 📊 **Quality Assessment**: Automatic image quality evaluation

### 🤖 **AI & Document Processing**
- 📄 **Multi-format Support**: PDF, TXT, DOCX, Images
- 🤖 **AI Chat**: Ask questions about your contracts in Indonesian or English
- 🔍 **RAG Technology**: Retrieves relevant context before answering
- 💾 **Session Management**: Maintains conversation context
- 🚀 **Fast AI**: Powered by Groq cloud inference (llama-3.3-70b-versatile)
- 🧠 **Smart Retrieval**: Hybrid search with ChromaDB vector store

## 🎯 How It Works

### For Document Images (EasyOCR)
1. **Upload** contract document image (screenshot, scan, or photo)
2. **Automatic OCR** with EasyOCR - optimized for Indonesian contracts
3. **Text Extraction** with Indonesian language corrections and structure preservation
4. **Ask questions** like "Apa isi teks pada gambar yang diupload?" or "What are the payment terms?"
5. **Get intelligent answers** based on the extracted document content

### For Traditional Documents
1. **Upload** PDF, DOCX, or TXT contract documents
2. **Automatic processing** with text extraction and chunking
3. **Ask questions** about your contract content
4. **Get intelligent answers** based on the actual document content

## 📄 Supported Document Types

### 🖼️ **Image Documents** (NEW - EasyOCR Enhanced)
- **PNG, JPG, JPEG, TIFF, BMP** screenshots and scans
- **Indonesian text recognition** with 88%+ accuracy
- **Contract structure preservation** (PASAL,条款, etc.)
- **Currency and number formatting** for Indonesian context
- **Quality-based processing** with multiple enhancement variants

### 📋 **Traditional Documents**
- **PDF** contract documents with full text extraction
- **DOCX/DOC** Microsoft Word documents
- **TXT** plain text files

## ⏰ Performance Notes

- **First AI response**: 10-30 seconds (Groq cloud inference, API initialization)
- **Subsequent responses**: 5-15 seconds (cached embeddings, established session)
- **EasyOCR processing**: 2-5 seconds per image (after model loading)
- **Models used**:
  - Groq llama-3.3-70b-versatile (primary LLM)
  - HuggingFace all-MiniLM-L6-v2 (embeddings)
  - EasyOCR 1.7.2 (image text extraction)

## 🛠️ Technical Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Flask API with LangChain RAG pipeline
- **OCR Engine**: EasyOCR with Indonesian + English language support
- **Vector Database**: ChromaDB with persistent storage
- **AI Models**: Groq cloud inference with HuggingFace embeddings
- **Image Processing**: OpenCV with 6 preprocessing variants

## 📚 Documentation

- **🚀 Quick Setup**: [SETUP.md](SETUP.md) - Panduan instalasi cepat
- **📖 Full Documentation**: [docs/CLAUDE.md](docs/CLAUDE.md) - Dokumentasi lengkap
- **🆕 EasyOCR Details**: [EASYOCR_IMPLEMENTATION_SUMMARY.md](EASYOCR_IMPLEMENTATION_SUMMARY.md) - Implementasi EasyOCR
- **🛠️ Development**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Panduan pengembang
- **🏗️ Architecture**: [docs/README.md](docs/README.md) - Overview arsitektur

## 📖 Usage Guide

### **For Indonesian Contract Images**
```bash
# 1. Start the application
./run-project.sh

# 2. Open http://localhost:3000

# 3. Upload contract image (PNG/JPG/TIFF)

# 4. Ask questions in Indonesian or English:
#    - "Apa isi teks pada gambar yang diupload?"
#    - "Berapa jumlah pembayaran yang disebutkan?"
#    - "Siapa yang bertanggung jawab atas pelanggaran?"
#    - "What are the payment terms?"
```

### **For Traditional Documents**
```bash
# 1. Upload PDF, DOCX, or TXT files

# 2. Ask questions about the contract:
#    - "What are the termination clauses?"
#    - "What is the liability coverage?"
#    - "When are payments due?"
```

## 🐛 Troubleshooting

### **Services won't start?**
```bash
# Check if Groq API key is set (REQUIRED)
echo $GROQ_API_KEY

# Check if ports are free
lsof -i :3000 -i :8081

# Verify Python version (3.10 recommended for EasyOCR)
python3 --version

# Check Node.js version
node --version
```

### **EasyOCR Issues**
```bash
# Check EasyOCR installation
source .venv/bin/activate
python -c "import easyocr; print('EasyOCR version:', easyocr.__version__)"

# Test EasyOCR functionality
python test_easyocr.py

# Verify OpenCV installation
python -c "import cv2; print('OpenCV version:', cv2.__version__)"
```

### **Dependencies Issues?**
```bash
# Clean install
rm -rf .venv frontend/node_modules
./setup-project.sh

# Reinstall EasyOCR specifically
source .venv/bin/activate
pip install easyocr>=1.7.0 opencv-python<4.12
```

### **Performance Issues**
```bash
# Check system resources
htop  # or Activity Monitor on macOS

# Monitor logs
tail -f logs/app.log

# Clear vector database if needed
rm -rf data/chroma_db/
```

### **Common Error Solutions**

**Error: "No Groq API key found"**
```bash
# Add to .env file
echo "GROQ_API_KEY=gsk_your-actual-key" >> .env
```

**Error: "EasyOCR not available"**
```bash
# Install EasyOCR manually
source .venv/bin/activate
pip install easyocr>=1.7.0
```

**Error: "Port already in use"**
```bash
# Kill processes on ports
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:8081)
```

**Error: "Session not found"**
```bash
# Upload a new document to create a fresh session
# Sessions timeout after 30 minutes automatically
```

### **Still having issues?**
- Check detailed troubleshooting in [docs/CLAUDE.md](docs/CLAUDE.md)
- Review EasyOCR implementation details in [EASYOCR_IMPLEMENTATION_SUMMARY.md](EASYOCR_IMPLEMENTATION_SUMMARY.md)
- Check backend logs: `tail -f logs/app.log`
- Verify frontend logs: Browser DevTools Console

## 🎯 Quick Test Commands

```bash
# Test EasyOCR directly
source .venv/bin/activate
python test_easyocr.py

# Test RAG pipeline
python -m rag.evaluation.rag_evaluator $(pwd)/data/uploads_test/sample_contract.txt

# Verify all services
curl http://127.0.0.1:8081/  # Backend health
curl http://localhost:3000   # Frontend health
```

---

**🇮🇩 Built for Indonesian Contract Analysis with Advanced OCR Support**
**🚀 Powered by Groq AI + EasyOCR + ChromaDB**
**📧 Support: Check documentation or open an issue**