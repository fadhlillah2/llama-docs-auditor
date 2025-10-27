# 🚀 Setup Guide - Contract Advisor RAG with EasyOCR

Panduan instalasi lengkap untuk sistem analisis kontrak AI dengan kemampuan OCR gambar dokumen Bahasa Indonesia.

## 📋 Prerequisites

### **Wajib (Required)**
- **Python 3.8+** (direkomendasikan Python 3.10 untuk EasyOCR terbaik)
- **Node.js 18+**
- **Groq API Key** - Dapatkan dari https://console.groq.com/keys (WAJIB)

### **Opsional**
- **Git** - Untuk clone repository
- **CMake** - Untuk dependency OpenCV (biasanya sudah terinstall)

## ⚡ Quick Start (2 Commands)

```bash
# 1. Setup semua dependencies (sekali saja)
./setup-project.sh

# 2. Jalankan aplikasi
./run-project.sh
```

Kemudian buka: **http://localhost:3000**

## 🔧 Manual Setup (Jika otomasi gagal)

### **1. Clone Repository**
```bash
git clone <repository-url>
cd llama-docs-auditor
```

### **2. Setup Backend**
```bash
# Buat virtual environment
python3 -m venv .venv

# Aktifkan virtual environment
source .venv/bin/activate  # macOS/Linux
# atau
.venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements-working.txt

# Install EasyOCR khusus
pip install easyocr>=1.7.0 opencv-python<4.12
```

### **3. Setup Frontend**
```bash
cd frontend
npm install
cd ..
```

### **4. Setup Environment**
```bash
# Copy file environment
cp .env.example .env

# Edit file .env dan tambahkan:
# GROQ_API_KEY=gsk_your-actual-key
```

### **5. Jalankan Aplikasi**
```bash
# Jalankan backend (terminal 1)
cd backend
source ../.venv/bin/activate
python server.py

# Jalankan frontend (terminal 2)
cd frontend
npm run dev
```

## ✅ Verifikasi Instalasi

### **Test Backend**
```bash
curl http://127.0.0.1:8081/
# Output: Hello, World!
```

### **Test Frontend**
```bash
curl http://localhost:3000
# Output: HTML page
```

### **Test EasyOCR**
```bash
source .venv/bin/activate
python -c "import easyocr; print('✅ EasyOCR version:', easyocr.__version__)"
python test_easyocr.py
```

### **Test Groq API**
```bash
curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models
```

## 🖥️ Akses Aplikasi

- **Frontend**: http://localhost:3000
- **Backend API**: http://127.0.0.1:8081
- **Health Check**: http://127.0.0.1:8081/

## 📄 Cara Penggunaan

### **Upload Dokumen Gambar (Baru!)**
1. Buka http://localhost:3000
2. Upload gambar kontrak (PNG, JPG, TIFF)
3. Tunggu proses OCR (2-5 detik)
4. Ajukan pertanyaan:
   - "Apa isi teks pada gambar yang diupload?"
   - "Berapa jumlah pembayaran?"
   - "Siapa yang bertanggung jawab?"

### **Upload Dokumen Tradisional**
1. Upload PDF, DOCX, atau TXT
2. Ajukan pertanyaan tentang kontrak

## 🐛 Troubleshooting

### **Error Umum**

**"No Groq API key found"**
```bash
# Tambahkan ke file .env
echo "GROQ_API_KEY=gsk_your-actual-key" >> .env
```

**"EasyOCR not available"**
```bash
source .venv/bin/activate
pip install easyocr>=1.7.0 opencv-python<4.12
```

**"Port already in use"**
```bash
# Kill proses di port 3000 dan 8081
kill -9 $(lsof -t -i:3000) 2>/dev/null || true
kill -9 $(lsof -t -i:8081) 2>/dev/null || true
```

**"Python version incompatible"**
```bash
# Install Python 3.10 (direkomendasikan)
brew install python@3.10  # macOS
pyenv install 3.10.x      # Dengan pyenv
```

### **Cek Dependencies**
```bash
# Python version
python3 --version

# Node.js version
node --version

# Groq API Key
echo $GROQ_API_KEY

# EasyOCR installation
source .venv/bin/activate
python -c "import easyocr; print('EasyOCR OK')"

# OpenCV installation
python -c "import cv2; print('OpenCV OK')"
```

### **Clean Reinstall**
```bash
# Hapus semua cache dan reinstall
rm -rf .venv frontend/node_modules data/chroma_db cache/
./setup-project.sh
```

## 📊 Performance Tips

- **RAM minimal**: 4GB (direkomendasikan 8GB+ untuk EasyOCR)
- **Storage**: 2GB untuk models dan dependencies
- **First query**: 10-30 detik (model loading)
- **Subsequent queries**: 5-15 detik
- **EasyOCR processing**: 2-5 detik per gambar

## 🆘 Bantuan

- **Full Documentation**: [README.md](README.md)
- **Technical Details**: [docs/CLAUDE.md](docs/CLAUDE.md)
- **EasyOCR Details**: [EASYOCR_IMPLEMENTATION_SUMMARY.md](EASYOCR_IMPLEMENTATION_SUMMARY.md)
- **Issues**: Open issue di GitHub repository

## 🎉 Success Indicators

✅ Setup berhasil jika:
- Backend running di http://127.0.0.1:8081
- Frontend running di http://localhost:3000
- EasyOCR bisa import tanpa error
- Groq API key valid dan terkoneksi
- Bisa upload gambar dan dapatkan respons

---

**🇮🇩 Sistem analisis kontrak dengan OCR Bahasa Indonesia**
**🚀 Powered by Groq AI + EasyOCR + ChromaDB**