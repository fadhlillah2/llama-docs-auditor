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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EasyOCRProcessor:
    """
    Enhanced EasyOCR processor for contract document images with Indonesian language support
    """

    def __init__(self, languages: List[str] = None, gpu: bool = False):
        """
        Initialize EasyOCR processor

        Args:
            languages: List of language codes (default: ['en', 'id'] for English and Indonesian)
            gpu: Whether to use GPU acceleration (default: False for CPU)
        """
        self.languages = languages or ['en', 'id']
        self.gpu = gpu
        self.reader = None
        self._initialize_reader()

    def _initialize_reader(self):
        """Initialize EasyOCR reader"""
        try:
            logger.info(f"Initializing EasyOCR reader with languages: {self.languages}")
            self.reader = easyocr.Reader(self.languages, gpu=self.gpu)
            logger.info("EasyOCR reader initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR reader: {e}")
            raise

    def preprocess_image(self, image_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Advanced image preprocessing for better OCR results

        Args:
            image_path: Path to the image file

        Returns:
            Tuple of (processed_image_path, preprocessing_info)
        """
        try:
            logger.info(f"Starting image preprocessing for: {image_path}")

            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Cannot load image: {image_path}")

            original_size = image.shape[:2]

            # Apply multiple preprocessing techniques
            processed_images = []

            # 1. Original image
            processed_images.append(('original', image))

            # 2. Grayscale conversion
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            processed_images.append(('grayscale', gray))

            # 3. Denoised image
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            processed_images.append(('denoised', denoised))

            # 4. Contrast enhancement using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            processed_images.append(('enhanced', enhanced))

            # 5. Sharpening
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            sharpened = cv2.filter2D(enhanced, -1, kernel)
            processed_images.append(('sharpened', sharpened))

            # 6. Thresholding
            _, binary = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            processed_images.append(('binary', binary))

            # Save processed images
            processed_paths = []
            base_name = os.path.splitext(os.path.basename(image_path))[0]
            output_dir = os.path.dirname(image_path)

            for name, img in processed_images:
                # Create proper filename with variant name
                processed_filename = f"{base_name}_{name}_enhanced.png"
                processed_path = os.path.join(output_dir, processed_filename)

                # Handle different image formats for saving
                if len(img.shape) == 3:  # Color image
                    cv2.imwrite(processed_path, img)
                else:  # Grayscale image
                    cv2.imwrite(processed_path, img)

                processed_paths.append((name, processed_path))

            preprocessing_info = {
                'original_size': original_size,
                'processed_variants': len(processed_paths),
                'techniques_applied': ['grayscale', 'denoising', 'clahe', 'sharpening', 'thresholding']
            }

            logger.info(f"Image preprocessing completed. Generated {len(processed_paths)} variants")
            return processed_paths, preprocessing_info

        except Exception as e:
            logger.error(f"Error in image preprocessing: {e}")
            return [('original', image_path)], {'error': str(e)}

    def extract_text_with_multiple_attempts(self, image_path: str, processed_variants: List[Tuple[str, str]]) -> Dict[str, Any]:
        """
        Extract text using multiple preprocessing attempts

        Args:
            image_path: Original image path
            processed_variants: List of (variant_name, processed_path) tuples

        Returns:
            Dictionary containing extraction results
        """
        all_results = []

        for variant_name, variant_path in processed_variants:
            try:
                logger.info(f"Attempting OCR with {variant_name} variant: {variant_path}")

                # Extract text with EasyOCR
                results = self.reader.readtext(
                    variant_path,
                    detail=1,
                    paragraph=False,
                    workers=1
                )

                if results:
                    # Process results
                    extracted_texts = []
                    confidences = []

                    for (bbox, text, confidence) in results:
                        if confidence > 0.1:  # Lower confidence threshold for contract documents
                            cleaned_text = self._clean_text(text)
                            if cleaned_text and len(cleaned_text) > 2:
                                extracted_texts.append(cleaned_text)
                                confidences.append(confidence)

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
                            'extraction_metadata': {
                                'avg_confidence': avg_confidence,
                                'min_confidence': min(confidences),
                                'max_confidence': max(confidences),
                                'confidence_distribution': confidences
                            }
                        }

                        all_results.append(result)
                        logger.info(f"Successfully extracted {len(extracted_texts)} words from {variant_name} variant")
                    else:
                        logger.warning(f"No valid text extracted from {variant_name} variant")

                # Clean up processed variant (except original)
                if variant_name != 'original' and os.path.exists(variant_path):
                    os.remove(variant_path)

            except Exception as e:
                logger.error(f"Error processing {variant_name} variant: {e}")
                continue

        # Select best result
        if not all_results:
            return {
                'text': '',
                'confidence': 0.0,
                'word_count': 0,
                'extraction_method': 'easyocr_failed',
                'error': 'No text could be extracted from any variant',
                'all_attempts': []
            }

        # Select best result based on confidence and word count
        best_result = max(all_results, key=lambda x: x['confidence'] * x['word_count'])

        return {
            'text': best_result['text'],
            'confidence': best_result['confidence'],
            'word_count': best_result['word_count'],
            'extraction_method': 'easyocr',
            'ocr_quality': self._assess_ocr_quality(best_result['confidence'], best_result['word_count']),
            'variant_used': best_result['variant'],
            'all_attempts': all_results,
            'extraction_metadata': best_result.get('extraction_metadata', {})
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
        Main method to process image and extract text

        Args:
            image_path: Path to the image file

        Returns:
            Dictionary containing extraction results
        """
        try:
            logger.info(f"Starting EasyOCR processing for: {image_path}")

            # Check if file exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")

            # Preprocess image
            processed_variants, preprocessing_info = self.preprocess_image(image_path)

            # Extract text using multiple attempts
            extraction_result = self.extract_text_with_multiple_attempts(image_path, processed_variants)

            # Add preprocessing info to result
            extraction_result['preprocessing_info'] = preprocessing_info

            # Add metadata
            extraction_result['image_path'] = image_path
            extraction_result['file_size'] = os.path.getsize(image_path)
            extraction_result['languages_used'] = self.languages

            logger.info(f"EasyOCR processing completed. Words extracted: {extraction_result['word_count']}")
            logger.info(f"OCR Quality: {extraction_result.get('ocr_quality', 'unknown')}")

            return extraction_result

        except Exception as e:
            logger.error(f"Error in EasyOCR processing: {e}")
            return {
                'text': '',
                'confidence': 0.0,
                'word_count': 0,
                'extraction_method': 'easyocr_error',
                'error': str(e),
                'ocr_quality': 'error'
            }


def test_easyocr_implementation():
    """Test the EasyOCR implementation"""
    try:
        # Initialize processor
        processor = EasyOCRProcessor(languages=['en', 'id'], gpu=False)

        # Test with sample image (if available)
        test_image = "test_screenshot.png"  # Replace with actual test image

        if os.path.exists(test_image):
            logger.info(f"Testing EasyOCR with: {test_image}")
            result = processor.process_image(test_image)

            print(f"Test Results:")
            print(f"  Words extracted: {result['word_count']}")
            print(f"  Average confidence: {result['confidence']:.2f}")
            print(f"  OCR Quality: {result.get('ocr_quality', 'unknown')}")
            print(f"  Text preview: {result['text'][:200]}...")

            return result
        else:
            logger.warning(f"Test image not found: {test_image}")
            return None

    except Exception as e:
        logger.error(f"Error testing EasyOCR implementation: {e}")
        return None


if __name__ == "__main__":
    # Run test
    test_easyocr_implementation()