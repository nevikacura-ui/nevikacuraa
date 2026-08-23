"""
Phase 4 - Market Leader Features Tests
Tests for:
1. Prescription Photo Upload
2. Family Profiles CRUD
3. Clinic-to-Home Continuity (post-visit recommendations)
4. Medicine Stock Status API
5. Subscription Health Plans
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')
TEST_PHONE = "9403890429"


class TestHealthPlansAPI:
    """Health Plans subscription feature tests"""
    
    def test_get_health_plans_returns_3_plans(self):
        """GET /api/health-plans should return 3 plans with correct ids"""
        response = requests.get(f"{BASE_URL}/api/health-plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) == 3
        
        plan_ids = [p["id"] for p in data["plans"]]
        assert "diabetes-care" in plan_ids
        assert "womens-health" in plan_ids
        assert "family-wellness" in plan_ids
    
    def test_health_plans_have_correct_prices(self):
        """Verify health plans have correct prices: 499, 599, 999"""
        response = requests.get(f"{BASE_URL}/api/health-plans")
        assert response.status_code == 200
        plans = response.json()["plans"]
        
        prices_by_id = {p["id"]: p["price"] for p in plans}
        assert prices_by_id["diabetes-care"] == 499
        assert prices_by_id["womens-health"] == 599
        assert prices_by_id["family-wellness"] == 999
    
    def test_subscribe_to_health_plan(self):
        """POST /api/health-plans/subscribe should create a subscription"""
        payload = {
            "plan_id": "diabetes-care",
            "phone": TEST_PHONE,
            "patient_name": "Test Patient"
        }
        response = requests.post(f"{BASE_URL}/api/health-plans/subscribe", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "subscription" in data
        assert data["subscription"]["plan_id"] == "diabetes-care"
        assert data["subscription"]["status"] == "active"
    
    def test_subscribe_invalid_plan_returns_404(self):
        """POST /api/health-plans/subscribe with invalid plan_id returns 404"""
        payload = {
            "plan_id": "invalid-plan",
            "phone": TEST_PHONE,
            "patient_name": "Test Patient"
        }
        response = requests.post(f"{BASE_URL}/api/health-plans/subscribe", json=payload)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_get_my_subscriptions(self):
        """GET /api/health-plans/my-subscriptions/{phone} returns subscriptions array"""
        response = requests.get(f"{BASE_URL}/api/health-plans/my-subscriptions/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert "subscriptions" in data
        assert isinstance(data["subscriptions"], list)


class TestPrescriptionUpload:
    """Prescription photo upload feature tests"""
    
    def test_upload_prescription_multipart(self):
        """POST /api/pharmacy/upload-prescription accepts multipart form data"""
        # Create a simple test image (1x1 pixel PNG)
        png_data = bytes([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,  # PNG signature
            0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,  # IHDR header
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
            0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59,
            0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
            0x44, 0xae, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_prescription.png', io.BytesIO(png_data), 'image/png')
        }
        data = {
            'phone': TEST_PHONE,
            'patient_name': 'Test Patient',
            'notes': 'Test prescription upload'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/upload-prescription",
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert "prescription_id" in result
        assert result["status"] == "pending"
    
    def test_get_prescriptions_by_phone(self):
        """GET /api/pharmacy/prescriptions/{phone} returns prescriptions array"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/prescriptions/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert "prescriptions" in data
        assert isinstance(data["prescriptions"], list)


class TestFamilyProfiles:
    """Family profiles CRUD tests"""
    
    member_id = None
    
    def test_create_family_member(self):
        """POST /api/family/members creates a family member"""
        payload = {
            "name": "Test Family Member",
            "relation": "Spouse",
            "age": 30,
            "gender": "Female",
            "blood_group": "O+"
        }
        response = requests.post(
            f"{BASE_URL}/api/family/members?phone={TEST_PHONE}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "member" in data
        assert data["member"]["name"] == "Test Family Member"
        assert data["member"]["relation"] == "Spouse"
        TestFamilyProfiles.member_id = data["member"]["id"]
    
    def test_get_family_members(self):
        """GET /api/family/members/{phone} returns members array"""
        response = requests.get(f"{BASE_URL}/api/family/members/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert isinstance(data["members"], list)
    
    def test_delete_family_member(self):
        """DELETE /api/family/members/{id} removes a member"""
        if not TestFamilyProfiles.member_id:
            # Create one first
            payload = {"name": "To Delete", "relation": "Other"}
            resp = requests.post(f"{BASE_URL}/api/family/members?phone={TEST_PHONE}", json=payload)
            TestFamilyProfiles.member_id = resp.json()["member"]["id"]
        
        response = requests.delete(f"{BASE_URL}/api/family/members/{TestFamilyProfiles.member_id}")
        assert response.status_code == 200
        assert response.json()["success"] == True
    
    def test_delete_nonexistent_member_returns_404(self):
        """DELETE /api/family/members/{id} returns 404 for nonexistent member"""
        response = requests.delete(f"{BASE_URL}/api/family/members/nonexistent123")
        assert response.status_code == 404


class TestPostVisitRecommendations:
    """Clinic-to-Home continuity - post-visit recommendations tests"""
    
    def test_get_recommendations_nonexistent_appointment(self):
        """GET /api/appointments/{id}/recommendations returns 404 for nonexistent appointment"""
        response = requests.get(f"{BASE_URL}/api/appointments/nonexistent123/recommendations")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestMedicineStockStatus:
    """Medicine stock status API tests"""
    
    def test_get_stock_status(self):
        """GET /api/pharmacy/stock-status returns medicines array"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/stock-status")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert isinstance(data["medicines"], list)
    
    def test_update_stock_status(self):
        """POST /api/pharmacy/update-stock updates stock status"""
        params = {
            "medicine_name": "TEST_Paracetamol 500mg",
            "stock_status": "in_stock",
            "stock_quantity": 100,
            "available_in": "2 hours"
        }
        response = requests.post(f"{BASE_URL}/api/pharmacy/update-stock", params=params)
        assert response.status_code == 200
        assert response.json()["success"] == True
    
    def test_update_stock_requires_medicine_name(self):
        """POST /api/pharmacy/update-stock requires medicine_name"""
        response = requests.post(f"{BASE_URL}/api/pharmacy/update-stock", data={})
        assert response.status_code == 400
        assert "name required" in response.json()["detail"].lower()
    
    def test_get_stock_status_with_search(self):
        """GET /api/pharmacy/stock-status?search= filters by name"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/stock-status?search=TEST_Paracetamol")
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data


# Cleanup test
class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_family_members(self):
        """Clean up test family members"""
        response = requests.get(f"{BASE_URL}/api/family/members/{TEST_PHONE}")
        if response.status_code == 200:
            members = response.json().get("members", [])
            for m in members:
                if m.get("name", "").startswith("Test") or m.get("name", "").startswith("To Delete"):
                    requests.delete(f"{BASE_URL}/api/family/members/{m['id']}")
        assert True
