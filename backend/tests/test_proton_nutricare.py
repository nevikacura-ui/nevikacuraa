"""
Test suite for Proton Diagnostic booking API and Nutricare page features
Iteration 149 - Testing new Proton Diagnostic and Orange Nutricare pages
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProtonBookingAPI:
    """Tests for POST /api/proton/book endpoint (Sonography & ECG bookings)"""
    
    def test_proton_booking_success(self):
        """Test successful Proton Diagnostic booking with all required fields"""
        booking_data = {
            "patient_name": "TEST_Priya Sharma",
            "age": "28",
            "husband_name": "Rahul Sharma",
            "address": "123 Test Street, Naigaon East",
            "mobile_number": "9999888877",
            "scan_type": "Early Scan",
            "lmp": "2025-12-15",
            "date_of_birth": "1997-06-20",
            "has_children": False,
            "children": [],
            "booking_date": datetime.now().strftime("%Y-%m-%d"),
            "booking_time": "To be confirmed",
            "clinic": "Proton Diagnostic",
            "notes": "Price: ₹800"
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        assert "booking_id" in data, f"booking_id missing from response: {data}"
        assert data["booking_id"].startswith("PD-"), f"booking_id should start with PD-, got: {data['booking_id']}"
        assert "message" in data, f"message missing from response: {data}"
        
        print(f"✅ Proton booking success - Booking ID: {data['booking_id']}")
        return data["booking_id"]
    
    def test_proton_booking_nt_scan(self):
        """Test NT Scan booking (Nuchal Translucency - ₹1500)"""
        booking_data = {
            "patient_name": "TEST_Anjali Verma",
            "age": "30",
            "husband_name": "Sanjay Verma",
            "mobile_number": "9998877766",
            "scan_type": "NT Scan (Nuchal Translucency)",
            "booking_date": datetime.now().strftime("%Y-%m-%d"),
            "lmp": "2025-11-20",
            "has_children": True,
            "children": [{"gender": "boy", "age": "3 years"}],
            "notes": "Price: ₹1500"
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "NT Scan" in data.get("message", ""), f"Message should mention NT Scan: {data}"
        
        print(f"✅ NT Scan booking success - ID: {data['booking_id']}")
    
    def test_proton_booking_ecg(self):
        """Test ECG booking (₹300)"""
        booking_data = {
            "patient_name": "TEST_Ramesh Kumar",
            "age": "55",
            "mobile_number": "9876543210",
            "scan_type": "ECG (Electrocardiogram)",
            "booking_date": datetime.now().strftime("%Y-%m-%d"),
            "has_children": False,
            "notes": "Price: ₹300"
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "ECG" in data.get("message", "")
        
        print(f"✅ ECG booking success - ID: {data['booking_id']}")
    
    def test_proton_booking_usg_whole_abdomen(self):
        """Test USG Whole Abdomen booking (₹1200)"""
        booking_data = {
            "patient_name": "TEST_Sunita Devi",
            "age": "45",
            "mobile_number": "9191919191",
            "scan_type": "USG Whole Abdomen",
            "booking_date": datetime.now().strftime("%Y-%m-%d"),
            "address": "456 Health Street, Naigaon"
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"✅ USG Whole Abdomen booking success - ID: {data['booking_id']}")
    
    def test_proton_booking_missing_required_fields(self):
        """Test booking fails with missing required fields (patient_name, mobile_number, scan_type)"""
        # Missing mobile_number
        incomplete_data = {
            "patient_name": "TEST_Incomplete",
            "scan_type": "Early Scan",
            "booking_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=incomplete_data)
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for missing mobile_number, got {response.status_code}"
        
        print("✅ Validation correctly rejects missing required fields")
    
    def test_proton_booking_multiple_children(self):
        """Test booking with multiple previous children"""
        booking_data = {
            "patient_name": "TEST_Meena Patel",
            "age": "32",
            "husband_name": "Vikram Patel",
            "mobile_number": "9898989898",
            "scan_type": "Growth Scan",
            "booking_date": datetime.now().strftime("%Y-%m-%d"),
            "lmp": "2025-10-01",
            "has_children": True,
            "children": [
                {"gender": "girl", "age": "5 years"},
                {"gender": "boy", "age": "2 years"}
            ],
            "notes": "Price: ₹1000 - Third pregnancy"
        }
        
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"✅ Booking with multiple children success - ID: {data['booking_id']}")


class TestHealthEndpoint:
    """Basic health check to ensure backend is running"""
    
    def test_health_check(self):
        """Verify backend health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
