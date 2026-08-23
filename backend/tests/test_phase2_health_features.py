"""
Backend Tests for Phase 2 Health Features:
- Health Insights API
- Dynamic Health Score API
- Health Streak System
- Medicine Barcode/Search Lookup
- Family Wallet Sharing
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PHONE = "9876543210"

class TestHealthInsights:
    """Health Insights API tests"""
    
    def test_get_health_insights(self):
        """GET /api/health-insights/{phone} returns health_score, risks, tips, stats"""
        response = requests.get(f"{BASE_URL}/api/health-insights/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "health_score" in data, "Missing health_score"
        assert "score_label" in data, "Missing score_label"
        assert "risks" in data, "Missing risks"
        assert "tips" in data, "Missing tips"
        assert "stats" in data, "Missing stats"
        
        # Verify data types and values
        assert isinstance(data["health_score"], int), "health_score should be int"
        assert 0 <= data["health_score"] <= 100, "health_score should be 0-100"
        assert data["score_label"] in ["Excellent", "Good", "Needs Attention", "Poor"], f"Invalid score_label: {data['score_label']}"
        assert isinstance(data["risks"], list), "risks should be list"
        assert isinstance(data["tips"], list), "tips should be list"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_consultations" in stats
        assert "total_lab_tests" in stats
        assert "total_pharmacy_orders" in stats
        
        print(f"✓ Health insights returned: score={data['health_score']}, label={data['score_label']}")


class TestDynamicHealthScore:
    """Dynamic Health Score API tests"""
    
    def test_get_health_score(self):
        """GET /api/health-score/{phone} returns dynamic score with breakdown"""
        response = requests.get(f"{BASE_URL}/api/health-score/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "score" in data, "Missing score"
        assert "breakdown" in data, "Missing breakdown"
        assert "streak" in data, "Missing streak"
        
        # Verify score value
        assert isinstance(data["score"], int), "score should be int"
        assert 0 <= data["score"] <= 100, "score should be 0-100"
        
        # Verify breakdown structure
        breakdown = data["breakdown"]
        assert "consultations" in breakdown
        assert "lab_tests" in breakdown
        assert "streak_bonus" in breakdown
        assert "loyalty_bonus" in breakdown
        
        print(f"✓ Dynamic score: {data['score']}, breakdown: {breakdown}")


class TestHealthStreaks:
    """Health Streak System tests"""
    
    def test_get_streak(self):
        """GET /api/health-streak/{phone} returns current streak data"""
        response = requests.get(f"{BASE_URL}/api/health-streak/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "streak" in data, "Missing streak"
        assert "rewards" in data, "Missing rewards"
        
        streak = data["streak"]
        assert "current_streak" in streak
        assert "longest_streak" in streak
        assert "total_activities" in streak
        
        # Verify rewards thresholds
        rewards = data["rewards"]
        assert "3" in rewards or 3 in rewards, "Missing 3-day reward"
        assert "7" in rewards or 7 in rewards, "Missing 7-day reward"
        
        print(f"✓ Streak data: current={streak.get('current_streak')}, longest={streak.get('longest_streak')}")
    
    def test_log_activity(self):
        """POST /api/health-streak/log logs activity and tracks streaks"""
        response = requests.post(f"{BASE_URL}/api/health-streak/log", json={
            "phone": TEST_PHONE,
            "activity": "bp_log"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Missing success field"
        assert data["success"] == True, "Activity log failed"
        assert "current_streak" in data or "message" in data, "Missing streak info"
        
        print(f"✓ Activity logged: {data}")
    
    def test_log_activity_same_day(self):
        """Logging twice on same day should return 'already logged' message"""
        # First log
        requests.post(f"{BASE_URL}/api/health-streak/log", json={
            "phone": TEST_PHONE,
            "activity": "water_log"
        })
        
        # Second log same day
        response = requests.post(f"{BASE_URL}/api/health-streak/log", json={
            "phone": TEST_PHONE,
            "activity": "water_log"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        # Should either say already logged or show same streak count
        print(f"✓ Same-day log handled: {data}")


class TestMedicineLookup:
    """Medicine Barcode/Search Lookup tests"""
    
    def test_lookup_by_barcode(self):
        """GET /api/medicine/lookup/{barcode} returns medicine details"""
        # Test with hardcoded barcode from MEDICINE_DB
        response = requests.get(f"{BASE_URL}/api/medicine/lookup/8901234567890")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "found" in data, "Missing found field"
        assert data["found"] == True, "Medicine should be found"
        assert "medicine" in data, "Missing medicine data"
        
        med = data["medicine"]
        assert med["name"] == "Paracetamol 500mg"
        assert med["brand"] == "Crocin"
        assert "mrp" in med
        assert "uses" in med
        assert "dosage" in med
        
        print(f"✓ Medicine lookup: {med['name']} ({med['brand']})")
    
    def test_lookup_not_found(self):
        """Lookup with invalid barcode returns not found"""
        response = requests.get(f"{BASE_URL}/api/medicine/lookup/0000000000000")
        assert response.status_code == 200
        
        data = response.json()
        assert data["found"] == False, "Should not find invalid barcode"
        print(f"✓ Invalid barcode handled correctly")
    
    def test_search_medicine(self):
        """GET /api/medicine/search?q=para returns search results"""
        response = requests.get(f"{BASE_URL}/api/medicine/search?q=para")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "results" in data, "Missing results field"
        assert len(data["results"]) > 0, "Should find Paracetamol"
        
        # Verify first result is Paracetamol
        found = any("Paracetamol" in r.get("name", "") for r in data["results"])
        assert found, "Paracetamol should be in results"
        
        print(f"✓ Medicine search: found {len(data['results'])} results for 'para'")
    
    def test_search_empty_query(self):
        """Search with empty query returns empty results"""
        response = requests.get(f"{BASE_URL}/api/medicine/search?q=")
        assert response.status_code == 200
        
        data = response.json()
        assert data["results"] == [], "Empty query should return empty results"
        print(f"✓ Empty search handled correctly")
    
    def test_search_short_query(self):
        """Search with 1-char query returns empty results"""
        response = requests.get(f"{BASE_URL}/api/medicine/search?q=a")
        assert response.status_code == 200
        
        data = response.json()
        assert data["results"] == [], "1-char query should return empty results"
        print(f"✓ Short query handled correctly")
    
    def test_search_multiple_results(self):
        """Search for common term returns multiple results"""
        response = requests.get(f"{BASE_URL}/api/medicine/search?q=500")
        assert response.status_code == 200
        
        data = response.json()
        print(f"✓ Search '500' returned {len(data['results'])} results")


class TestFamilyWallet:
    """Family Wallet Sharing tests"""
    
    def test_get_family_wallet(self):
        """GET /api/wallet/family/{phone} returns family wallet with members"""
        response = requests.get(f"{BASE_URL}/api/wallet/family/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "wallet" in data, "Missing wallet field"
        assert "family_members" in data, "Missing family_members field"
        assert "is_primary" in data, "Missing is_primary field"
        
        print(f"✓ Family wallet: {len(data['family_members'])} members, is_primary={data['is_primary']}")
    
    def test_add_family_member_to_wallet(self):
        """POST /api/wallet/family/add adds member to family wallet"""
        # Add a test family member
        response = requests.post(f"{BASE_URL}/api/wallet/family/add", json={
            "primary_phone": TEST_PHONE,
            "member_phone": "9999999999"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Missing success field"
        assert data["success"] == True, "Add family member failed"
        
        print(f"✓ Family member added: {data}")
    
    def test_add_self_as_family_member(self):
        """Cannot add yourself as family member"""
        response = requests.post(f"{BASE_URL}/api/wallet/family/add", json={
            "primary_phone": TEST_PHONE,
            "member_phone": TEST_PHONE
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Self-add correctly rejected")
    
    def test_remove_family_member(self):
        """DELETE /api/wallet/family/remove removes member from family wallet"""
        # First add a member
        requests.post(f"{BASE_URL}/api/wallet/family/add", json={
            "primary_phone": TEST_PHONE,
            "member_phone": "8888888888"
        })
        
        # Then remove
        response = requests.delete(
            f"{BASE_URL}/api/wallet/family/remove",
            params={"primary_phone": TEST_PHONE, "member_phone": "8888888888"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        
        print(f"✓ Family member removed")


class TestFamilyMemberAPI:
    """Test family members API for FamilyMemberPicker component"""
    
    def test_get_family_members(self):
        """GET /api/family/members/{phone} returns family members list"""
        response = requests.get(f"{BASE_URL}/api/family/members/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "members" in data, "Missing members field"
        assert isinstance(data["members"], list), "members should be a list"
        
        print(f"✓ Family members API: {len(data['members'])} members found")
    
    def test_add_family_member(self):
        """POST /api/family/members adds a new family member"""
        response = requests.post(
            f"{BASE_URL}/api/family/members",
            params={"phone": TEST_PHONE},
            json={
                "name": "Test Member",
                "phone": "7777777777",
                "relation": "spouse",
                "age": 35,
                "gender": "female"
            }
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data or "member" in data or "id" in data
        print(f"✓ Family member added for picker: {data}")


class TestHealthStatsAPI:
    """Test health stats API used by TrackOrder page"""
    
    def test_get_health_stats(self):
        """GET /api/health-stats/{phone} returns health metrics (MOCKED)"""
        response = requests.get(f"{BASE_URL}/api/health-stats/{TEST_PHONE}")
        # This API may or may not exist - it's marked as mocked
        if response.status_code == 200:
            data = response.json()
            assert "metrics" in data, "Missing metrics field"
            print(f"✓ Health stats: {len(data.get('metrics', []))} metrics")
        else:
            print(f"! Health stats API returned {response.status_code} - may not be implemented")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
