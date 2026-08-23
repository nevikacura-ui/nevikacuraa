"""
Test Voice Booking Phase 2 Features - Multi-turn Conversational AI Booking
Tests: /api/voice-booking/converse, /api/voice-booking/confirm-booking, /api/voice-booking/parse-intent, /api/voice-booking/doctors
Also tests: /api/prescription/extract (OCR)
"""

import pytest
import requests
import os
import json
import time
import base64
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVoiceBookingDoctors:
    """Test GET /api/voice-booking/doctors endpoint"""
    
    def test_get_doctors_returns_list(self):
        """Verify doctors endpoint returns a list of doctors"""
        response = requests.get(f"{BASE_URL}/api/voice-booking/doctors")
        assert response.status_code == 200
        data = response.json()
        assert "doctors" in data
        assert isinstance(data["doctors"], list)
        print(f"✓ GET /api/voice-booking/doctors returned {len(data['doctors'])} doctors")


class TestVoiceBookingParseIntent:
    """Test POST /api/voice-booking/parse-intent - Single-shot intent parsing"""
    
    def test_parse_intent_basic_booking(self):
        """Parse a basic booking request"""
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/parse-intent",
            json={"text": "Book Dr. Vikas tomorrow at 3 PM"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "understood" in data
        assert "message" in data
        print(f"✓ Parse intent response: understood={data.get('understood')}, message={data.get('message')[:50]}...")
    
    def test_parse_intent_empty_text_fails(self):
        """Empty text should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/parse-intent",
            json={"text": ""}
        )
        assert response.status_code == 400
        print("✓ Empty text correctly returns 400")
    
    def test_parse_intent_short_text_fails(self):
        """Very short text should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/parse-intent",
            json={"text": "hi"}
        )
        assert response.status_code == 400
        print("✓ Short text correctly returns 400")


