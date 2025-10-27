#!/usr/bin/env python3
"""
Create sample Indonesian contract images for testing EasyOCR
"""

import os
from PIL import Image, ImageDraw, ImageFont
import textwrap

def create_sample_contract_image():
    """Create a sample Indonesian contract document image"""

    # Create a new image
    width, height = 800, 1000
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)

    # Try to use a font, fallback to default if not available
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
        font_heading = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 18)
        font_body = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 14)
    except:
        font_title = ImageFont.load_default()
        font_heading = ImageFont.load_default()
        font_body = ImageFont.load_default()

    # Contract content in Indonesian
    content = """
KONTRAK JASA KONSULTASI
NOMOR: KON/2025/001

PASAL 1 - RUANG LINGKUP PEKERJAAN
1.1. Pihak Pertama akan menyediakan jasa konsultasi teknologi informasi
1.2. Pihak Kedua akan menggunakan layanan sesuai ketentuan yang berlaku

PASAL 2 - HARGA DAN PEMBAYARAN
2.1. Nilai kontrak: Rp 150.000.000 (Seratus Lima Puluh Juta Rupiah)
2.2. Pembayaran dilakukan secara bertahap:
    - Tahap 1: 30% setelah kontrak ditandatangani
    - Tahap 2: 40% setelah pekerjaan 50% selesai
    - Tahap 3: 30% setelah pekerjaan selesai

PASAL 3 - JADWAL PELAKSANAAN
3.1. Masa berlaku kontrak: 12 bulan
3.2. Pekerjaan dimulai: 1 Januari 2025
3.3. Pekerjaan selesai: 31 Desember 2025

PASAL 4 - HAK DAN KEWAJIBAN
4.1. Pihak Pertama berkewajiban menyediakan layanan sesuai standar
4.2. Pihak Kedua berkewajiban melakukan pembayaran tepat waktu
4.3. Kedua belah pihak sepakat menjaga kerahasiaan informasi

Ditandatangani pada: Jakarta, 15 Januari 2025
"""

    # Position tracking
    y_position = 50
    line_height = 25

    # Draw title
    lines = textwrap.wrap(content, width=80)
    for line in lines:
        if line.strip():
            # Check if it's a heading (contains PASAL or is title)
            if 'PASAL' in line or 'KONTRAK' in line or 'NOMOR' in line:
                draw.text((50, y_position), line.strip(), fill='black', font=font_heading)
                y_position += line_height + 5
            else:
                draw.text((50, y_position), line.strip(), fill='black', font=font_body)
                y_position += line_height
        else:
            y_position += line_height // 2

    # Save the image
    output_dir = "data/uploads_test"
    os.makedirs(output_dir, exist_ok=True)

    image_path = os.path.join(output_dir, "sample_indonesian_contract.png")
    image.save(image_path, "PNG")
    print(f"✅ Sample contract image created: {image_path}")

    return image_path

def create_simple_test_image():
    """Create a simple test image with basic text"""

    # Create a simple image
    width, height = 400, 200
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 16)
    except:
        font = ImageFont.load_default()

    # Simple text
    text_lines = [
        "Test OCR Image",
        "PASAL 1 - Testing",
        "Rp 1.000.000",
        "No. 001/2025"
    ]

    y_position = 30
    for line in text_lines:
        draw.text((50, y_position), line, fill='black', font=font)
        y_position += 35

    # Save the image
    output_dir = "data/uploads_test"
    os.makedirs(output_dir, exist_ok=True)

    image_path = os.path.join(output_dir, "simple_test.png")
    image.save(image_path, "PNG")
    print(f"✅ Simple test image created: {image_path}")

    return image_path

if __name__ == "__main__":
    print("🖼️  Creating sample contract images for EasyOCR testing...")

    # Create sample images
    contract_path = create_sample_contract_image()
    simple_path = create_simple_test_image()

    print(f"\n📁 Test images created:")
    print(f"   1. {contract_path}")
    print(f"   2. {simple_path}")
    print(f"\n🚀 You can now test EasyOCR with these images!")
    print(f"   Run: python test_easyocr.py")