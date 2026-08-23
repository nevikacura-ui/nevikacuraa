"""
Test suite for Features 3, 4, 6, 7, 8:
- Feature 3: Video Consultations (Daily.co)
- Feature 4: Insurance Platform
- Feature 6: Gamification (Health Streaks)
- Feature 7: Smart Wearables (Google Fit)
- Feature 8: Mental Health Support
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PHONE = "9876543210"

class TestVideoConsultations:
    """Feature 3: Video Consultations with Daily.co"""
    
    def test_create_video_room(self):
        """POST /api/video-consult/create-room creates a Daily.co room"""
        response = requests.post(f"{BASE_URL}/api/video-consult/create-room", json={
            "patient_phone": TEST_PHONE,
            "doctor_name": "Dr. Test"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "room_url" in data, "Response should contain room_url"
        assert "room_name" in data, "Response should contain room_name"
        assert "consultation_id" in data, "Response should contain consultation_id"
        assert "expires_at" in data, "Response should contain expires_at"
        assert "daily.co" in data["room_url"], "Room URL should be from Daily.co"
        print(f"Video room created: {data['room_name']}")
    
    def test_get_consultations_history(self):
        """GET /api/video-consult/consultations/{phone} returns consultation history"""
        response = requests.get(f"{BASE_URL}/api/video-consult/consultations/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "consultations" in data, "Response should contain consultations array"
        assert isinstance(data["consultations"], list), "Consultations should be a list"
        print(f"Found {len(data['consultations'])} consultations for {TEST_PHONE}")
    
    def test_get_active_rooms(self):
        """GET /api/video-consult/active returns active video rooms"""
        response = requests.get(f"{BASE_URL}/api/video-consult/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "active_rooms" in data, "Response should contain active_rooms"
        assert "total" in data, "Response should contain total count"
        print(f"Active rooms: {data['total']}")


class TestInsurancePlatform:
    """Feature 4: Insurance Platform for Indian market"""
    
    def test_get_insurance_providers(self):
        """GET /api/insurance/providers returns 9 Indian insurance providers"""
        response = requests.get(f"{BASE_URL}/api/insurance/providers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "providers" in data, "Response should contain providers"
        assert len(data["providers"]) == 9, f"Expected 9 providers, got {len(data['providers'])}"
        
        # Verify Indian providers
        provider_names = [p["name"] for p in data["providers"]]
        assert any("Star Health" in name for name in provider_names), "Should include Star Health"
        assert any("HDFC" in name for name in provider_names), "Should include HDFC Ergo"
        assert any("ICICI" in name for name in provider_names), "Should include ICICI Lombard"
        assert any("LIC" in name for name in provider_names), "Should include LIC"
        print(f"Insurance providers: {provider_names}")
    
    def test_create_policy(self):
        """POST /api/insurance/policy creates a policy"""
        policy_number = f"TEST-POL-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/insurance/policy", json={
            "phone": TEST_PHONE,
            "provider": "Star Health Insurance",
            "policy_number": policy_number,
            "policy_type": "health",
            "sum_insured": 500000,
            "premium": 12000
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "policy" in data, "Response should contain policy"
        assert data["policy"]["policy_number"] == policy_number
        assert data["policy"]["sum_insured"] == 500000
        print(f"Policy created: {data['policy']['policy_id']}")
        return data["policy"]["policy_id"]
    
    def test_get_policies_by_phone(self):
        """GET /api/insurance/policies/{phone} returns user's policies"""
        response = requests.get(f"{BASE_URL}/api/insurance/policies/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "policies" in data, "Response should contain policies"
        assert "total" in data, "Response should contain total count"
        print(f"Found {data['total']} policies for {TEST_PHONE}")
    
    def test_get_insurance_summary(self):
        """GET /api/insurance/summary/{phone} returns insurance summary"""
        response = requests.get(f"{BASE_URL}/api/insurance/summary/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "active_policies" in data, "Response should contain active_policies"
        assert "total_coverage" in data, "Response should contain total_coverage"
        assert "pending_claims" in data, "Response should contain pending_claims"
        print(f"Insurance summary: {data['active_policies']} policies, Rs.{data['total_coverage']} coverage")
    
    def test_file_claim(self):
        """POST /api/insurance/claim files a claim"""
        # First get a policy to file claim against
        policies_resp = requests.get(f"{BASE_URL}/api/insurance/policies/{TEST_PHONE}")
        policies = policies_resp.json().get("policies", [])
        
        if not policies:
            # Create a policy first
            policy_number = f"TEST-POL-{uuid.uuid4().hex[:6].upper()}"
            requests.post(f"{BASE_URL}/api/insurance/policy", json={
                "phone": TEST_PHONE,
                "provider": "Star Health Insurance",
                "policy_number": policy_number,
                "policy_type": "health",
                "sum_insured": 500000,
                "premium": 12000
            })
            policies_resp = requests.get(f"{BASE_URL}/api/insurance/policies/{TEST_PHONE}")
            policies = policies_resp.json().get("policies", [])
        
        if policies:
            policy_id = policies[0]["policy_id"]
            response = requests.post(f"{BASE_URL}/api/insurance/claim", json={
                "phone": TEST_PHONE,
                "policy_id": policy_id,
                "claim_type": "hospitalization",
                "amount": 25000,
                "hospital_name": "Apollo Hospital",
                "diagnosis": "Test diagnosis"
            })
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert "claim" in data, "Response should contain claim"
            assert data["claim"]["status"] == "submitted"
            print(f"Claim filed: {data['claim']['claim_id']}")
        else:
            pytest.skip("No policies available to file claim against")
    
    def test_get_claims_by_phone(self):
        """GET /api/insurance/claims/{phone} returns user's claims"""
        response = requests.get(f"{BASE_URL}/api/insurance/claims/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "claims" in data, "Response should contain claims"
        print(f"Found {len(data['claims'])} claims for {TEST_PHONE}")


class TestGamification:
    """Feature 6: Gamification with Health Streaks"""
    
    def test_check_in_activity(self):
        """POST /api/gamification/check-in records activity and returns points/streak"""
        # Use a unique activity to avoid 'already checked in' for steps
        activities = ["water", "sleep", "exercise", "meditation", "medicine"]
        
        for activity in activities:
            response = requests.post(f"{BASE_URL}/api/gamification/check-in", json={
                "phone": TEST_PHONE,
                "activity": activity
            })
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            
            if data.get("already_done"):
                print(f"Activity '{activity}' already checked in today")
                continue
            
            assert "points_earned" in data, "Response should contain points_earned"
            assert "current_streak" in data, "Response should contain current_streak"
            assert "longest_streak" in data, "Response should contain longest_streak"
            print(f"Check-in '{activity}': +{data['points_earned']} points, streak: {data['current_streak']}")
            break
    
    def test_get_gamification_profile(self):
        """GET /api/gamification/profile/{phone} returns streak, badges, today's activities"""
        response = requests.get(f"{BASE_URL}/api/gamification/profile/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "current_streak" in data, "Response should contain current_streak"
        assert "longest_streak" in data, "Response should contain longest_streak"
        assert "badges" in data, "Response should contain badges"
        assert "today_activities" in data, "Response should contain today_activities"
        assert "activities" in data, "Response should contain activities definitions"
        assert "total_points" in data, "Response should contain total_points"
        
        # Verify activities structure
        assert "steps" in data["activities"], "Activities should include steps"
        assert "water" in data["activities"], "Activities should include water"
        
        print(f"Profile: streak={data['current_streak']}, points={data['total_points']}, badges={data['earned_badge_count']}")
    
    def test_get_leaderboard(self):
        """GET /api/gamification/leaderboard returns top users"""
        response = requests.get(f"{BASE_URL}/api/gamification/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "leaderboard" in data, "Response should contain leaderboard"
        assert isinstance(data["leaderboard"], list), "Leaderboard should be a list"
        
        if data["leaderboard"]:
            leader = data["leaderboard"][0]
            assert "name" in leader, "Leader should have name"
            assert "longest_streak" in leader, "Leader should have longest_streak"
        
        print(f"Leaderboard has {len(data['leaderboard'])} entries")
    
    def test_invalid_activity_check_in(self):
        """POST /api/gamification/check-in with invalid activity returns 400"""
        response = requests.post(f"{BASE_URL}/api/gamification/check-in", json={
            "phone": TEST_PHONE,
            "activity": "invalid_activity"
        })
        assert response.status_code == 400, f"Expected 400 for invalid activity, got {response.status_code}"


class TestWearables:
    """Feature 7: Smart Wearables (Google Fit integration)"""
    
    def test_sync_manual_health_data(self):
        """POST /api/wearables/sync records manual health data"""
        response = requests.post(f"{BASE_URL}/api/wearables/sync", json={
            "phone": TEST_PHONE,
            "source": "manual",
            "data_type": "steps",
            "value": 8500,
            "unit": "steps"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "data_type" in data, "Response should contain data_type"
        assert "value" in data, "Response should contain value"
        assert "goal" in data, "Response should contain goal"
        assert data["data_type"] == "steps"
        assert data["value"] == 8500
        print(f"Synced: {data['value']} {data['unit']}, goal: {data['goal']}")
    
    def test_sync_multiple_data_types(self):
        """POST /api/wearables/sync works for all 6 data types"""
        data_types = [
            {"data_type": "heart_rate", "value": 72, "unit": "bpm"},
            {"data_type": "sleep", "value": 7.5, "unit": "hours"},
            {"data_type": "calories", "value": 1800, "unit": "kcal"},
            {"data_type": "distance", "value": 4.2, "unit": "km"},
            {"data_type": "weight", "value": 68.5, "unit": "kg"},
        ]
        
        for dt in data_types:
            response = requests.post(f"{BASE_URL}/api/wearables/sync", json={
                "phone": TEST_PHONE,
                "source": "manual",
                **dt
            })
            assert response.status_code == 200, f"Failed for {dt['data_type']}: {response.text}"
            print(f"Synced {dt['data_type']}: {dt['value']} {dt['unit']}")
    
    def test_get_wearable_summary(self):
        """GET /api/wearables/summary/{phone} returns today's summary"""
        response = requests.get(f"{BASE_URL}/api/wearables/summary/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "today" in data, "Response should contain today's data"
        assert "data_types" in data, "Response should contain data_types definitions"
        assert "connected" in data, "Response should contain connection status"
        
        # Verify data types
        assert "steps" in data["data_types"], "Should have steps data type"
        assert "heart_rate" in data["data_types"], "Should have heart_rate data type"
        assert len(data["data_types"]) == 6, f"Expected 6 data types, got {len(data['data_types'])}"
        
        print(f"Summary: {len(data['today'])} metrics today, connected: {data['connected']}")
    
    def test_get_wearable_data_history(self):
        """GET /api/wearables/data/{phone} returns historical data"""
        response = requests.get(f"{BASE_URL}/api/wearables/data/{TEST_PHONE}?days=7")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "data" in data, "Response should contain data"
        assert "total_entries" in data, "Response should contain total_entries"
        assert "days" in data, "Response should contain days"
        
        print(f"History: {data['total_entries']} entries over {data['days']} days")
    
    def test_check_connection_status(self):
        """GET /api/wearables/connection/{phone} returns connection status"""
        response = requests.get(f"{BASE_URL}/api/wearables/connection/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "connected" in data, "Response should contain connected status"
        print(f"Connection status: {data['connected']}")
    
    def test_invalid_data_type_sync(self):
        """POST /api/wearables/sync with invalid data_type returns 400"""
        response = requests.post(f"{BASE_URL}/api/wearables/sync", json={
            "phone": TEST_PHONE,
            "source": "manual",
            "data_type": "invalid_type",
            "value": 100,
            "unit": "units"
        })
        assert response.status_code == 400, f"Expected 400 for invalid data_type, got {response.status_code}"


class TestMentalHealth:
    """Feature 8: Mental Health Support"""
    
    def test_log_mood(self):
        """POST /api/mental-health/mood logs mood (1-5 scale)"""
        response = requests.post(f"{BASE_URL}/api/mental-health/mood", json={
            "phone": TEST_PHONE,
            "mood": 4,
            "note": "Feeling good today"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "mood" in data, "Response should contain mood"
        assert "label" in data, "Response should contain label"
        assert data["mood"] == 4
        assert data["label"] == "Good"
        print(f"Mood logged: {data['mood']} ({data['label']})")
    
    def test_log_mood_all_values(self):
        """POST /api/mental-health/mood accepts all valid mood values (1-5)"""
        mood_labels = {1: "Very Low", 2: "Low", 3: "Okay", 4: "Good", 5: "Great"}
        
        for mood_value, expected_label in mood_labels.items():
            response = requests.post(f"{BASE_URL}/api/mental-health/mood", json={
                "phone": f"TEST_{mood_value}_{TEST_PHONE}",
                "mood": mood_value
            })
            assert response.status_code == 200, f"Failed for mood {mood_value}: {response.text}"
            data = response.json()
            assert data["label"] == expected_label, f"Expected '{expected_label}' for mood {mood_value}"
        print("All mood values (1-5) work correctly")
    
    def test_invalid_mood_value(self):
        """POST /api/mental-health/mood with invalid mood returns 400"""
        response = requests.post(f"{BASE_URL}/api/mental-health/mood", json={
            "phone": TEST_PHONE,
            "mood": 6  # Invalid - should be 1-5
        })
        assert response.status_code == 400, f"Expected 400 for invalid mood, got {response.status_code}"
    
    def test_create_journal_entry(self):
        """POST /api/mental-health/journal creates journal entry"""
        response = requests.post(f"{BASE_URL}/api/mental-health/journal", json={
            "phone": TEST_PHONE,
            "title": "Test Journal Entry",
            "content": "This is a test journal entry for mental health tracking.",
            "mood": 4
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "entry" in data, "Response should contain entry"
        assert data["entry"]["title"] == "Test Journal Entry"
        assert "entry_id" in data["entry"], "Entry should have entry_id"
        print(f"Journal entry created: {data['entry']['entry_id']}")
        return data["entry"]["entry_id"]
    
    def test_get_journal_entries(self):
        """GET /api/mental-health/journal/{phone} returns journal entries"""
        response = requests.get(f"{BASE_URL}/api/mental-health/journal/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "entries" in data, "Response should contain entries"
        assert isinstance(data["entries"], list), "Entries should be a list"
        print(f"Found {len(data['entries'])} journal entries")
    
    def test_get_breathing_exercises(self):
        """GET /api/mental-health/breathing-exercises returns 5 exercises"""
        response = requests.get(f"{BASE_URL}/api/mental-health/breathing-exercises")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "exercises" in data, "Response should contain exercises"
        assert len(data["exercises"]) == 5, f"Expected 5 exercises, got {len(data['exercises'])}"
        
        # Verify exercise structure
        exercise = data["exercises"][0]
        assert "id" in exercise, "Exercise should have id"
        assert "name" in exercise, "Exercise should have name"
        assert "inhale" in exercise, "Exercise should have inhale duration"
        assert "exhale" in exercise, "Exercise should have exhale duration"
        assert "cycles" in exercise, "Exercise should have cycles"
        assert "benefit" in exercise, "Exercise should have benefit"
        
        exercise_names = [e["name"] for e in data["exercises"]]
        print(f"Breathing exercises: {exercise_names}")
    
    def test_get_mental_health_resources(self):
        """GET /api/mental-health/resources returns crisis helplines and self-help resources"""
        response = requests.get(f"{BASE_URL}/api/mental-health/resources")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "resources" in data, "Response should contain resources"
        
        # Verify categories
        categories = [r["category"] for r in data["resources"]]
        assert "Crisis" in categories, "Should have Crisis category"
        assert "Self-Help" in categories, "Should have Self-Help category"
        
        # Verify crisis helplines
        crisis = next(r for r in data["resources"] if r["category"] == "Crisis")
        assert len(crisis["items"]) >= 3, "Should have at least 3 crisis helplines"
        
        # Verify Indian helplines
        helpline_names = [item["name"] for item in crisis["items"]]
        assert any("Vandrevala" in name for name in helpline_names), "Should include Vandrevala Foundation"
        assert any("iCall" in name for name in helpline_names), "Should include iCall"
        assert any("NIMHANS" in name for name in helpline_names), "Should include NIMHANS"
        
        print(f"Resources: {len(data['resources'])} categories with crisis helplines")
    
    def test_get_mood_history(self):
        """GET /api/mental-health/mood/history/{phone} returns mood history"""
        response = requests.get(f"{BASE_URL}/api/mental-health/mood/history/{TEST_PHONE}?days=14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "entries" in data, "Response should contain entries"
        assert "average_mood" in data, "Response should contain average_mood"
        assert "mood_labels" in data, "Response should contain mood_labels"
        
        print(f"Mood history: {len(data['entries'])} entries, avg: {data['average_mood']}")
    
    def test_get_mental_health_summary(self):
        """GET /api/mental-health/summary/{phone} returns mental health summary"""
        response = requests.get(f"{BASE_URL}/api/mental-health/summary/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "today_mood" in data or data.get("today_mood") is None, "Response should contain today_mood"
        assert "week_average" in data, "Response should contain week_average"
        assert "journal_count" in data, "Response should contain journal_count"
        assert "exercises_available" in data, "Response should contain exercises_available"
        assert "helplines_available" in data, "Response should contain helplines_available"
        
        print(f"Mental health summary: week_avg={data['week_average']}, journals={data['journal_count']}")


class TestHomePageRegression:
    """Regression test for home page"""
    
    def test_home_page_loads(self):
        """GET / returns 200"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, f"Home page failed: {response.status_code}"
        print("Home page loads successfully")
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health endpoint failed: {response.status_code}"
        print("Health endpoint OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
