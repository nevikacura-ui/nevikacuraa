"""
ALYNE USA Features - Iteration 31 Testing
Tests for:
1. Voice Health Buddy (TTS endpoint)
2. Cultural Health Bridge (Medicine translator, Indian foods, School forms, Grandparent share)
3. Digital Health Twin (Profile, Risk assessments, Dashboard)
"""

import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nevika-patient.preview.emergentagent.com')

# Test credentials from main agent
TEST_CHILD_ID = "child_6e108638666d"
TEST_USER_ID = "test_user_123"


class TestVoiceHealthBuddy:
    """Voice Health Buddy - TTS endpoint tests"""
    
    def test_tts_endpoint_works(self):
        """Test TTS endpoint returns audio"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/kidszone/buddy/speak",
            params={"text": "Hello little friend, how are you today?", "voice": "shimmer"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "audio_base64" in data
        assert data.get("audio_format") == "mp3"
        assert len(data["audio_base64"]) > 100  # Should have substantial audio data
        print(f"TTS endpoint returned {len(data['audio_base64'])} bytes of audio")
    
    def test_tts_different_voices(self):
        """Test TTS with different voice options"""
        voices = ["shimmer", "fable"]
        for voice in voices:
            response = requests.post(
                f"{BASE_URL}/api/alyne/kidszone/buddy/speak",
                params={"text": "Testing voice", "voice": voice}
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            print(f"Voice '{voice}' works correctly")


class TestCulturalBridgeMedicines:
    """Cultural Bridge - Medicine Translator tests"""
    
    def test_get_all_medicines(self):
        """Test getting medicine translation database"""
        response = requests.get(f"{BASE_URL}/api/alyne/cultural-bridge/medicines")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "medicines" in data
        assert len(data["medicines"]) >= 10
        print(f"Found {len(data['medicines'])} medicines in database")
    
    def test_translate_crocin_to_tylenol(self):
        """Test Crocin -> Tylenol translation"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/cultural-bridge/medicines/translate",
            json={"medicine_name": "Crocin", "direction": "indian_to_us"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("matches", [])) > 0
        match = data["matches"][0]
        assert "Tylenol" in match.get("us_name", "")
        assert match.get("generic") == "Paracetamol / Acetaminophen"
        print(f"Crocin translates to: {match['us_name']}")
    
    def test_translate_brufen_to_advil(self):
        """Test Brufen -> Advil translation"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/cultural-bridge/medicines/translate",
            json={"medicine_name": "Brufen", "direction": "indian_to_us"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("matches", [])) > 0
        match = data["matches"][0]
        assert "Advil" in match.get("us_name", "") or "Motrin" in match.get("us_name", "")
        print(f"Brufen translates to: {match['us_name']}")
    
    def test_translate_us_to_indian(self):
        """Test US to Indian direction"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/cultural-bridge/medicines/translate",
            json={"medicine_name": "Zyrtec", "direction": "us_to_indian"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Zyrtec search result: {data}")


class TestCulturalBridgeFoods:
    """Cultural Bridge - Indian Foods Nutrition Guide tests"""
    
    def test_get_all_foods(self):
        """Test getting Indian foods with AAP nutrition info"""
        response = requests.get(f"{BASE_URL}/api/alyne/cultural-bridge/foods")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "foods" in data
        assert len(data["foods"]) >= 8
        assert "AAP" in data.get("source", "")
        print(f"Found {len(data['foods'])} Indian foods with nutrition info")
    
    def test_food_has_aap_info(self):
        """Test foods have AAP nutrition information"""
        response = requests.get(f"{BASE_URL}/api/alyne/cultural-bridge/foods")
        data = response.json()
        
        for food in data["foods"][:5]:
            assert "us_nutrition" in food
            nutrition = food["us_nutrition"]
            assert "aap_approved" in nutrition
            assert "introduction_age" in nutrition
            assert "benefits" in nutrition
            print(f"{food['name']}: AAP approved={nutrition['aap_approved']}, Age={nutrition['introduction_age']}")
    
    def test_search_food(self):
        """Test food search functionality"""
        response = requests.get(
            f"{BASE_URL}/api/alyne/cultural-bridge/foods/search",
            params={"query": "khichdi"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("results", [])) > 0
        print(f"Found {len(data['results'])} results for 'khichdi'")


class TestCulturalBridgeSchoolForms:
    """Cultural Bridge - School Forms Generator tests"""
    
    def test_get_form_templates(self):
        """Test getting school form templates"""
        response = requests.get(f"{BASE_URL}/api/alyne/cultural-bridge/school-forms")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "forms" in data
        
        expected_forms = ["immunization_record", "physical_exam", "emergency_contact", "medical_conditions"]
        for form_type in expected_forms:
            assert form_type in data["forms"]
            print(f"Form template '{form_type}' available")
    
    def test_generate_immunization_form(self):
        """Test generating immunization record form"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/cultural-bridge/school-forms/generate",
            json={
                "child_id": TEST_CHILD_ID,
                "child_name": "Emma",
                "form_types": ["immunization_record"],
                "child_data": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "forms" in data
        assert "immunization_record" in data["forms"]
        print(f"Generated immunization form: {data['forms']['immunization_record']['title']}")
    
    def test_generate_multiple_forms(self):
        """Test generating multiple forms at once"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/cultural-bridge/school-forms/generate",
            json={
                "child_id": TEST_CHILD_ID,
                "child_name": "Emma",
                "form_types": ["immunization_record", "physical_exam", "medical_conditions"],
                "child_data": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("forms", {})) >= 2
        print(f"Generated {len(data['forms'])} forms")


class TestCulturalBridgeGrandparentShare:
    """Cultural Bridge - Grandparent Health Share tests"""
    
    def test_share_with_grandparents_hindi(self):
        """Test generating health share message in Hindi"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/cultural-bridge/share-with-grandparents",
            json={
                "child_id": TEST_CHILD_ID,
                "recipient_name": "Nani",
                "recipient_language": "hindi",
                "include_records": ["growth", "vaccinations"],
                "sender_name": "Priya"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        assert len(data["message"]) > 50  # Should have substantial message
        assert data.get("language") == "hindi"
        print(f"Generated Hindi message ({len(data['message'])} chars)")
    
    def test_share_with_grandparents_tamil(self):
        """Test generating health share message in Tamil"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/cultural-bridge/share-with-grandparents",
            json={
                "child_id": TEST_CHILD_ID,
                "recipient_name": "Paati",
                "recipient_language": "tamil",
                "include_records": ["growth"],
                "sender_name": "Meera"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        print(f"Generated Tamil message ({len(data['message'])} chars)")


class TestDigitalHealthTwinProfile:
    """Digital Health Twin - Profile tests"""
    
    def test_get_profile(self):
        """Test getting Health Twin profile"""
        response = requests.get(f"{BASE_URL}/api/alyne/health-twin/profile/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        if data.get("profile"):
            profile = data["profile"]
            assert "family_history" in profile
            assert "environment" in profile
            assert "birth_info" in profile
            print(f"Profile found with family history: {profile.get('family_history', {})}")
        else:
            print("No profile found - will create one")
    
    def test_create_update_profile(self):
        """Test creating/updating Health Twin profile"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/health-twin/profile",
            json={
                "child_id": TEST_CHILD_ID,
                "family_history": {"asthma": True, "allergies": True, "eczema": False},
                "environment": {"urban_living": True, "pets": False, "smokers_home": False},
                "birth_info": {"premature": False, "birth_weight": 3.2}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Profile saved: is_new={data.get('is_new')}")


class TestDigitalHealthTwinAssessments:
    """Digital Health Twin - Risk Assessment tests"""
    
    def test_get_risk_factors(self):
        """Test getting risk factors database"""
        response = requests.get(f"{BASE_URL}/api/alyne/health-twin/risk-factors")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "risk_factors" in data
        assert "asthma" in data["risk_factors"]
        assert "allergies" in data["risk_factors"]
        assert "growth_issues" in data["risk_factors"]
        print(f"Risk factor categories: {data.get('categories', [])}")
    
    def test_run_asthma_assessment(self):
        """Test running asthma risk assessment"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/health-twin/assess-risk",
            json={
                "child_id": TEST_CHILD_ID,
                "assessment_type": "asthma"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "result" in data
        result = data["result"]
        assert "risk_level" in result
        assert "risk_score" in result
        assert result["risk_level"] in ["low", "moderate", "elevated", "high"]
        print(f"Asthma assessment: {result['risk_level']} (score: {result['risk_score']})")
    
    def test_run_allergies_assessment(self):
        """Test running allergies risk assessment"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/health-twin/assess-risk",
            json={
                "child_id": TEST_CHILD_ID,
                "assessment_type": "allergies"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "result" in data
        print(f"Allergies assessment: {data['result'].get('risk_level')}")
    
    def test_run_growth_assessment(self):
        """Test running growth risk assessment"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/health-twin/assess-risk",
            json={
                "child_id": TEST_CHILD_ID,
                "assessment_type": "growth"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Growth assessment: {data['result'].get('risk_level')}")
    
    def test_get_assessment_history(self):
        """Test getting assessment history"""
        response = requests.get(f"{BASE_URL}/api/alyne/health-twin/assessments/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "assessments" in data
        print(f"Found {len(data['assessments'])} assessments in history")


class TestDigitalHealthTwinDashboard:
    """Digital Health Twin - Dashboard tests"""
    
    def test_get_dashboard(self):
        """Test getting Health Twin dashboard"""
        response = requests.get(f"{BASE_URL}/api/alyne/health-twin/dashboard/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "health_score" in data
        assert "health_status" in data
        assert "has_profile" in data
        assert "latest_assessments" in data
        
        print(f"Dashboard: Score={data['health_score']}, Status={data['health_status']}")
        print(f"Has profile: {data['has_profile']}")
        print(f"Latest assessments: {list(data['latest_assessments'].keys())}")
    
    def test_dashboard_has_recommendations(self):
        """Test dashboard includes recommendations"""
        response = requests.get(f"{BASE_URL}/api/alyne/health-twin/dashboard/{TEST_CHILD_ID}")
        data = response.json()
        # Recommendations may be empty if profile is complete
        assert "recommendations" in data
        print(f"Recommendations count: {len(data.get('recommendations', []))}")


class TestPreviousKidsZoneFeatures:
    """Verify previous Kids Zone features still work"""
    
    def test_health_stars_activities(self):
        """Test Health Stars activities endpoint"""
        response = requests.get(f"{BASE_URL}/api/alyne/kidszone/activities")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("activities", [])) >= 10
        print(f"Health Stars: {len(data['activities'])} activities available")
    
    def test_mood_tracker_options(self):
        """Test Mood Tracker options endpoint"""
        response = requests.get(f"{BASE_URL}/api/alyne/kidszone/moods")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("moods", [])) >= 6
        print(f"Mood Tracker: {len(data['moods'])} mood options")
    
    def test_bedtime_stories_themes(self):
        """Test Bedtime Stories themes endpoint"""
        response = requests.get(f"{BASE_URL}/api/alyne/kidszone/stories/themes")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("themes", [])) >= 6
        print(f"Bedtime Stories: {len(data['themes'])} themes available")
    
    def test_kidszone_dashboard(self):
        """Test Kids Zone dashboard endpoint"""
        response = requests.get(f"{BASE_URL}/api/alyne/kidszone/dashboard/{TEST_CHILD_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "total_stars" in data
        assert "streak_days" in data
        print(f"Kids Zone Dashboard: {data['total_stars']} stars, {data['streak_days']} day streak")
    
    def test_text_chat_buddy(self):
        """Test text-based Health Buddy chat"""
        response = requests.post(
            f"{BASE_URL}/api/alyne/kidszone/buddy/chat",
            json={
                "child_id": TEST_CHILD_ID,
                "message": "Hello!",
                "child_name": "Emma",
                "age": 5,
                "session_id": f"test_{datetime.now().timestamp()}"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "response" in data
        print(f"Chat response: {data['response'][:100]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
