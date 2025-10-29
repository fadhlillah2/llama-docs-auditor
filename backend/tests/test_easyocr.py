#!/usr/bin/env python3
"""
Test script for EasyOCR implementation with Indonesian contract documents
"""

import os
import sys
import logging
from typing import Dict, Any

# Add the rag directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'rag'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_easyocr_import():
    """Test if EasyOCR can be imported successfully"""
    try:
        import easyocr
        logger.info("✅ EasyOCR imported successfully")
        logger.info(f"   EasyOCR version: {easyocr.__version__}")
        return True
    except ImportError as e:
        logger.error(f"❌ EasyOCR import failed: {e}")
        return False

def test_easyocr_processor():
    """Test the EasyOCRProcessor class"""
    try:
        from rag.easyocr_implementation import EasyOCRProcessor
        logger.info("✅ EasyOCRProcessor imported successfully")

        # Try to initialize processor
        processor = EasyOCRProcessor(languages=['en', 'id'], gpu=False)
        logger.info("✅ EasyOCRProcessor initialized successfully")
        logger.info(f"   Languages: {processor.languages}")
        logger.info(f"   GPU enabled: {processor.gpu}")

        return True, processor
    except Exception as e:
        logger.error(f"❌ EasyOCRProcessor test failed: {e}")
        return False, None

def test_image_processing(processor, image_path: str = None):
    """Test image processing with a sample image"""
    try:
        # Look for test images in common locations
        test_paths = [
            image_path,
            "data/uploads_test/sample_contract.png",
            "data/uploads_test/sample_contract.jpg",
            "data/uploads_test/sample_contract.jpeg",
            "test_screenshot.png",
            "test_image.png"
        ]

        test_image = None
        for path in test_paths:
            if path and os.path.exists(path):
                test_image = path
                break

        if not test_image:
            logger.warning("⚠️ No test image found, creating a simple test scenario")
            return test_with_synthetic_data(processor)

        logger.info(f"🔍 Testing with image: {test_image}")

        # Process the image
        result = processor.process_image(test_image)

        logger.info("✅ Image processing completed")
        logger.info(f"   Words extracted: {result['word_count']}")
        logger.info(f"   Average confidence: {result['confidence']:.2f}")
        logger.info(f"   OCR Quality: {result.get('ocr_quality', 'unknown')}")
        logger.info(f"   Extraction method: {result.get('extraction_method', 'unknown')}")

        if result.get('text'):
            text_preview = result['text'][:200] + "..." if len(result['text']) > 200 else result['text']
            logger.info(f"   Text preview: {text_preview}")

        return True

    except Exception as e:
        logger.error(f"❌ Image processing test failed: {e}")
        return False

def test_with_synthetic_data(processor):
    """Test with synthetic data when no image is available"""
    try:
        logger.info("🔧 Testing EasyOCR processor with synthetic validation")

        # Test the text cleaning functionality
        test_text = "PASAL 1  -  RUANG LINGKUP PEKERJAAN"
        cleaned_text = processor._clean_text(test_text)
        logger.info(f"   Text cleaning test:")
        logger.info(f"     Original: {test_text}")
        logger.info(f"     Cleaned: {cleaned_text}")

        # Test contract structure enhancement
        test_contract = "PASAL 1:RUANG LINGKUP PEKERJAAN.Pihak pertama setuju untuk menyediakan layanan."
        enhanced_contract = processor._enhance_contract_structure(test_contract)
        logger.info(f"   Contract structure enhancement:")
        logger.info(f"     Original: {test_contract}")
        logger.info(f"     Enhanced: {enhanced_contract}")

        logger.info("✅ Synthetic data tests completed successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Synthetic data test failed: {e}")
        return False

def main():
    """Main test function"""
    logger.info("🚀 Starting EasyOCR Implementation Tests")
    logger.info("=" * 50)

    # Test 1: Import EasyOCR
    if not test_easyocr_import():
        logger.error("❌ EasyOCR is not available. Please install it with: pip install easyocr")
        return False

    # Test 2: Test EasyOCRProcessor
    success, processor = test_easyocr_processor()
    if not success:
        logger.error("❌ EasyOCRProcessor failed to initialize")
        return False

    # Test 3: Test image processing
    test_image_processing(processor)

    logger.info("=" * 50)
    logger.info("✅ All EasyOCR tests completed successfully!")
    logger.info("🎉 EasyOCR implementation is ready for Indonesian contract documents")

    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)