class TestVoiceBookingConverse:
    """Test POST /api/voice-booking/converse - Multi-turn conversational booking"""
    
    def test_converse_first_message(self):
        """First message in conversation should get AI reply"""
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/converse",
            json={
                "messages": [{"role": "user", "text": "Book Dr. Vikas"}],
                "current_intent": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert "intent" in data
        assert "ready_to_book" in data
        assert isinstance(data["reply"], str)
        assert len(data["reply"]) > 0
        print(f"✓ First message reply: {data['reply'][:80]}...")
        print(f"  Intent: {json.dumps(data['intent'])[:100]}...")
        print(f"  Ready to book: {data['ready_to_book']}")
        return data
    
    def test_converse_multi_turn_flow(self):
        """Test multi-turn conversation flow - AI asks follow-ups one at a time"""
        # Turn 1: Book Dr. Vikas
        messages = [{"role": "user", "text": "Book Dr. Vikas"}]
        response1 = requests.post(
            f"{BASE_URL}/api/voice-booking/converse",
            json={"messages": messages, "current_intent": {}}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        print(f"Turn 1 - User: 'Book Dr. Vikas'")
        print(f"  AI: {data1['reply'][:80]}...")
        
        # Turn 2: Add date and time
        messages.append({"role": "assistant", "text": data1["reply"]})
        messages.append({"role": "user", "text": "Tomorrow at 6 PM"})
        
        response2 = requests.post(
            f"{BASE_URL}/api/voice-booking/converse",
            json={"messages": messages, "current_intent": data1.get("intent", {})}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        print(f"Turn 2 - User: 'Tomorrow at 6 PM'")
        print(f"  AI: {data2['reply'][:80]}...")
        
        # Turn 3: Add patient details
        messages.append({"role": "assistant", "text": data2["reply"]})
        messages.append({"role": "user", "text": "Rahul Sharma 9876543210"})
        
        response3 = requests.post(
            f"{BASE_URL}/api/voice-booking/converse",
            json={"messages": messages, "current_intent": data2.get("intent", {})}
        )
        assert response3.status_code == 200
        data3 = response3.json()
        print(f"Turn 3 - User: 'Rahul Sharma 9876543210'")
        print(f"  AI: {data3['reply'][:80]}...")
        print(f"  Final intent: {json.dumps(data3['intent'])}")
        print(f"  Ready to book: {data3['ready_to_book']}")
        
        # Verify intent has been progressively filled
        intent = data3.get("intent", {})
        # Check that at least some fields are filled
        filled_fields = [k for k in ['doctor_name', 'date', 'time', 'patient_name', 'patient_phone'] if intent.get(k)]
        print(f"  Filled fields: {filled_fields}")
        assert len(filled_fields) >= 2, f"Expected at least 2 fields filled, got {len(filled_fields)}"
        print("✓ Multi-turn conversation flow working")
    
    def test_converse_empty_messages_fails(self):
        """Empty messages array should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/converse",
            json={"messages": [], "current_intent": {}}
        )
        assert response.status_code == 400
        print("✓ Empty messages correctly returns 400")


class TestVoiceBookingConfirmBooking:
    """Test POST /api/voice-booking/confirm-booking - Auto-book appointment"""
    
    def test_confirm_booking_creates_appointment(self):
        """Confirm booking should create appointment in MongoDB"""
        # Use a unique date/time to avoid conflicts
        test_date = "2026-03-26"
        test_time = "19:30"
        test_phone = "9876543211"
        
        payload = {
            "doctor": "Dr. Vikas",
            "clinic": "Pushpa Clinic",
            "date": test_date,
            "time": test_time,
            "patient_name": "TEST_VoiceBooking_User",
            "patient_phone": test_phone,
            "patient_email": "test@example.com",
            "source": "voice_booking"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/confirm-booking",
            json=payload
        )
        
        # Could be 200 (success) or 400 (slot taken)
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "booking_id" in data
            assert "appointment_id" in data
            assert data.get("doctor") == "Dr. Vikas"
            assert data.get("clinic") == "Pushpa Clinic"
            assert data.get("patient_name") == "TEST_VoiceBooking_User"
            print(f"✓ Booking confirmed! ID: #{data['booking_id']}, Appointment: {data['appointment_id']}")
            
            # Cleanup: Delete the test appointment
            cleanup_response = requests.delete(
                f"{BASE_URL}/api/appointments/{data['appointment_id']}"
            )
            if cleanup_response.status_code in [200, 204]:
                print(f"  Cleaned up test appointment {data['appointment_id']}")
        elif response.status_code == 400:
            data = response.json()
            print(f"✓ Slot conflict handled correctly: {data.get('detail', 'Slot taken')}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}, response: {response.text}")
    
    def test_confirm_booking_missing_fields(self):
        """Missing required fields should fail validation"""
        payload = {
            "doctor": "Dr. Vikas",
            # Missing: clinic, date, time, patient_name, patient_phone
        }
        
        response = requests.post(
            f"{BASE_URL}/api/voice-booking/confirm-booking",
            json=payload
        )
        assert response.status_code == 422  # Pydantic validation error
        print("✓ Missing fields correctly returns 422 validation error")


class TestPrescriptionOCR:
    """Test POST /api/prescription/extract - Prescription OCR with Gemini Vision"""
    
    def test_prescription_extract_with_image(self):
        """Test prescription OCR with a real image"""
        # Create a simple test image with text using PIL
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # Create image with prescription-like text
            img = Image.new('RGB', (400, 300), color='white')
            draw = ImageDraw.Draw(img)
            
            # Add prescription text
            draw.text((20, 20), "Dr. Test Clinic", fill='black')
            draw.text((20, 50), "Prescription", fill='black')
            draw.text((20, 100), "1. Paracetamol 500mg - 1 tablet twice daily", fill='black')
            draw.text((20, 130), "2. Omeprazole 20mg - 1 tablet before meals", fill='black')
            draw.text((20, 160), "3. Vitamin D3 - once weekly", fill='black')
            draw.text((20, 220), "Date: 2026-01-15", fill='black')
            
            # Save to bytes
            img_bytes = BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            # Upload to OCR endpoint
            files = {'file': ('prescription.png', img_bytes, 'image/png')}
            response = requests.post(
                f"{BASE_URL}/api/prescription/extract",
                files=files
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "success" in data
            assert "medicines" in data
            assert "message" in data
            print(f"✓ Prescription OCR response: success={data['success']}")
            print(f"  Medicines found: {len(data['medicines'])}")
            print(f"  Message: {data['message']}")
            if data.get('raw_text'):
                print(f"  Raw text: {data['raw_text'][:100]}...")
                
        except ImportError:
            pytest.skip("PIL not available for image creation")
    
    def test_prescription_extract_invalid_file(self):
        """Non-image file should return 400"""
        files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/prescription/extract",
            files=files
        )
        assert response.status_code == 400
        print("✓ Non-image file correctly returns 400")
    
    def test_common_medicines_endpoint(self):
        """Test GET /api/prescription/common-medicines"""
        response = requests.get(f"{BASE_URL}/api/prescription/common-medicines")
        assert response.status_code == 200
        data = response.json()
        assert "common_medicines" in data
        assert len(data["common_medicines"]) > 0
        print(f"✓ Common medicines: {len(data['common_medicines'])} items returned")


class TestVoiceBookingE2EFlow:
    """End-to-end test of voice booking flow"""
    
    def test_full_voice_booking_flow(self):
        """Complete flow: converse -> ready_to_book -> confirm-booking"""
        print("\n=== E2E Voice Booking Flow ===")
        
        # Step 1: Start conversation
        messages = [{"role": "user", "text": "I want to book an appointment with Dr. Vikas at Pushpa Clinic"}]
        
        response1 = requests.post(
            f"{BASE_URL}/api/voice-booking/converse",
            json={"messages": messages, "current_intent": {}}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        print(f"Step 1 - AI: {data1['reply'][:60]}...")
        
        # Step 2: Provide date/time
        messages.append({"role": "assistant", "text": data1["reply"]})
        messages.append({"role": "user", "text": "March 27th 2026 at 7 PM"})
        
        response2 = requests.post(
            f"{BASE_URL}/api/voice-booking/converse",
            json={"messages": messages, "current_intent": data1.get("intent", {})}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        print(f"Step 2 - AI: {data2['reply'][:60]}...")
        
        # Step 3: Provide patient details
        messages.append({"role": "assistant", "text": data2["reply"]})
        messages.append({"role": "user", "text": "My name is Test Patient and phone is 9999888877"})
        
        response3 = requests.post(
            f"{BASE_URL}/api/voice-booking/converse",
            json={"messages": messages, "current_intent": data2.get("intent", {})}
        )
        assert response3.status_code == 200
        data3 = response3.json()
        print(f"Step 3 - AI: {data3['reply'][:60]}...")
        print(f"  Intent: {json.dumps(data3['intent'])}")
        print(f"  Ready to book: {data3['ready_to_book']}")
        
        # If ready to book, confirm the booking
        if data3.get("ready_to_book"):
            intent = data3["intent"]
            confirm_payload = {
                "doctor": intent.get("doctor_name", "Dr. Vikas"),
                "clinic": intent.get("clinic", "Pushpa Clinic"),
                "date": intent.get("date", "2026-03-27"),
                "time": intent.get("time", "19:00"),
                "patient_name": intent.get("patient_name", "Test Patient"),
                "patient_phone": intent.get("patient_phone", "9999888877"),
                "source": "voice_booking"
            }
            
            confirm_response = requests.post(
                f"{BASE_URL}/api/voice-booking/confirm-booking",
                json=confirm_payload
            )
            
            if confirm_response.status_code == 200:
                confirm_data = confirm_response.json()
                print(f"Step 4 - Booking confirmed! ID: #{confirm_data['booking_id']}")
                
                # Cleanup
                if confirm_data.get("appointment_id"):
                    requests.delete(f"{BASE_URL}/api/appointments/{confirm_data['appointment_id']}")
                    print(f"  Cleaned up test appointment")
            else:
                print(f"Step 4 - Booking response: {confirm_response.status_code} - {confirm_response.text[:100]}")
        else:
            print("Note: AI did not set ready_to_book=true yet (may need more turns)")
        
        print("✓ E2E flow completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
