"""
Tests for Mango Toggle Diagnostic Flow - Iteration 150
Tests the /api/proton/book endpoint used by MangoUltrasound page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProtonBookEndpoint:
    """Tests for POST /api/proton/book endpoint (Ultrasound & ECG bookings via MangoUltrasound)"""
    
    def test_early_pregnancy_scan_booking(self):
        """Test booking Early Pregnancy Scan via /api/proton/book"""
        booking_data = {
            "patient_name": "TEST_MangoToggle_EarlyPregnancy",
            "mobile_number": "9999999991",
            "scan_type": "Early Pregnancy Scan",
            "age": "25",
            "husband_name": "Test Husband",
            "address": "Test Address 123",
            "clinic": "Proton Diagnostic",
            "booking_date": "2026-02-26",
            "booking_time": "To be confirmed",
            "notes": "Price: Rs.800"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        assert "booking_id" in data
        assert "PD-" in data["booking_id"]
        print(f"✓ Early Pregnancy Scan booking created: {data['booking_id']}")
    
    def test_nt_scan_booking(self):
        """Test booking NT Scan via /api/proton/book"""
        booking_data = {
            "patient_name": "TEST_MangoToggle_NTScan",
            "mobile_number": "9999999992",
            "scan_type": "NT Scan",
            "age": "28",
            "clinic": "Proton Diagnostic",
            "booking_date": "2026-02-26"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "booking_id" in data
        print(f"✓ NT Scan booking created: {data['booking_id']}")
    
    def test_anomaly_scan_booking(self):
        """Test booking Anomaly Scan via /api/proton/book"""
        booking_data = {
            "patient_name": "TEST_MangoToggle_AnomalyScan",
            "mobile_number": "9999999993",
            "scan_type": "Anomaly Scan",
            "age": "30",
            "clinic": "Proton Diagnostic",
            "booking_date": "2026-02-26"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Anomaly Scan booking created: {data['booking_id']}")
    
    def test_growth_scan_booking(self):
        """Test booking Growth Scan via /api/proton/book"""
        booking_data = {
            "patient_name": "TEST_MangoToggle_GrowthScan",
            "mobile_number": "9999999994",
            "scan_type": "Growth Scan",
            "age": "26",
            "clinic": "Proton Diagnostic",
            "booking_date": "2026-02-26"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Growth Scan booking created: {data['booking_id']}")
    
    def test_follicular_study_booking(self):
        """Test booking Follicular Study via /api/proton/book"""
        booking_data = {
            "patient_name": "TEST_MangoToggle_FollicularStudy",
            "mobile_number": "9999999995",
            "scan_type": "Follicular Study",
            "age": "29",
            "clinic": "Proton Diagnostic",
            "booking_date": "2026-02-26"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Follicular Study booking created: {data['booking_id']}")
    
    def test_pelvis_scan_booking(self):
        """Test booking Pelvis Scan via /api/proton/book"""
        booking_data = {
            "patient_name": "TEST_MangoToggle_PelvisScan",
            "mobile_number": "9999999996",
            "scan_type": "Pelvis Scan",
            "age": "27",
            "clinic": "Proton Diagnostic",
            "booking_date": "2026-02-26"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Pelvis Scan booking created: {data['booking_id']}")
    
    def test_ecg_booking(self):
        """Test booking ECG (Cardiac Service) via /api/proton/book"""
        booking_data = {
            "patient_name": "TEST_MangoToggle_ECG",
            "mobile_number": "9999999997",
            "scan_type": "ECG",
            "age": "35",
            "clinic": "Proton Diagnostic",
            "booking_date": "2026-02-26"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ ECG booking created: {data['booking_id']}")
    
    def test_booking_with_children_info(self):
        """Test booking with previous children information"""
        booking_data = {
            "patient_name": "TEST_MangoToggle_WithChildren",
            "mobile_number": "9999999998",
            "scan_type": "Growth Scan",
            "age": "32",
            "husband_name": "Test Husband",
            "address": "Test Address 456",
            "clinic": "Proton Diagnostic",
            "booking_date": "2026-02-26",
            "has_children": True,
            "children": [
                {"gender": "boy", "age": "5"},
                {"gender": "girl", "age": "3"}
            ],
            "lmp": "2026-01-15",
            "date_of_birth": "1994-05-20",
            "notes": "Price: Rs.1000"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Booking with children info created: {data['booking_id']}")
    
    def test_booking_missing_required_fields(self):
        """Test booking fails with missing required fields"""
        # Missing patient_name and mobile_number
        incomplete_data = {
            "scan_type": "NT Scan",
            "clinic": "Proton Diagnostic"
        }
        response = requests.post(f"{BASE_URL}/api/proton/book", json=incomplete_data)
        # API should return 422 for validation errors
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Validation correctly rejects incomplete data")
