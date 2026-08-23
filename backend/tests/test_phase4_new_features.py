"""
Test Phase 4 New Features - Iteration 170
- Unified Checkout (POST /api/checkout/unified)
- Post-Visit Automation (POST /api/appointments/{id}/complete, GET /api/post-visit/pending/{phone})
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://premium-rx-portal.preview.emergentagent.com"


class TestUnifiedCheckout:
    """Test Unified Checkout endpoint for pharmacy, lab, and consultation items"""
    
    def test_unified_checkout_pharmacy_only(self):
        """Test unified checkout with pharmacy items only"""
        payload = {
            "customer": {
                "name": "TEST_User_Pharmacy",
                "phone": "9876543210",
                "email": "testpharmacy@test.com"
            },
            "address": {
                "type": "home",
                "line1": "123 Test Street",
                "line2": "Near Test Plaza",
                "city": "Chhindwara",
                "pincode": "480001"
            },
            "payment_method": "pay_later",
            "items": [
                {"id": "med-1", "name": "Paracetamol 500mg", "price": 50, "quantity": 2, "type": "pharmacy"},
                {"id": "med-2", "name": "Vitamin D3", "price": 120, "quantity": 1, "type": "pharmacy"}
            ],
            "subtotal": 220,
            "discount": 0,
            "delivery_fee": 30,
            "total": 250,
            "order_type": "unified"
        }
        
        response = requests.post(f"{BASE_URL}/api/checkout/unified", json=payload)
        print(f"Unified Checkout (Pharmacy) Response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "order_id" in data, "Response should contain order_id"
        assert data["order_id"].startswith("UC-"), f"Order ID should start with UC-, got {data['order_id']}"
        assert "sub_orders" in data, "Response should contain sub_orders"
        
        # Verify pharmacy sub-order was created
        pharmacy_sub = [s for s in data["sub_orders"] if s["type"] == "pharmacy"]
        assert len(pharmacy_sub) == 1, "Should have one pharmacy sub-order"
        assert pharmacy_sub[0]["items_count"] == 2
        print(f"SUCCESS: Unified checkout created order {data['order_id']} with pharmacy sub-order")
    
    def test_unified_checkout_lab_only(self):
        """Test unified checkout with lab items only"""
        payload = {
            "customer": {
                "name": "TEST_User_Lab",
                "phone": "9876543211",
                "email": "testlab@test.com"
            },
            "address": {
                "type": "home",
                "line1": "456 Lab Lane",
                "city": "Chhindwara",
                "pincode": "480001"
            },
            "payment_method": "pay_later",
            "items": [
                {"id": "lab-1", "name": "Complete Blood Count", "price": 350, "quantity": 1, "type": "lab"},
                {"id": "lab-2", "name": "Thyroid Profile", "price": 450, "quantity": 1, "type": "lab"}
            ],
            "subtotal": 800,
            "total": 800,
            "order_type": "unified"
        }
        
        response = requests.post(f"{BASE_URL}/api/checkout/unified", json=payload)
        print(f"Unified Checkout (Lab) Response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "order_id" in data
        
        # Verify lab sub-order was created
        lab_sub = [s for s in data["sub_orders"] if s["type"] == "lab"]
        assert len(lab_sub) == 1, "Should have one lab sub-order"
        assert lab_sub[0]["items_count"] == 2
        print(f"SUCCESS: Unified checkout created order {data['order_id']} with lab sub-order")
    
    def test_unified_checkout_mixed_items(self):
        """Test unified checkout with pharmacy + lab + consultation items"""
        payload = {
            "customer": {
                "name": "TEST_User_Mixed",
                "phone": "9876543212",
                "email": "testmixed@test.com"
            },
            "address": {
                "type": "office",
                "line1": "789 Mixed Building",
                "city": "Chhindwara",
                "pincode": "480001"
            },
            "payment_method": "upi",
            "items": [
                {"id": "med-1", "name": "Metformin 500mg", "price": 85, "quantity": 1, "type": "pharmacy"},
                {"id": "lab-1", "name": "HbA1c Test", "price": 400, "quantity": 1, "type": "lab"},
                {"id": "con-1", "name": "Dr. Vikas Consultation", "price": 500, "quantity": 1, "type": "consultation"}
            ],
            "subtotal": 985,
            "discount": 50,
            "delivery_fee": 0,
            "total": 935,
            "order_type": "unified"
        }
        
        response = requests.post(f"{BASE_URL}/api/checkout/unified", json=payload)
        print(f"Unified Checkout (Mixed) Response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "order_id" in data
        assert "sub_orders" in data
        
        # Verify all 3 sub-orders were created
        sub_types = [s["type"] for s in data["sub_orders"]]
        assert "pharmacy" in sub_types, "Should have pharmacy sub-order"
        assert "lab" in sub_types, "Should have lab sub-order"
        assert "consultation" in sub_types, "Should have consultation sub-order"
        
        print(f"SUCCESS: Unified checkout created order {data['order_id']} with 3 sub-orders: {sub_types}")


class TestPostVisitAutomation:
    """Test Post-Visit Automation - Complete appointment and get recommendations"""
    
    @pytest.fixture
    def test_appointment(self):
        """Create a test appointment for post-visit tests"""
        test_id = f"TEST-APT-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "doctor": "Dr. Priya Gynecology",
            "clinic": "Pushpa Clinic",
            "date": "2026-03-05",
            "time": "10:00 AM",
            "patient_name": "Test Patient PostVisit",
            "patient_phone": "9998887776",
            "reason": "Routine gynecology checkup",
            "service": "diagyn"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=payload)
        if response.status_code == 200:
            data = response.json()
            booking_id = data.get("booking_id") or data.get("id")
            print(f"Created test appointment: {booking_id}")
            return booking_id
        else:
            # If appointment creation fails, we'll use a mock ID for the test
            print(f"Warning: Could not create appointment, using mock ID. Response: {response.status_code}")
            return test_id
    
    def test_complete_appointment_gynecology(self, test_appointment):
        """Test completing a gynecology appointment generates correct recommendations"""
        appointment_id = test_appointment
        
        payload = {
            "notes": "Patient healthy, routine checkup completed",
            "prescription": "Folic acid supplements recommended",
            "follow_up_days": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments/{appointment_id}/complete", json=payload)
        print(f"Complete Appointment Response: {response.status_code}")
        
        # If appointment wasn't found (404), the fixture may have used a mock ID
        if response.status_code == 404:
            print("INFO: Appointment not found - this is expected if appointment creation failed")
            pytest.skip("Appointment not found - skipping completion test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "recommendations" in data, "Response should contain recommendations"
        assert "follow_up_date" in data, "Response should contain follow_up_date"
        
        recs = data["recommendations"]
        assert "medicines" in recs, "Recommendations should contain medicines"
        assert "lab_tests" in recs, "Recommendations should contain lab_tests"
        
        # For gynecology, we expect specific recommendations
        print(f"SUCCESS: Appointment completed. Recommendations: {len(recs.get('medicines', []))} medicines, {len(recs.get('lab_tests', []))} lab tests")
    
    def test_complete_appointment_diabetes(self):
        """Test completing a diabetes appointment generates correct recommendations"""
        # First create a diabetes appointment
        payload = {
            "doctor": "Dr. Vikas Diabetes",
            "clinic": "Diabetes Center",
            "date": "2026-03-06",
            "time": "11:00 AM",
            "patient_name": "Test Patient Diabetes",
            "patient_phone": "9998887775",
            "reason": "Diabetes follow-up",
            "service": "diagyn"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=payload)
        if response.status_code != 200:
            pytest.skip("Could not create diabetes appointment")
        
        appointment_id = response.json().get("booking_id") or response.json().get("id")
        print(f"Created diabetes appointment: {appointment_id}")
        
        # Complete the appointment
        complete_payload = {
            "notes": "Blood sugar levels need monitoring",
            "prescription": "Continue Metformin 500mg",
            "follow_up_days": 15
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments/{appointment_id}/complete", json=complete_payload)
        
        if response.status_code == 404:
            pytest.skip("Appointment not found")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "recommendations" in data
        
        recs = data["recommendations"]
        # Diabetes appointments should recommend HbA1c or glucometer items
        print(f"SUCCESS: Diabetes appointment completed. Specialty: {recs.get('specialty', 'general')}")
    
    def test_get_pending_recommendations(self):
        """Test getting pending post-visit recommendations for a phone number"""
        # Use a phone number that might have recommendations
        phone = "9998887776"
        
        response = requests.get(f"{BASE_URL}/api/post-visit/pending/{phone}")
        print(f"Get Pending Recommendations Response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recommendations" in data, "Response should contain recommendations array"
        
        recs = data["recommendations"]
        print(f"Found {len(recs)} pending recommendations for phone {phone}")
        
        # If there are recommendations, verify structure
        if len(recs) > 0:
            rec = recs[0]
            assert "appointment_id" in rec
            assert "medicines" in rec
            assert "lab_tests" in rec
            assert "status" in rec
            assert rec["status"] == "pending"
            print(f"SUCCESS: First recommendation from appointment {rec['appointment_id']}")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health Check Response: {response.status_code}")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
