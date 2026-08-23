"""
Test Suite for Iteration 311 - 5 New Features:
1. Emergency Health Card (QR)
2. Health Timeline (CuraLine)
3. Medicine Interaction Guardian
4. One-Tap Post-Visit Pipeline
5. Express Rx Flow
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test phone number from credentials
TEST_PHONE = "8108888330"


class TestEmergencyHealthCard:
    """Emergency Health Card API - GET/PUT /api/emergency-card/{phone}"""
    
    def test_get_emergency_card_returns_success(self):
        """GET /api/emergency-card/{phone} returns card data"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "card" in data
        print(f"✓ Emergency card retrieved for {TEST_PHONE}")
    
    def test_emergency_card_has_required_fields(self):
        """Card contains all required emergency fields"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/{TEST_PHONE}")
        assert response.status_code == 200
        card = response.json()["card"]
        
        required_fields = ["phone", "name", "blood_group", "allergies", 
                          "current_medications", "chronic_conditions", 
                          "emergency_contacts", "doctor_name", "doctor_phone"]
        for field in required_fields:
            assert field in card, f"Missing field: {field}"
        print(f"✓ Card has all required fields: {required_fields}")
    
    def test_update_emergency_card_blood_group(self):
        """PUT /api/emergency-card/{phone} updates blood group"""
        update_data = {"blood_group": "O+"}
        response = requests.put(
            f"{BASE_URL}/api/emergency-card/{TEST_PHONE}",
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["card"]["blood_group"] == "O+"
        print("✓ Blood group updated to O+")
    
    def test_update_emergency_card_allergies(self):
        """PUT /api/emergency-card/{phone} updates allergies list"""
        update_data = {"allergies": ["Penicillin", "Sulfa"]}
        response = requests.put(
            f"{BASE_URL}/api/emergency-card/{TEST_PHONE}",
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Penicillin" in data["card"]["allergies"]
        print("✓ Allergies updated successfully")


class TestHealthTimeline:
    """Health Timeline (CuraLine) API - GET /api/health-timeline/{phone}"""
    
    def test_get_health_timeline_returns_success(self):
        """GET /api/health-timeline/{phone} returns timeline data"""
        response = requests.get(f"{BASE_URL}/api/health-timeline/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"✓ Health timeline retrieved for {TEST_PHONE}")
    
    def test_health_timeline_has_stats(self):
        """Timeline includes stats (appointments, prescriptions, labs, orders)"""
        response = requests.get(f"{BASE_URL}/api/health-timeline/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data
        stats = data["stats"]
        assert "total_appointments" in stats
        assert "total_prescriptions" in stats
        assert "total_lab_tests" in stats
        assert "total_orders" in stats
        print(f"✓ Stats: {stats}")
    
    def test_health_timeline_has_events(self):
        """Timeline returns events array"""
        response = requests.get(f"{BASE_URL}/api/health-timeline/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        assert isinstance(data["events"], list)
        print(f"✓ Timeline has {len(data['events'])} events")
    
    def test_health_timeline_has_grouped_by_month(self):
        """Timeline groups events by month"""
        response = requests.get(f"{BASE_URL}/api/health-timeline/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "grouped" in data
        assert isinstance(data["grouped"], dict)
        print(f"✓ Events grouped by {len(data['grouped'])} months")
    
    def test_health_timeline_pagination(self):
        """Timeline supports pagination"""
        response = requests.get(f"{BASE_URL}/api/health-timeline/{TEST_PHONE}?limit=10&page=1")
        assert response.status_code == 200
        data = response.json()
        
        assert "page" in data
        assert "pages" in data
        assert "total" in data
        print(f"✓ Pagination: page {data['page']} of {data['pages']}, total {data['total']}")


class TestMedicineInteractions:
    """Medicine Interaction Guardian API - POST /api/medicine-interactions/check"""
    
    def test_check_warfarin_aspirin_interaction(self):
        """POST /api/medicine-interactions/check detects warfarin+aspirin high severity"""
        payload = {
            "cart_medicines": [{"name": "Warfarin 5mg", "generic_name": "warfarin"}],
            "new_medicine": {"name": "Aspirin 75mg", "generic_name": "aspirin"}
        }
        response = requests.post(
            f"{BASE_URL}/api/medicine-interactions/check",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["has_interactions"] is True
        assert len(data["warnings"]) > 0
        
        # Check for high severity warning
        high_severity = [w for w in data["warnings"] if w["severity"] == "high"]
        assert len(high_severity) > 0, "Expected high severity warning for warfarin+aspirin"
        print(f"✓ Detected {len(data['warnings'])} interactions, {len(high_severity)} high severity")
    
    def test_check_no_interaction(self):
        """POST /api/medicine-interactions/check returns empty for safe combo"""
        payload = {
            "cart_medicines": [{"name": "Paracetamol 500mg", "generic_name": "paracetamol"}],
            "new_medicine": {"name": "Vitamin D3", "generic_name": "cholecalciferol"}
        }
        response = requests.post(
            f"{BASE_URL}/api/medicine-interactions/check",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["has_interactions"] is False
        assert len(data["warnings"]) == 0
        print("✓ No interactions detected for safe combination")
    
    def test_check_empty_cart(self):
        """POST /api/medicine-interactions/check handles empty cart"""
        payload = {
            "cart_medicines": [],
            "new_medicine": {"name": "Aspirin 75mg"}
        }
        response = requests.post(
            f"{BASE_URL}/api/medicine-interactions/check",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["has_interactions"] is False
        print("✓ Empty cart handled correctly")
    
    def test_check_metformin_interaction(self):
        """POST /api/medicine-interactions/check detects metformin interactions"""
        payload = {
            "cart_medicines": [{"name": "Metformin 500mg", "generic_name": "metformin"}],
            "new_medicine": {"name": "Contrast Dye", "composition": "contrast dye"}
        }
        response = requests.post(
            f"{BASE_URL}/api/medicine-interactions/check",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["has_interactions"] is True
        print(f"✓ Metformin interaction detected: {len(data['warnings'])} warnings")


class TestPostVisitPipeline:
    """Post-Visit Pipeline API - GET/POST /api/visit-pipeline/*"""
    
    def test_get_pending_actions(self):
        """GET /api/visit-pipeline/pending/{phone} returns pending actions"""
        response = requests.get(f"{BASE_URL}/api/visit-pipeline/pending/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "pending_actions" in data
        assert "total_pending" in data
        assert isinstance(data["pending_actions"], list)
        print(f"✓ Found {data['total_pending']} pending post-visit actions")
    
    def test_pending_actions_structure(self):
        """Pending actions have correct structure"""
        response = requests.get(f"{BASE_URL}/api/visit-pipeline/pending/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        
        if data["pending_actions"]:
            action = data["pending_actions"][0]
            expected_fields = ["prescription_id", "doctor_name", "medicines", 
                             "suggested_labs", "medicine_count", "lab_count"]
            for field in expected_fields:
                assert field in action, f"Missing field: {field}"
            print(f"✓ Action structure valid: {action.get('medicine_count')} meds, {action.get('lab_count')} labs")
        else:
            print("✓ No pending actions (empty state)")
    
    def test_confirm_post_visit_requires_phone(self):
        """POST /api/visit-pipeline/confirm requires phone"""
        payload = {"medicines": [], "lab_tests": []}
        response = requests.post(
            f"{BASE_URL}/api/visit-pipeline/confirm",
            json=payload
        )
        assert response.status_code == 400
        print("✓ Confirm endpoint validates phone requirement")


class TestExpressRxFlow:
    """Express Rx Flow API - POST/GET /api/express-rx/*"""
    
    def test_start_express_flow(self):
        """POST /api/express-rx/start creates new flow"""
        payload = {
            "phone": TEST_PHONE,
            "symptoms": "TEST_fever and headache for 2 days"
        }
        response = requests.post(
            f"{BASE_URL}/api/express-rx/start",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "flow" in data
        assert data["flow"]["status"] == "consulting"
        assert "flow_id" in data["flow"]
        assert "status_pipeline" in data
        
        # Store flow_id for tracking test
        TestExpressRxFlow.created_flow_id = data["flow"]["flow_id"]
        print(f"✓ Express Rx flow created: {data['flow']['flow_id']}")
    
    def test_start_express_flow_requires_phone(self):
        """POST /api/express-rx/start requires phone"""
        payload = {"symptoms": "headache"}
        response = requests.post(
            f"{BASE_URL}/api/express-rx/start",
            json=payload
        )
        assert response.status_code == 400
        print("✓ Start endpoint validates phone requirement")
    
    def test_get_active_flows(self):
        """GET /api/express-rx/active/{phone} returns active flows"""
        response = requests.get(f"{BASE_URL}/api/express-rx/active/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "active_flows" in data
        assert "count" in data
        assert isinstance(data["active_flows"], list)
        print(f"✓ Found {data['count']} active Express Rx flows")
    
    def test_track_express_flow(self):
        """GET /api/express-rx/track/{flow_id} returns flow status"""
        # First create a flow
        payload = {"phone": TEST_PHONE, "symptoms": "TEST_tracking test"}
        create_res = requests.post(f"{BASE_URL}/api/express-rx/start", json=payload)
        flow_id = create_res.json()["flow"]["flow_id"]
        
        # Track it
        response = requests.get(f"{BASE_URL}/api/express-rx/track/{flow_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "flow" in data
        assert "progress_percent" in data
        assert "current_step" in data
        assert "total_steps" in data
        assert "remaining_minutes" in data
        print(f"✓ Flow tracking: step {data['current_step']}/{data['total_steps']}, {data['remaining_minutes']} min remaining")
    
    def test_track_nonexistent_flow(self):
        """GET /api/express-rx/track/{flow_id} returns 404 for invalid flow"""
        response = requests.get(f"{BASE_URL}/api/express-rx/track/INVALID-FLOW-ID")
        assert response.status_code == 404
        print("✓ Invalid flow returns 404")


class TestPharmacySearch:
    """Pharmacy Search API - Verify existing functionality still works"""
    
    def test_search_augmentin(self):
        """GET /api/pharmacy/v3/search?q=Augmentin returns results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/search?q=Augmentin&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "medicines" in data
        assert len(data["medicines"]) > 0, "Expected Augmentin search results"
        print(f"✓ Augmentin search returned {len(data['medicines'])} results")
    
    def test_pharmacy_categories(self):
        """GET /api/pharmacy/v3/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "categories" in data
        assert len(data["categories"]) > 0
        print(f"✓ Pharmacy has {len(data['categories'])} categories, {data.get('total', 0)} total medicines")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health endpoint OK")


# Cleanup test data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after tests"""
    yield
    # Note: Express Rx flows with TEST_ prefix symptoms could be cleaned up here
    print("\n✓ Test session complete")
