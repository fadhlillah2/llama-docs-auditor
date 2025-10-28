"""
EasyOCR Implementation for Contract Advisor RAG
Enhanced image-to-text extraction with multi-language support
"""

import os
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import easyocr
from typing import Dict, Any, Optional, List, Tuple
import logging
import concurrent.futures
import hashlib
import json
import time
from functools import lru_cache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EasyOCRProcessor:
    """
    Enhanced EasyOCR processor for contract document images with Indonesian language support
    Optimized for faster processing with intelligent variant selection and caching
    """

    def __init__(self, languages: List[str] = None, gpu: bool = False, enable_cache: bool = True, max_workers: int = 2):
        """
        Initialize EasyOCR processor

        Args:
            languages: List of language codes (default: ['en', 'id'] for English and Indonesian)
            gpu: Whether to use GPU acceleration (default: False for CPU, auto-detected)
            enable_cache: Enable caching for processed images and results
            max_workers: Maximum number of parallel workers for processing
        """
        self.languages = languages or ['en', 'id']

        # Auto-detect GPU availability if not specified
        if gpu is None:
            try:
                import torch
                self.gpu = torch.cuda.is_available()
                logger.info(f"Auto-detected GPU availability: {self.gpu}")
            except ImportError:
                self.gpu = False
                logger.info("PyTorch not available, using CPU mode")
        else:
            self.gpu = gpu

        self.enable_cache = enable_cache
        self.max_workers = max_workers

        # Performance tracking
        self.processing_times = []
        self.cache_hits = 0
        self.cache_misses = 0

        # Cache directories
        self.cache_dir = "cache/easyocr"
        if self.enable_cache:
            os.makedirs(self.cache_dir, exist_ok=True)

        self.reader = None
        self._initialize_reader()

    def _initialize_reader(self):
        """Initialize EasyOCR reader"""
        try:
            logger.info(f"Initializing EasyOCR reader with languages: {self.languages}, GPU: {self.gpu}")
            self.reader = easyocr.Reader(self.languages, gpu=self.gpu)
            logger.info("EasyOCR reader initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR reader: {e}")
            raise

    def _get_image_hash(self, image_path: str) -> str:
        """Generate hash for image file caching"""
        try:
            with open(image_path, 'rb') as f:
                file_hash = hashlib.md5(f.read()).hexdigest()
            return file_hash
        except Exception as e:
            logger.error(f"Error generating image hash: {e}")
            return str(time.time())

    def _get_cache_path(self, image_hash: str, suffix: str = "") -> str:
        """Get cache file path for given hash and suffix"""
        filename = f"{image_hash}{suffix}.json"
        return os.path.join(self.cache_dir, filename)

    def _load_from_cache(self, image_hash: str) -> Optional[Dict[str, Any]]:
        """Load processed result from cache"""
        if not self.enable_cache:
            return None

        try:
            cache_path = self._get_cache_path(image_hash)
            if os.path.exists(cache_path):
                with open(cache_path, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                logger.info(f"Cache hit for image hash: {image_hash[:8]}...")
                self.cache_hits += 1
                return cached_data
        except Exception as e:
            logger.warning(f"Error loading from cache: {e}")

        self.cache_misses += 1
        return None

    def _save_to_cache(self, image_hash: str, data: Dict[str, Any]) -> None:
        """Save processed result to cache"""
        if not self.enable_cache:
            return

        try:
            cache_path = self._get_cache_path(image_hash)
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info(f"Saved result to cache: {image_hash[:8]}...")
        except Exception as e:
            logger.warning(f"Error saving to cache: {e}")

    @lru_cache(maxsize=128)
    def _assess_image_quality_fast(self, image_path: str) -> Dict[str, Any]:
        """Fast image quality assessment for intelligent preprocessing"""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return {'quality_score': 0.0, 'recommended_variants': ['original']}

            # Quick quality metrics
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Calculate sharpness (Laplacian variance)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

            # Calculate contrast
            contrast = gray.std()

            # Overall quality score
            quality_score = min(laplacian_var / 500.0, 1.0) * 0.6 + min(contrast / 127.0, 1.0) * 0.4

            # Intelligent variant selection based on quality
            if quality_score > 0.7:
                recommended_variants = ['original', 'grayscale']
            elif quality_score > 0.4:
                recommended_variants = ['original', 'grayscale', 'denoised', 'enhanced']
            else:
                recommended_variants = ['grayscale', 'denoised', 'enhanced', 'sharpened']

            return {
                'quality_score': quality_score,
                'sharpness_score': min(laplacian_var / 500.0, 1.0),
                'contrast_score': min(contrast / 127.0, 1.0),
                'recommended_variants': recommended_variants
            }
        except Exception as e:
            logger.error(f"Error in fast quality assessment: {e}")
            return {'quality_score': 0.0, 'recommended_variants': ['original']}

    def preprocess_image_optimized(self, image_path: str) -> Tuple[List[Tuple[str, str]], Dict[str, Any]]:
        """
        Optimized image preprocessing with intelligent variant selection

        Args:
            image_path: Path to the image file

        Returns:
            Tuple of (processed_variants_list, preprocessing_info)
        """
        try:
            logger.info(f"Starting optimized image preprocessing for: {image_path}")
            start_time = time.time()

            # Fast quality assessment for intelligent variant selection
            quality_assessment = self._assess_image_quality_fast(image_path)
            recommended_variants = quality_assessment['recommended_variants']
            quality_score = quality_assessment['quality_score']

            logger.info(f"Image quality score: {quality_score:.2f}, recommended variants: {recommended_variants}")

            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Cannot load image: {image_path}")

            original_size = image.shape[:2]

            # Create only necessary variants based on quality assessment
            processed_variants = []
            base_name = os.path.splitext(os.path.basename(image_path))[0]
            output_dir = os.path.dirname(image_path)

            # Define variant processing functions
            variant_processors = {
                'original': lambda img: img,
                'grayscale': lambda img: cv2.cvtColor(img, cv2.COLOR_BGR2GRAY),
                'denoised': lambda img: cv2.fastNlMeansDenoising(
                    cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img,
                    None, 10, 7, 21
                ),
                'enhanced': lambda img: cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(
                    cv2.fastNlMeansDenoising(
                        cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img,
                        None, 10, 7, 21
                    )
                ),
                'sharpened': lambda img: cv2.filter2D(
                    cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(
                        cv2.fastNlMeansDenoising(
                            cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img,
                            None, 10, 7, 21
                        )
                    ), -1, np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                ),
                'binary': lambda img: cv2.threshold(
                    cv2.filter2D(
                        cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(
                            cv2.fastNlMeansDenoising(
                                cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img,
                                None, 10, 7, 21
                            )
                        ), -1, np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                    ), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
                )[1]
            }

            # Process only recommended variants
            for variant_name in recommended_variants:
                if variant_name in variant_processors:
                    try:
                        processed_img = variant_processors[variant_name](image)

                        # Save processed variant
                        processed_filename = f"{base_name}_{variant_name}_opt.png"
                        processed_path = os.path.join(output_dir, processed_filename)

                        if len(processed_img.shape) == 3:  # Color image
                            cv2.imwrite(processed_path, processed_img)
                        else:  # Grayscale image
                            cv2.imwrite(processed_path, processed_img)

                        processed_variants.append((variant_name, processed_path))
                        logger.debug(f"Created variant: {variant_name}")

                    except Exception as e:
                        logger.warning(f"Error creating {variant_name} variant: {e}")
                        continue

            processing_time = time.time() - start_time
            preprocessing_info = {
                'original_size': original_size,
                'processed_variants': len(processed_variants),
                'quality_score': quality_score,
                'recommended_variants': recommended_variants,
                'processing_time': processing_time,
                'techniques_applied': recommended_variants,
                'optimization_level': 'high' if len(recommended_variants) <= 3 else 'medium'
            }

            logger.info(f"Optimized preprocessing completed in {processing_time:.2f}s. Generated {len(processed_variants)} variants")
            return processed_variants, preprocessing_info

        except Exception as e:
            logger.error(f"Error in optimized image preprocessing: {e}")
            return [('original', image_path)], {'error': str(e), 'processing_time': 0}

    def extract_text_parallel(self, image_path: str, processed_variants: List[Tuple[str, str]]) -> Dict[str, Any]:
        """
        Extract text using parallel processing for multiple variants

        Args:
            image_path: Original image path
            processed_variants: List of (variant_name, processed_path) tuples

        Returns:
            Dictionary containing extraction results
        """
        start_time = time.time()
        all_results = []

        def process_variant(variant_name_path_tuple):
            """Process a single variant in parallel"""
            variant_name, variant_path = variant_name_path_tuple
            try:
                logger.debug(f"Processing {variant_name} variant in parallel")

                # Adaptive confidence threshold based on variant type
                confidence_threshold = 0.25 if variant_name == 'original' else 0.15

                # Extract text with EasyOCR
                results = self.reader.readtext(
                    variant_path,
                    detail=1,
                    paragraph=False,
                    workers=1
                )

                if results:
                    # Process results with early termination for quality
                    extracted_texts = []
                    confidences = []

                    for (bbox, text, confidence) in results:
                        if confidence > confidence_threshold:
                            cleaned_text = self._clean_text(text)
                            if cleaned_text and len(cleaned_text) > 1:
                                extracted_texts.append(cleaned_text)
                                confidences.append(confidence)

                                # Early termination if we have enough high-quality text
                                if len(extracted_texts) > 50 and confidence > 0.8:
                                    break

                    if extracted_texts:
                        # Reconstruct text maintaining order
                        full_text = self._reconstruct_text(extracted_texts, results)
                        avg_confidence = sum(confidences) / len(confidences)

                        result = {
                            'variant': variant_name,
                            'text': full_text,
                            'confidence': avg_confidence,
                            'word_count': len(extracted_texts),
                            'detections': len(results),
                            'processing_time': time.time() - start_time,
                            'extraction_metadata': {
                                'avg_confidence': avg_confidence,
                                'min_confidence': min(confidences),
                                'max_confidence': max(confidences),
                                'confidence_distribution': confidences
                            }
                        }

                        return result

                return None

            except Exception as e:
                logger.warning(f"Error processing {variant_name} variant: {e}")
                return None

        # Process variants in parallel with limited workers to avoid memory issues
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_variant = {
                executor.submit(process_variant, variant): variant
                for variant in processed_variants
            }

            for future in concurrent.futures.as_completed(future_to_variant):
                variant = future_to_variant[future]
                try:
                    result = future.result()
                    if result:
                        all_results.append(result)
                        logger.info(f"✅ {result['variant']} variant: {result['word_count']} words, {result['confidence']:.2f} confidence")
                except Exception as e:
                    logger.error(f"Error getting result for {variant[0]}: {e}")

        # Clean up processed variants (except original)
        for variant_name, variant_path in processed_variants:
            if variant_name != 'original' and os.path.exists(variant_path):
                try:
                    os.remove(variant_path)
                except Exception as e:
                    logger.warning(f"Error cleaning up {variant_path}: {e}")

        processing_time = time.time() - start_time

        # Select best result with enhanced scoring
        if not all_results:
            return {
                'text': '',
                'confidence': 0.0,
                'word_count': 0,
                'extraction_method': 'easyocr_failed',
                'error': 'No text could be extracted from any variant',
                'processing_time': processing_time,
                'all_attempts': []
            }

        # Enhanced scoring algorithm
        def calculate_score(result):
            base_score = result['confidence'] * result['word_count']
            # Bonus for grayscale variants (usually better for OCR)
            if 'grayscale' in result['variant']:
                base_score *= 1.1
            # Bonus for enhanced variants
            if 'enhanced' in result['variant']:
                base_score *= 1.05
            return base_score

        best_result = max(all_results, key=calculate_score)

        return {
            'text': best_result['text'],
            'confidence': best_result['confidence'],
            'word_count': best_result['word_count'],
            'extraction_method': 'easyocr_parallel',
            'ocr_quality': self._assess_ocr_quality(best_result['confidence'], best_result['word_count']),
            'variant_used': best_result['variant'],
            'processing_time': processing_time,
            'all_attempts': all_results,
            'extraction_metadata': best_result.get('extraction_metadata', {}),
            'performance_stats': {
                'total_variants': len(processed_variants),
                'successful_variants': len(all_results),
                'parallel_workers': self.max_workers,
                'cache_hits': self.cache_hits,
                'cache_misses': self.cache_misses
            }
        }

    def _clean_text(self, text: str) -> str:
        """Clean extracted text with Indonesian contract document enhancements"""
        if not text:
            return ""

        # Remove extra whitespace
        text = ' '.join(text.split())

        # Remove common OCR artifacts but preserve important Indonesian characters
        artifacts = ['|', '}', '{', '[', ']', '~', '`', '^', '@', '#', '$', '%', '&', '*']
        for artifact in artifacts:
            text = text.replace(artifact, '')

        # Fix common Indonesian OCR errors
        corrections = {
            'I0': '10',  # Number zero vs letter O confusion
            'O0': '00',
            'l': '1',    # Lowercase L vs number 1 in numbers
            'S': '5',    # Letter S vs number 5 in numbers
            'rn': 'm',   # Common OCR issue in Indonesian text
            'vv': 'w',   # Double v vs w
            'R p': 'Rp', # Indonesian Rupiah symbol
            'R p.': 'Rp.',
            'N o': 'No', # Number abbreviation
            'N o.': 'No.',
        }

        for wrong, correct in corrections.items():
            text = text.replace(wrong, correct)

        # Preserve Indonesian currency symbols and formatting
        text = text.replace('Rp', 'Rp ')
        text = text.replace('Rp  ', 'Rp ')

        # Fix common Indonesian legal document formatting
        text = text.replace('PASAL  ', 'PASAL ')
        text = text.replace('Pasal  ', 'PASAL ')
        text = text.replace('AYAT  ', 'AYAT ')
        text = text.replace('Ayat  ', 'AYAT ')

        return text.strip()

    def _reconstruct_text(self, texts: List[str], results: List) -> str:
        """Reconstruct text maintaining spatial order with Indonesian contract structure awareness"""
        try:
            # Sort by y-coordinate (top to bottom), then x-coordinate (left to right)
            text_with_position = []

            for i, text in enumerate(texts):
                if i < len(results):
                    bbox = results[i][0]
                    if bbox and len(bbox) >= 4:
                        # Calculate center point
                        center_x = sum([p[0] for p in bbox]) / 4
                        center_y = sum([p[1] for p in bbox]) / 4
                        text_with_position.append((center_y, center_x, text))

            # Sort by position with improved line grouping for contracts
            text_with_position.sort(key=lambda x: (x[0] // 30) * 30 + x[1])  # Smaller line grouping

            # Reconstruct text with better formatting for Indonesian contracts
            reconstructed_lines = []
            current_line = []
            last_y = -1

            for y, x, text in text_with_position:
                # Check if this is a new line (significant y difference)
                if last_y != -1 and abs(y - last_y) > 30:
                    # Add current line to result
                    if current_line:
                        line_text = ' '.join(current_line)
                        reconstructed_lines.append(line_text)
                        current_line = []

                current_line.append(text)
                last_y = y

            # Add final line
            if current_line:
                line_text = ' '.join(current_line)
                reconstructed_lines.append(line_text)

            # Post-process for Indonesian contract document structure
            reconstructed_text = '\n'.join(reconstructed_lines)
            reconstructed_text = self._enhance_contract_structure(reconstructed_text)

            return reconstructed_text

        except Exception as e:
            logger.error(f"Error reconstructing text: {e}")
            return ' '.join(texts)

    def _enhance_contract_structure(self, text: str) -> str:
        """Enhance text structure for Indonesian contract documents"""
        try:
            # Fix paragraph spacing in contracts
            text = text.replace('.  ', '.\n')
            text = text.replace(':  ', ':\n')

            # Ensure proper spacing for Indonesian legal terms
            legal_terms = ['PASAL', 'AYAT', 'BAGIAN', 'BAB', 'PARAGRAF']
            for term in legal_terms:
                text = text.replace(f'{term} ', f'\n{term} ')
                text = text.replace(f'{term}.', f'\n{term}.')

            # Fix number formatting
            text = text.replace('No  ', 'No. ')
            text = text.replace('Nomor  ', 'No. ')

            # Ensure proper line breaks for readability
            text = text.replace('\n\n\n', '\n\n')  # Remove excessive blank lines

            return text.strip()
        except Exception as e:
            logger.error(f"Error enhancing contract structure: {e}")
            return text

    def _assess_ocr_quality(self, confidence: float, word_count: int) -> str:
        """Assess OCR quality based on confidence and word count"""
        if confidence > 0.8 and word_count > 50:
            return 'excellent'
        elif confidence > 0.6 and word_count > 20:
            return 'good'
        elif confidence > 0.4 and word_count > 10:
            return 'fair'
        else:
            return 'poor'

    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Main method to process image and extract text with optimizations

        Args:
            image_path: Path to the image file

        Returns:
            Dictionary containing extraction results
        """
        try:
            start_time = time.time()
            logger.info(f"🚀 Starting optimized EasyOCR processing for: {image_path}")

            # Check if file exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")

            # Check cache first
            image_hash = self._get_image_hash(image_path)
            cached_result = self._load_from_cache(image_hash)
            if cached_result:
                logger.info(f"✅ Returning cached result for {image_path}")
                cached_result['from_cache'] = True
                cached_result['total_processing_time'] = 0.001
                return cached_result

            # Use optimized preprocessing
            processed_variants, preprocessing_info = self.preprocess_image_optimized(image_path)

            # Use parallel text extraction
            extraction_result = self.extract_text_parallel(image_path, processed_variants)

            # Add preprocessing info to result
            extraction_result['preprocessing_info'] = preprocessing_info

            # Add metadata
            extraction_result['image_path'] = image_path
            extraction_result['file_size'] = os.path.getsize(image_path)
            extraction_result['languages_used'] = self.languages
            extraction_result['total_processing_time'] = time.time() - start_time
            extraction_result['from_cache'] = False

            # Cache successful results
            if extraction_result.get('word_count', 0) > 5:
                self._save_to_cache(image_hash, extraction_result)

            # Track performance
            self.processing_times.append(time.time() - start_time)

            logger.info(f"✅ Optimized EasyOCR processing completed in {extraction_result['total_processing_time']:.2f}s")
            logger.info(f"   Words extracted: {extraction_result['word_count']}")
            logger.info(f"   OCR Quality: {extraction_result.get('ocr_quality', 'unknown')}")
            logger.info(f"   Variant used: {extraction_result.get('variant_used', 'unknown')}")

            return extraction_result

        except Exception as e:
            logger.error(f"❌ Error in optimized EasyOCR processing: {e}")
            return {
                'text': '',
                'confidence': 0.0,
                'word_count': 0,
                'extraction_method': 'easyocr_error',
                'error': str(e),
                'ocr_quality': 'error',
                'total_processing_time': time.time() - start_time if 'start_time' in locals() else 0,
                'from_cache': False
            }

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics for the processor"""
        if not self.processing_times:
            return {'message': 'No processing history available'}

        return {
            'total_processed': len(self.processing_times),
            'avg_processing_time': sum(self.processing_times) / len(self.processing_times),
            'min_processing_time': min(self.processing_times),
            'max_processing_time': max(self.processing_times),
            'cache_hit_rate': self.cache_hits / (self.cache_hits + self.cache_misses) if (self.cache_hits + self.cache_misses) > 0 else 0,
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'gpu_enabled': self.gpu,
            'parallel_workers': self.max_workers,
            'cache_enabled': self.enable_cache
        }


def test_easyocr_implementation():
    """Test the optimized EasyOCR implementation"""
    try:
        print("🧪 Testing Optimized EasyOCR Implementation")
        print("=" * 50)

        # Initialize optimized processor with auto-detection
        processor = EasyOCRProcessor(
            languages=['en', 'id'],
            gpu=None,  # Auto-detect
            enable_cache=True,
            max_workers=2
        )

        print(f"✅ Processor initialized successfully")
        print(f"   GPU enabled: {processor.gpu}")
        print(f"   Cache enabled: {processor.enable_cache}")
        print(f"   Parallel workers: {processor.max_workers}")
        print(f"   Languages: {processor.languages}")

        # Test with sample image (if available)
        test_images = ["test_screenshot.png", "sample_contract.png", "data/uploads_test/sample_indonesian_contract.png"]
        test_image = None

        for img in test_images:
            if os.path.exists(img):
                test_image = img
                break

        if test_image:
            print(f"\n🖼️  Testing with: {test_image}")
            print("-" * 30)

            start_time = time.time()
            result = processor.process_image(test_image)
            total_time = time.time() - start_time

            print(f"\n📊 Results:")
            print(f"   Total processing time: {total_time:.2f}s")
            print(f"   Words extracted: {result['word_count']}")
            print(f"   Average confidence: {result['confidence']:.2f}")
            print(f"   OCR Quality: {result.get('ocr_quality', 'unknown')}")
            print(f"   Variant used: {result.get('variant_used', 'unknown')}")
            print(f"   From cache: {result.get('from_cache', False)}")

            # Show preprocessing info
            preprocessing = result.get('preprocessing_info', {})
            if preprocessing:
                print(f"   Image quality score: {preprocessing.get('quality_score', 0):.2f}")
                print(f"   Variants processed: {preprocessing.get('processed_variants', 0)}")
                print(f"   Optimization level: {preprocessing.get('optimization_level', 'unknown')}")

            # Show performance stats
            perf_stats = result.get('performance_stats', {})
            if perf_stats:
                print(f"   Parallel workers used: {perf_stats.get('parallel_workers', 0)}")
                print(f"   Successful variants: {perf_stats.get('successful_variants', 0)}/{perf_stats.get('total_variants', 0)}")

            print(f"\n📝 Text preview (first 200 chars):")
            print(f"   {result['text'][:200]}...")

            # Test cache speed
            print(f"\n🔄 Testing cache performance...")
            cache_start = time.time()
            cached_result = processor.process_image(test_image)
            cache_time = time.time() - cache_start

            if cached_result.get('from_cache'):
                print(f"✅ Cache hit! Time: {cache_time:.3f}s ({total_time/cache_time:.1f}x faster)")

            # Show overall performance stats
            stats = processor.get_performance_stats()
            print(f"\n📈 Performance Statistics:")
            print(f"   Total processed: {stats.get('total_processed', 0)}")
            print(f"   Average time: {stats.get('avg_processing_time', 0):.2f}s")
            print(f"   Cache hit rate: {stats.get('cache_hit_rate', 0):.1%}")

            return result
        else:
            print(f"\n⚠️  No test image found. Looking for: {test_images}")
            print(f"   Create a test image with: python create_test_images.py")
            return None

    except Exception as e:
        logger.error(f"❌ Error testing optimized EasyOCR implementation: {e}")
        return None


if __name__ == "__main__":
    # Run test
    test_easyocr_implementation()