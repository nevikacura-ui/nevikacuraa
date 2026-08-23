"""
Test Suite for Iteration 312 - Emergency Health Card Enhanced Features
- Emergency Card comprehensive form with new fields (gender, dob, implant_devices, pregnancy_status)
- Public scan endpoint with critical/full mode toggle
- Medicine Interactions, Express Rx, Health Timeline, Pharmacy V3 browse
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmergencyCardEnhanced:
    """Emergency Health Card - Enhanced form with comprehensive fields"""
    
    def test_get_emergency_card_returns_card_id(self):
        """GET /api/emergency-card/{phone} should return card with card_id"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/8108888330")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "card" in data
        card = data["card"]
        assert "card_id" in card, "card_id field missing"
        assert card["card_id"].startswith("EHC-"), f"card_id should start with EHC-, got {card['card_id']}"
        print(f"✓ Emergency card has card_id: {card['card_id']}")
    
    def test_emergency_card_has_comprehensive_fields(self):
        """Card should have key comprehensive fields"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/8108888330")
        assert response.status_code == 200
        card = response.json()["card"]
        
        # Check key fields exist (some may be named differently)
        key_fields = [
            "card_id", "phone", "blood_group", "emergency_contact", 
            "current_medications", "allergies", "treating_doctor",
            "chronic_conditions", "implant_devices", "pregnancy_status", 
            "special_instructions"
        ]
        missing = [f for f in key_fields if f not in card]
        assert len(missing) == 0, f"Missing fields: {missing}"
        print(f"✓ All {len(key_fields)} key comprehensive fields present")
    
    def test_update_emergency_card_with_new_fields(self):
        """PUT /api/emergency-card/{phone} should update new fields"""
        update_data = {
            "full_name": "Test Patient 312",
            "gender": "Male",
            "dob": "15/08/1990",
            "blood_group": "O+",
            "implant_devices": ["Pacemaker", "Stent"],
            "pregnancy_status": "Not Applicable",
            "chronic_conditions": ["Diabetes", "Hypertension"],
            "special_instructions": "Do not administer blood products",
            "emergency_contact": {"name": "Emergency Contact", "relation": "Spouse", "phone": "+919876543210"},
            "secondary_contact": {"name": "Secondary Contact", "relation": "Parent", "phone": "+919876543211"},
            "treating_doctor": {"name": "Dr. Vikas Jha", "clinic": "Nevika Cura", "phone": "+918108888330"},
            "allergies": {"drug": ["Penicillin"], "food": ["Peanuts"], "other": ["Latex"]}
        }
        response = requests.put(f"{BASE_URL}/api/emergency-card/8108888330", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        card = data["card"]
        
        # Verify updates
        assert card["gender"] == "Male"
        assert card["dob"] == "15/08/1990"
        assert card["blood_group"] == "O+"
        assert "Pacemaker" in card.get("implant_devices", [])
        assert card["pregnancy_status"] == "Not Applicable"
        assert "Diabetes" in card.get("chronic_conditions", [])
        assert card["special_instructions"] == "Do not administer blood products"
        print("✓ Emergency card updated with all new fields")


class TestEmergencyCardScan:
    """Public scan endpoint - /api/emergency-card/scan/{card_id}"""
    
    @pytest.fixture(autouse=True)
    def get_card_id(self):
        """Get card_id for scan tests"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/8108888330")
        if response.status_code == 200:
            self.card_id = response.json()["card"]["card_id"]
        else:
            pytest.skip("Could not get card_id")
    
    def test_scan_critical_mode_returns_critical_data(self):
        """GET /api/emergency-card/scan/{card_id}?mode=critical returns critical info only"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/scan/{self.card_id}?mode=critical")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("mode") == "critical"
        
        card = data["card"]
        # Critical fields should be present
        critical_fields = ["card_id", "full_name", "age", "gender", "blood_group", 
                          "allergies", "current_medications", "chronic_conditions",
                          "implant_devices", "emergency_contact", "treating_doctor", "special_instructions"]
        for field in critical_fields:
            assert field in card, f"Critical field missing: {field}"
        print(f"✓ Scan critical mode returns {len(critical_fields)} critical fields")
    
    def test_scan_full_mode_returns_all_data(self):
        """GET /api/emergency-card/scan/{card_id}?mode=full returns full profile"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/scan/{self.card_id}?mode=full")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("mode") == "full"
        
        card = data["card"]
        # Full mode should have more fields
        assert "phone" in card or "dob" in card or "insurance_id" in card
        print("✓ Scan full mode returns complete profile")
    
    def test_scan_default_mode_is_critical(self):
        """GET /api/emergency-card/scan/{card_id} defaults to critical mode"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/scan/{self.card_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("mode") == "critical"
        print("✓ Scan defaults to critical mode")
    
    def test_scan_invalid_card_id_returns_404(self):
        """GET /api/emergency-card/scan/INVALID returns 404"""
        response = requests.get(f"{BASE_URL}/api/emergency-card/scan/INVALID-CARD-ID")
        assert response.status_code == 404
        print("✓ Invalid card_id returns 404")


class TestMedicineInteractions:
    """Medicine Interaction Guardian - POST /api/medicine-interactions/check"""
    
    def test_warfarin_aspirin_interaction(self):
        """Warfarin + Aspirin should detect high severity interaction"""
        # API expects cart_medicines and new_medicine format
        response = requests.post(f"{BASE_URL}/api/medicine-interactions/check", json={
            "cart_medicines": [{"name": "Warfarin", "generic_name": "warfarin"}],
            "new_medicine": {"name": "Aspirin", "generic_name": "aspirin"}
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        warnings = data.get("warnings", [])
        assert len(warnings) > 0, "Should detect warfarin+aspirin interaction"
        
        # Check for high severity
        high_severity = any(w.get("severity") == "high" for w in warnings)
        assert high_severity, "Warfarin+aspirin should be high severity"
        print("✓ Warfarin+Aspirin interaction detected as high severity")


class TestExpressRx:
    """Express Rx Flow - GET /api/express-rx/active/{phone}"""
    
    def test_get_active_express_rx_flows(self):
        """GET /api/express-rx/active/{phone} returns active flows"""
        response = requests.get(f"{BASE_URL}/api/express-rx/active/8108888330")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # API returns active_flows not flows
        assert "active_flows" in data
        print(f"✓ Express Rx returns {len(data['active_flows'])} active flows")


class TestHealthTimeline:
    """Health Timeline - GET /api/health-timeline/{phone}"""
    
    def test_get_health_timeline(self):
        """GET /api/health-timeline/{phone} returns timeline data"""
        response = requests.get(f"{BASE_URL}/api/health-timeline/8108888330")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "stats" in data
        assert "events" in data
        print(f"✓ Health Timeline returns stats and {len(data['events'])} events")


class TestPharmacyV3Browse:
    """Pharmacy V3 Browse - GET /api/pharmacy/v3/browse"""
    
    def test_pharmacy_v3_browse_returns_data(self):
        """GET /api/pharmacy/v3/browse returns browse data"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/v3/browse")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # Should have categories or featured items
        assert "categories" in data or "featured" in data or "sections" in data
        print("✓ Pharmacy V3 browse returns data")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health endpoint returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
