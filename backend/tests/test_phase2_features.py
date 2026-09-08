"""
Phase 2 Features Testing - Prescription OCR & Voice Booking
Tests for:
- POST /api/prescription/extract - Upload prescription image and get extracted medicines via Gemini OCR
- GET /api/prescription/common-medicines - Returns list of common medicines
- POST /api/voice-booking/parse-intent - Parse natural language booking request
- GET /api/voice-booking/doctors - Returns available doctors
"""

import pytest
import requests
import os
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def create_test_prescription_image():
    """Create a test prescription image with medicine names for OCR testing"""
    # Create a white background image
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    # Add prescription-like text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    except Exception:
        font = ImageFont.load_default()
        font_large = font
    
    # Header
    draw.text((50, 30), "Dr. Vikas Sharma", fill='black', font=font_large)
    draw.text((50, 60), "MBBS, MD - Gynecology", fill='gray', font=font)
    draw.text((50, 90), "Pushpa Clinic, Borivali", fill='gray', font=font)
    
    # Line separator
    draw.line([(50, 130), (750, 130)], fill='black', width=2)
    
    # Patient info
    draw.text((50, 150), "Patient: Test Patient", fill='black', font=font)
    draw.text((50, 180), "Date: 15-Jan-2026", fill='black', font=font)
    
    # Prescription header
    draw.text((50, 220), "Rx", fill='blue', font=font_large)
    
    # Medicines
    medicines = [
        "1. Paracetamol 500mg - 1 tablet twice daily for 5 days",
        "2. Metformin 500mg - 1 tablet after meals",
        "3. Vitamin D3 60000IU - Once weekly for 8 weeks",
        "4. Calcium + D3 - 1 tablet daily"
    ]
    
    y_pos = 260
    for med in medicines:
        draw.text((70, y_pos), med, fill='black', font=font)
        y_pos += 40
    
    # Footer
    draw.line([(50, 450), (750, 450)], fill='black', width=1)
    draw.text((50, 470), "Signature: Dr. Vikas Sharma", fill='black', font=font)
    
    # Add some visual features (edges, textures)
    draw.rectangle([(40, 20), (760, 550)], outline='black', width=2)
    
    # Convert to bytes
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


class TestPrescriptionOCR:
    """Tests for Prescription OCR endpoints"""
    
    def test_common_medicines_endpoint(self):
        """Test GET /api/prescription/common-medicines returns list of common medicines"""
        response = requests.get(f"{BASE_URL}/api/prescription/common-medicines")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "common_medicines" in data, "Response should contain 'common_medicines' key"
        assert isinstance(data["common_medicines"], list), "common_medicines should be a list"
        assert len(data["common_medicines"]) > 0, "Should have at least one common medicine"
        
        # Check structure of first medicine
        first_med = data["common_medicines"][0]
        assert "name" in first_med, "Medicine should have 'name' field"
        assert "category" in first_med, "Medicine should have 'category' field"
        print(f"✓ Common medicines endpoint returned {len(data['common_medicines'])} medicines")
    
    def test_extract_prescription_with_image(self):
        """Test POST /api/prescription/extract with a test prescription image"""
        # Create test image
        image_bytes = create_test_prescription_image()
        
        # Prepare multipart form data
        files = {
            'file': ('prescription.png', image_bytes, 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/prescription/extract",
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success' field"
        assert "medicines" in data, "Response should contain 'medicines' field"
        assert "message" in data, "Response should contain 'message' field"
        
        # The OCR should extract some medicines from our test image
        print(f"✓ Prescription OCR response: success={data['success']}, medicines={len(data.get('medicines', []))}")
        print(f"  Message: {data.get('message')}")
        
        if data.get('medicines'):
            for med in data['medicines'][:3]:  # Show first 3
                print(f"  - {med.get('name')}: {med.get('dosage')} {med.get('frequency')}")
    
    def test_extract_prescription_invalid_file_type(self):
        """Test POST /api/prescription/extract rejects non-image files"""
        # Send a text file instead of image
        files = {
            'file': ('test.txt', b'This is not an image', 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/prescription/extract",
            files=files
        )
        
        # Should return 400 for invalid file type
        assert response.status_code == 400, f"Expected 400 for non-image, got {response.status_code}"
        print("✓ Correctly rejects non-image files")


class TestVoiceBooking:
    """Tests for Voice Booking endpoints"""
    
    def test_doctors_endpoint(self):
        """Test GET /api/voice-booking/doctors returns available doctors"""
        response = requests.get(f"{BASE_URL}/api/voice-booking/doctors")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "doctors" in data, "Response should contain 'doctors' key"
        assert isinstance(data["doctors"], list), "doctors should be a list"
        print(f"✓ Doctors endpoint returned {len(data['doctors'])} doctors")
        
        if data["doctors"]:
            for doc in data["doctors"][:3]:
                print(f"  - {doc.get('name')}: {doc.get('specialization')} at {doc.get('clinic')}")
    
    def test_parse_intent_doctor_appointment(self):
        """Test POST /api/voice-booking/parse-intent with doctor appointment request"""
        payload = {
            "text": "Book appointment with Dr. Vikas tomorrow at 3 PM"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/parse-intent",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "understood" in data, "Response should contain 'understood' field"
        assert "message" in data, "Response should contain 'message' field"
        
        print(f"✓ Voice booking parse result: understood={data.get('understood')}")
        print(f"  Service: {data.get('service')}")
        print(f"  Doctor: {data.get('doctor_name')}")
        print(f"  Date: {data.get('date')}")
        print(f"  Time: {data.get('time')}")
        print(f"  Message: {data.get('message')}")
        
        if data.get('suggestions'):
            print(f"  Suggestions: {data.get('suggestions')}")
    
    def test_parse_intent_lab_test(self):
        """Test POST /api/voice-booking/parse-intent with lab test request"""
        payload = {
            "text": "I need a blood test at Mango Labs"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/parse-intent",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "understood" in data, "Response should contain 'understood' field"
        
        print(f"✓ Lab test parse result: understood={data.get('understood')}")
        print(f"  Service: {data.get('service')}")
        print(f"  Test: {data.get('test_name')}")
        print(f"  Message: {data.get('message')}")
    
    def test_parse_intent_pharmacy_order(self):
        """Test POST /api/voice-booking/parse-intent with pharmacy order request"""
        payload = {
            "text": "Order Paracetamol from pharmacy"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/parse-intent",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "understood" in data, "Response should contain 'understood' field"
        
        print(f"✓ Pharmacy order parse result: understood={data.get('understood')}")
        print(f"  Service: {data.get('service')}")
        print(f"  Medicine: {data.get('medicine_name')}")
        print(f"  Message: {data.get('message')}")
    
    def test_parse_intent_empty_text(self):
        """Test POST /api/voice-booking/parse-intent rejects empty text"""
        payload = {
            "text": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/parse-intent",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 for empty text
        assert response.status_code == 400, f"Expected 400 for empty text, got {response.status_code}"
        print("✓ Correctly rejects empty text")
    
    def test_parse_intent_short_text(self):
        """Test POST /api/voice-booking/parse-intent rejects very short text"""
        payload = {
            "text": "hi"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/parse-intent",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 for text < 3 chars
        assert response.status_code == 400, f"Expected 400 for short text, got {response.status_code}"
        print("✓ Correctly rejects text shorter than 3 characters")


class TestHealthEndpoint:
    """Basic health check to ensure API is running"""
    
    def test_health_check(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
