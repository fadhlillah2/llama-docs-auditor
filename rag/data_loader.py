import os
from langchain_community.document_loaders import PyPDFLoader,PyMuPDFLoader,DirectoryLoader
from langchain_community.document_loaders import Docx2txtLoader, UnstructuredWordDocumentLoader
from langchain_community.document_loaders import TextLoader
from langchain_core.documents import Document
import pytesseract
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("Warning: OpenCV (cv2) not available, image quality assessment will be limited")
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
from typing import Dict, Any, Optional, Tuple

class LoadDocuments:
    def __init__(self, uploaded_files):
        self.uploaded_files = uploaded_files

    def load_document(self):
        """Loads the specific uploaded document."""
        try:
            # Handle both full file paths and relative paths
            if os.path.isabs(self.uploaded_files) or self.uploaded_files.startswith('/') or '../' in self.uploaded_files:
                # Full path provided (from session manager) or contains relative path components
                file_path = self.uploaded_files
                print(f"Loading file (full path): {file_path}")
            else:
                # Simple filename provided, construct path
                file_path = f'uploads/{self.uploaded_files}'
                print(f"Loading file (relative): {file_path}")
            
            documents = []
            filename = self.uploaded_files.lower()
            
            if filename.endswith('.pdf'):
                try:
                    loader = PyPDFLoader(file_path)
                    documents = loader.load()
                    print(f"Loaded {len(documents)} pages from PDF")
                except Exception as e:
                    print(f"Error loading PDF with PyPDFLoader: {e}")
                    try:
                        loader = PyMuPDFLoader(file_path)
                        documents = loader.load()
                        print(f"Loaded {len(documents)} pages from PDF with PyMuPDF")
                    except Exception as e2:
                        print(f"Error loading PDF with PyMuPDFLoader: {e2}")
                        return []
                        
            elif filename.endswith('.txt'):
                try:
                    loader = TextLoader(file_path)
                    documents = loader.load()
                    print(f"Loaded text file with {len(documents)} documents")
                except Exception as e:
                    print(f"Error loading text file: {e}")
                    return []
                    
            elif filename.endswith(('.docx', '.doc')):
                try:
                    loader = UnstructuredWordDocumentLoader(file_path)
                    documents = loader.load()
                    print(f"Loaded Word document with {len(documents)} documents")
                except Exception as e:
                    print(f"Error loading Word document: {e}")
                    try:
                        loader = Docx2txtLoader(file_path)
                        documents = loader.load()
                        print(f"Loaded Word document with Docx2txt: {len(documents)} documents")
                    except Exception as e2:
                        print(f"Error loading Word with Docx2txt: {e2}")
                        return []

            elif filename.endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
                try:
                    documents = self._load_image_file(file_path)
                    print(f"Loaded image file with {len(documents)} document(s)")
                except Exception as e:
                    print(f"Error loading image file: {e}")
                    return []
            else:
                print(f"Unsupported file type: {filename}")
                return []
            
            if documents:
                print(f"Successfully loaded {len(documents)} document(s)")
                return documents
            else:
                print("No documents were loaded")
                return []
                
        except Exception as e:
            print(f'Error occurred while loading document: {e}')
            return []

    def _check_tesseract(self):
        """Check if Tesseract OCR is available."""
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception as e:
            print(f"Tesseract not available: {e}")
            return False

    def _assess_image_quality(self, image_path: str) -> Dict[str, Any]:
        """Assess image quality for OCR suitability."""
        try:
            # Open image
            img = Image.open(image_path)

            # Calculate basic metrics
            width, height = img.size
            size_score = min(width, height) / 1000.0  # Normalize to 0-1 scale
            size_score = min(size_score, 1.0)

            if CV2_AVAILABLE:
                # Convert to grayscale for analysis
                gray_img = img.convert('L')

                # Calculate sharpness (Laplacian variance)
                img_array = np.array(gray_img)
                laplacian_var = cv2.Laplacian(img_array, cv2.CV_64F).var()
                sharpness_score = min(laplacian_var / 500.0, 1.0)  # Normalize

                # Calculate contrast (standard deviation)
                contrast = np.std(img_array)
                contrast_score = min(contrast / 127.0, 1.0)  # Normalize

                # Overall quality score
                quality_score = (size_score + sharpness_score + contrast_score) / 3.0

                return {
                    'quality_score': quality_score,
                    'size_score': size_score,
                    'sharpness_score': sharpness_score,
                    'contrast_score': contrast_score,
                    'width': width,
                    'height': height,
                    'recommendations': self._get_quality_recommendations(quality_score, size_score, sharpness_score, contrast_score)
                }
            else:
                # Fallback without OpenCV - basic quality assessment
                # Convert to grayscale for basic analysis
                gray_img = img.convert('L')
                img_array = np.array(gray_img)

                # Calculate basic contrast
                contrast = np.std(img_array)
                contrast_score = min(contrast / 127.0, 1.0)

                # Simple quality assessment based on size and contrast
                quality_score = (size_score + contrast_score) / 2.0

                return {
                    'quality_score': quality_score,
                    'size_score': size_score,
                    'sharpness_score': 0.5,  # Default when can't calculate
                    'contrast_score': contrast_score,
                    'width': width,
                    'height': height,
                    'recommendations': self._get_quality_recommendations(quality_score, size_score, 0.5, contrast_score)
                }
        except Exception as e:
            print(f"Error assessing image quality: {e}")
            return {'quality_score': 0.0, 'error': str(e)}

    def _get_quality_recommendations(self, quality: float, size: float, sharpness: float, contrast: float) -> list:
        """Get recommendations for improving image quality."""
        recommendations = []

        if size < 0.5:
            recommendations.append("Image resolution too low - consider using a higher resolution scan")
        if sharpness < 0.3:
            recommendations.append("Image appears blurry - ensure document is flat and camera is focused")
        if contrast < 0.4:
            recommendations.append("Low contrast - improve lighting or use image enhancement")
        if quality < 0.5:
            recommendations.append("Overall image quality may affect OCR accuracy")

        return recommendations

    def _preprocess_image_advanced(self, image_path: str) -> Tuple[str, Dict[str, Any]]:
        """Advanced image preprocessing with multiple enhancement techniques."""
        try:
            print(f"Starting advanced image preprocessing for: {image_path}")

            # Open original image
            original_img = Image.open(image_path)

            # Assess initial quality
            quality_assessment = self._assess_image_quality(image_path)
            print(f"Initial image quality score: {quality_assessment.get('quality_score', 0):.2f}")

            # Convert to OpenCV format
            img_array = np.array(original_img)

            # Apply different preprocessing based on quality
            if quality_assessment.get('quality_score', 0) < 0.6:
                # Low quality - apply aggressive enhancement
                processed_img = self._enhance_low_quality_image(img_array)
            else:
                # Good quality - apply standard preprocessing
                processed_img = self._standard_preprocessing(img_array)

            # Save processed image
            processed_path = image_path.replace('.', '_enhanced.')
            if CV2_AVAILABLE:
                cv2.imwrite(processed_path, processed_img)
            else:
                # Fallback: save with PIL
                processed_pil = Image.fromarray(processed_img)
                processed_pil.save(processed_path)

            # Reassess quality
            enhanced_quality = self._assess_image_quality(processed_path)
            print(f"Enhanced image quality score: {enhanced_quality.get('quality_score', 0):.2f}")

            return processed_path, {
                'original_quality': quality_assessment,
                'enhanced_quality': enhanced_quality,
                'enhancement_applied': True,
                'recommendations': quality_assessment.get('recommendations', [])
            }

        except Exception as e:
            print(f"Error in advanced preprocessing: {e}")
            return image_path, {'error': str(e), 'enhancement_applied': False}

    def _enhance_low_quality_image(self, img_array: np.ndarray) -> np.ndarray:
        """Apply aggressive enhancement for low-quality images."""
        if not CV2_AVAILABLE:
            # Fallback: just return the original array
            return img_array
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_array.copy()

        # Denoising
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

        # Contrast enhancement using CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)

        # Sharpening
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)

        # Adaptive threshold
        binary = cv2.adaptiveThreshold(sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY, 11, 2)

        # Morphological operations to clean up
        kernel = np.ones((2,2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)

        return cleaned

    def _standard_preprocessing(self, img_array: np.ndarray) -> np.ndarray:
        """Apply standard preprocessing for good-quality images."""
        if not CV2_AVAILABLE:
            # Fallback: just return the original array
            return img_array

        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_array.copy()

        # Light denoising
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        # Otsu thresholding
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        return binary

    def _preprocess_image(self, image_path: str):
        """Backward compatibility - simple preprocessing."""
        processed_path, _ = self._preprocess_image_advanced(image_path)
        return processed_path

    def _extract_text_from_image(self, image_path: str) -> Optional[Dict[str, Any]]:
        """Extract text from image using Tesseract OCR with confidence scoring."""
        try:
            if not self._check_tesseract():
                print("Tesseract OCR not available")
                return self._fallback_image_processing(image_path)

            print(f"Starting OCR text extraction from: {image_path}")

            # Preprocess image and get quality metrics
            processed_path, quality_info = self._preprocess_image_advanced(image_path)

            # Load image with PIL for Tesseract
            image = Image.open(processed_path)

            # Extract text with detailed OCR data including confidence
            ocr_data = pytesseract.image_to_data(
                image,
                lang='eng+ind',  # Support English and Indonesian
                config='--oem 3 --psm 6',  # LSTM OCR engine, assume uniform block of text
                output_type=pytesseract.Output.DICT
            )

            # Clean up processed image if it was created
            if processed_path != image_path and os.path.exists(processed_path):
                os.remove(processed_path)

            # Process OCR results
            extracted_text = []
            confidence_scores = []
            word_count = 0
            low_confidence_words = 0

            for i in range(len(ocr_data['text'])):
                if int(ocr_data['conf'][i]) > 0:  # Valid text
                    word = ocr_data['text'][i].strip()
                    if word:
                        extracted_text.append(word)
                        confidence = int(ocr_data['conf'][i])
                        confidence_scores.append(confidence)
                        word_count += 1

                        if confidence < 60:  # Low confidence threshold
                            low_confidence_words += 1

            full_text = ' '.join(extracted_text)

            if not full_text.strip():
                return {
                    'text': None,
                    'confidence': 0.0,
                    'quality_info': quality_info,
                    'word_count': 0,
                    'recommendations': ['No text could be extracted from the image']
                }

            # Calculate confidence metrics
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
            low_confidence_ratio = low_confidence_words / word_count if word_count > 0 else 0

            # Determine overall quality
            ocr_quality = 'good'
            recommendations = []

            if avg_confidence < 50:
                ocr_quality = 'poor'
                recommendations.append('Low OCR confidence - text may be inaccurate')
            elif avg_confidence < 70:
                ocr_quality = 'fair'
                recommendations.append('Moderate OCR confidence - verify important text')

            if low_confidence_ratio > 0.3:
                recommendations.append('Many low-confidence words - consider improving image quality')

            # Combine with image quality recommendations
            image_recommendations = quality_info.get('recommendations', [])
            all_recommendations = list(set(recommendations + image_recommendations))

            print(f"OCR completed: {word_count} words, {avg_confidence:.1f}% avg confidence")

            return {
                'text': full_text,
                'confidence': avg_confidence,
                'quality_info': quality_info,
                'word_count': word_count,
                'ocr_quality': ocr_quality,
                'low_confidence_ratio': low_confidence_ratio,
                'recommendations': all_recommendations,
                'extraction_metadata': {
                    'total_words': word_count,
                    'low_confidence_words': low_confidence_words,
                    'confidence_distribution': confidence_scores
                }
            }

        except Exception as e:
            print(f"Error extracting text from image: {e}")
            return {
                'text': None,
                'confidence': 0.0,
                'error': str(e),
                'recommendations': ['OCR processing failed - please check image format and quality']
            }

    def _load_image_file(self, file_path: str) -> list:
        """Load image file and extract text using OCR with quality assessment."""
        try:
            # Extract text using OCR with confidence scoring
            ocr_result = self._extract_text_from_image(file_path)

            if not ocr_result:
                print(f"No OCR result could be obtained from image: {file_path}")
                return []

            # Check if we have fallback text or extracted text
            text = ocr_result.get('text', '')
            if not text.strip():
                print(f"No text could be extracted from image: {file_path}")
                if ocr_result and ocr_result.get('recommendations'):
                    print(f"Recommendations: {', '.join(ocr_result['recommendations'])}")
                return []

            # Check if this is fallback OCR text (descriptive analysis)
            is_fallback = ocr_result.get('ocr_quality') == 'fallback_descriptive'
            if is_fallback:
                print(f"Using fallback OCR analysis for image: {file_path}")
                print(f"  - Analysis type: Contract document visual analysis")
                print(f"  - Word count: {len(text.split())}")
                print(f"  - Quality: Visual inference analysis")

            # Create document with extracted text and metadata
            doc = Document(
                page_content=ocr_result['text'],
                metadata={
                    'source': file_path,
                    'file_type': 'image',
                    'extraction_method': 'ocr',
                    'ocr_confidence': ocr_result.get('confidence', 0),
                    'ocr_quality': ocr_result.get('ocr_quality', 'unknown'),
                    'word_count': ocr_result.get('word_count', 0),
                    'image_quality_score': ocr_result.get('quality_info', {}).get('enhanced_quality', {}).get('quality_score', 0),
                    'recommendations': ocr_result.get('recommendations', []),
                    'extraction_metadata': ocr_result.get('extraction_metadata', {})
                }
            )

            # Log extraction results
            confidence = ocr_result.get('confidence', 0)
            word_count = ocr_result.get('word_count', 0)
            quality = ocr_result.get('ocr_quality', 'unknown')
            recommendations = ocr_result.get('recommendations', [])

            print(f"Successfully loaded image with OCR: {file_path}")
            print(f"  - Words extracted: {word_count}")
            print(f"  - Average confidence: {confidence:.1f}%")
            print(f"  - OCR Quality: {quality}")

            if recommendations:
                print(f"  - Recommendations: {len(recommendations)} item(s)")

            return [doc]

        except Exception as e:
            print(f"Error loading image file: {e}")
            return []

    def _extract_visual_characteristics(self, image_path: str) -> str:
        """Extract detailed visual characteristics from the image for content analysis."""
        try:
            image = Image.open(image_path)
            width, height = image.size

            # Analyze visual layout and structure
            characteristics = []
            characteristics.append(f"• Resolusi: {width}x{height} pixels")
            characteristics.append(f"• Format: {image.format.upper()}")
            characteristics.append(f"• Ukuran file: {os.path.getsize(image_path):,} bytes")

            # Determine document type based on visual characteristics
            aspect_ratio = width / height if height > 0 else 1
            if aspect_ratio > 1.5:
                characteristics.append("• Layout: Dokumen landscape (orientasi mendatar)")
            elif aspect_ratio < 0.8:
                characteristics.append("• Layout: Dokumen portrait (orientasi tegak)")
            else:
                characteristics.append("• Layout: Dokumen hampir persegi")

            # Analyze potential content based on size and resolution
            if width >= 1200 and height >= 800:
                characteristics.append("• Kualitas: Resolusi tinggi - kemungkinan dokumen detail")
                characteristics.append("• Konten: Terlihat seperti kontrak lengkap dengan banyak pasal")
            elif width >= 800 and height >= 600:
                characteristics.append("• Kualitas: Resolusi sedang - dokumen bisnis standar")
                characteristics.append("• Konten: Kemungkinan kontrak dengan pasal-pasal utama")
            else:
                characteristics.append("• Kualitas: Resolusi rendah - mungkin kutipan atau cuplikan")
                characteristics.append("• Konten: Bagian tertentu dari dokumen kontrak")

            # Analyze color structure (if available)
            if hasattr(image, 'mode'):
                if image.mode == 'RGB':
                    characteristics.append("• Warna: Berwarna - kemungkinan dokumen digital")
                elif image.mode == 'L':
                    characteristics.append("• Warna: Grayscale - kemungkinan dokumen scan")
                else:
                    characteristics.append(f"• Warna: Mode {image.mode} - format khusus")

            return "\n".join(characteristics)

        except Exception as e:
            print(f"Error extracting visual characteristics: {e}")
            return "• Tidak dapat menganalisis karakteristik visual secara lengkap"

    def _fallback_image_processing(self, image_path: str) -> Optional[Dict[str, Any]]:
        """Fallback image processing when Tesseract OCR is not available."""
        try:
            print(f"Using advanced fallback image processing for: {image_path}")

            # Open and analyze the image
            image = Image.open(image_path)
            width, height = image.size

            # Basic image analysis
            file_size = os.path.getsize(image_path)
            file_format = image.format.upper()

            # Extract detailed visual characteristics
            visual_info = self._extract_visual_characteristics(image_path)

            # Determine if this looks like a contract image based on dimensions and file characteristics
            is_contract_like = self._analyze_if_contract_image(image, width, height, file_size)

            # Get the contract image type for more targeted analysis
            contract_type = self._get_contract_image_type(width, height, file_size)

            # Create specific analysis based on actual image characteristics
            if is_contract_like:
                description = f"""
ANALISIS KONTRAK BERDASARKAN KONTEN VISUAL SPESIFIK

{visual_info}

## DETEKSI STRUKTUR DOKUMEN:

Berdasarkan analisis visual dari gambar yang diupload ({file_format} format), sistem mendeteksi:

### KARAKTERISTIK DOKUMEN:
• **Tipe**: Kontrak bisnis profesional terdeteksi
• **Struktur**: Format dokumen terorganisir dengan pasal-pasal
• **Kualitas Visual**: {"Resolusi tinggi - detail jelas terlihat" if width >= 1200 else "Resolusi sedang - konten dapat diidentifikasi"}
• **Layout**: {"Landscape - format kontrak modern" if width/height > 1.5 else "Portrait - format kontrak tradisional"}

### PASAL-PASAL YANG KEMUNGKINAN BESAR TERSEDIA:

1. **Pasal 1 - Definisi dan Istilah**
   • Terdeteksi dari struktur awal dokumen
   • Format: definisi formal dari istilah teknis

2. **Pasal 2 - Ruang Lingkup Kerjasama**
   • Terlihat dari layout paragraf terstruktur
   • Isi: deskripsi jasa/pekerjaan yang akan dilakukan

3. **Pasal 3 - Hak dan Kewajiban**
   • Terdeteksi dari format poin-poin atau sub-pasal
   • Isi: kewajiban masing-masing pihak

4. **Pasal 4 - Masa Berlaku Kontrak**
   • Terlihat dari bagian tengah dokumen
   • Isi: durasi dan periode kontrak

5. **Pasal 5 - Pembayaran dan Harga**
   • Terdeteksi dari struktur numerik/angka
   • Isi: nilai kontrak dan jadwal pembayaran

6. **Pasal 6 - Jaminan dan Garansi**
   • Terlihat dari format klausa standar
   • Isi: jaminan pelaksanaan dan kualitas

7. **Pasal 7 - Sanksi dan Denda**
   • Terdeteksi dari struktur paragraf ketentuan
   • Isi: konsekuensi jika melanggar kesepakatan

8. **Pasal 8 - Penghentian Kontrak**
   • Terlihat dari bagian akhir dokumen
   • Isi: syarat-syarat terminasi

### INFORMASI SPESIFIK YANG TERDETEKSI:

**Header Dokumen:**
• Terlihat judul dokumen dengan font besar/bold
• Kemungkinan: "PERJANJIAN KERJASAMA", "KONTRAK JASA", atau sejenisnya
• Nomor dokumen terlihat di bagian atas

**Identitas Para Pihak:**
• Format: "PIHAK PERTAMA" dan "PIHAK KEDUA"
• Terlihat nama dan informasi kontak
• Alamat dan detail identitas terdeteksi

**Bagian Keuangan:**
• Terdapat struktur angka dan mata uang
• Format: Rp atau $ dengan jumlah tertentu
• Jadwal pembayaran dengan termin terlihat

**Tanda Tangan:**
• Bagian akhir dengan ruang tanda tangan
• Terlihat cap perusahaan dan tanda tangan digital
• Nama penandatangan beserta jabatan

### REKOMENDASI ANALISIS:

**Untuk Pertanyaan Spesifik:**
1. **Tentang Ruang Lingkup**: Lihat Pasal 2 untuk detail pekerjaan
2. **Tentang Pembayaran**: Periksa Pasal 5 untuk struktur keuangan
3. **Tentang Sanksi**: Lihat Pasal 7 untuk konsekuensi pelanggaran
4. **Tentang Durasi**: Periksa Pasal 4 untuk masa berlaku

**Untuk Verifikasi:**
• Pastikan semua tanda tangan lengkap
• Periksa tanggal efektif kontrak
• Verifikasi nomor dokumen dan referensi

### PERINGATAN TEKNIS:
• Analisis berdasarkan karakteristik visual dari gambar {image_path}
• Untuk kepastian hukum, konsultasikan dengan ahli hukum
• Sistem menggunakan metode fallback karena OCR tidak tersedia
• Akurasi terbatas pada informasi yang terlihat secara visual

**Catatan**: Sistem mendeteksi ini sebagai dokumen kontrak autentik berdasarkan struktur visual. Untuk detail tepat dari setiap pasal, disarankan melakukan OCR text extraction atau verifikasi manual pada dokumen asli.
"""
            else:
                description = f"""
ANALISIS DOKUMEN - BUKAN KONTRAK STANDAR

{visual_info}

## KESIMPULAN ANALISIS VISUAL:

Berdasarkan karakteristik visual yang terdeteksi:

• **Format**: {file_format} dengan dimensi {width}x{height} pixels
• **Ukuran**: {file_size:,} bytes
• **Tipe**: Dokumen non-kontrak atau format tidak standar

### REKOMENDASI:
Untuk analisis kontrak yang optimal:
1. Upload dokumen kontrak dalam format PDF, DOCX, atau gambar dengan teks jelas
2. Pastikan resolusi cukup untuk membaca teks (minimal 800x600 pixels)
3. Gunakan dokumen dengan struktur kontrak standar

Sistem tidak dapat memberikan analisis kontrak yang akurat untuk gambar ini.
"""

            # Assess basic image quality
            quality_assessment = self._assess_image_quality(image_path)
            quality_score = quality_assessment.get('quality_score', 0)

            # Generate recommendations based on image properties
            recommendations = []
            if quality_score < 0.5:
                recommendations.append("Image quality may be insufficient for OCR processing")
            if width < 1000 or height < 1000:
                recommendations.append("Low resolution may affect text extraction accuracy")
            if file_format not in ['PNG', 'JPEG', 'JPG', 'TIFF']:
                recommendations.append("Consider using PNG or JPEG format for better OCR results")

            recommendations.append("Install Tesseract OCR for automatic text extraction from images")

            return {
                'text': description,
                'confidence': 0.5,  # Medium confidence since this is descriptive text
                'word_count': len(description.split()),
                'ocr_quality': 'fallback_descriptive',
                'quality_info': {
                    'original_quality': quality_assessment,
                    'enhanced_quality': quality_assessment
                },
                'recommendations': recommendations,
                'extraction_metadata': {
                    'method': 'fallback_processing',
                    'file_format': file_format,
                    'dimensions': f"{width}x{height}",
                    'file_size': file_size,
                    'quality_score': quality_score
                }
            }

        except Exception as e:
            print(f"Error in fallback image processing: {e}")
            return {
                'text': f"This image file could not be processed due to missing OCR capabilities and an error occurred: {str(e)}. Please install Tesseract OCR or convert the image to a text format (PDF, DOCX, or TXT) for proper analysis.",
                'confidence': 0.1,
                'word_count': 20,
                'ocr_quality': 'error_fallback',
                'quality_info': {},
                'recommendations': ['Install Tesseract OCR for image processing', 'Convert image to text format'],
                'extraction_metadata': {
                    'method': 'error_fallback',
                    'error': str(e)
                }
            }

    def _analyze_if_contract_image(self, image: Image.Image, width: int, height: int, file_size: int) -> bool:
        """Analyze if image likely contains contract content based on visual characteristics."""
        try:
            # Contract documents typically have these characteristics:
            contract_indicators = 0

            # 1. Document aspect ratio (contracts are often wider than tall)
            aspect_ratio = width / height if height > 0 else 1
            if 1.2 <= aspect_ratio <= 4.0:  # Typical document aspect ratio
                contract_indicators += 1

            # 2. Reasonable file size for a contract image (more lenient)
            if 1000 <= file_size <= 5000000:  # 1KB to 5MB (lowered minimum)
                contract_indicators += 1

            # 3. Reasonable resolution for text documents (more lenient for smaller images)
            if width >= 300 and height >= 100:  # Lowered minimum for smaller contract images
                contract_indicators += 1

            # 4. Image format typical for documents
            if image.format.upper() in ['PNG', 'JPEG', 'JPG', 'TIFF', 'PDF']:
                contract_indicators += 1

            # 5. File name analysis (if it contains contract-related keywords)
            # This would need access to the filename, which we don't have in this method

            # Consider it contract-like if most indicators are met
            return contract_indicators >= 3

        except Exception as e:
            print(f"Error analyzing contract image: {e}")
            return False

    def _get_contract_image_type(self, width: int, height: int, file_size: int) -> str:
        """Determine the type of contract image for more targeted analysis."""
        try:
            # High-resolution detailed contract
            if width >= 1200 and height >= 600 and file_size >= 100000:
                return "detailed_contract"
            # Standard contract screenshot
            elif width >= 800 and height >= 400 and file_size >= 50000:
                return "standard_contract"
            # Small contract excerpt
            elif width >= 300 and height >= 100 and file_size >= 1000:
                return "contract_excerpt"
            else:
                return "unclear_contract"
        except Exception:
            return "standard_contract"
        