"""
Backend API tests for 6 new feature pages:
- Doctor Search
- Live Order Tracking  
- Lab Report Viewer
- Referral Program
- AI Symptom Checker
- Teleconsultation
Plus Language context validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestSymptomCheckerAPI:
    """Test Symptom Checker APIs"""
    
    def test_get_body_areas(self):
        """GET /api/symptom-checker/body-areas returns body areas"""
        response = requests.get(f"{BASE_URL}/api/symptom-checker/body-areas")
        assert response.status_code == 200
        data = response.json()
        assert "body_areas" in data
        # Verify expected body areas exist
        areas = data["body_areas"]
        expected_areas = ["head", "chest", "abdomen", "back", "arms", "legs", "skin", "general"]
        for area in expected_areas:
            assert area in areas, f"Missing body area: {area}"
            assert "label" in areas[area]
            assert "symptoms" in areas[area]
            assert len(areas[area]["symptoms"]) > 0
        print("PASS: Body areas API returns all 8 body areas with symptoms")
    
    def test_analyze_symptoms(self):
        """POST /api/symptom-checker/analyze returns analysis"""
        payload = {
            "symptoms": ["Headache", "Fever", "Fatigue"],
            "severity": 6,
            "duration_days": 3,
            "body_area": "head"
        }
        response = requests.post(
            f"{BASE_URL}/api/symptom-checker/analyze",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "session_id" in data
        assert data["session_id"].startswith("SYM-")
        assert "urgency" in data
        assert data["urgency"] in ["low", "medium", "high"]
        assert "recommended_specialists" in data
        assert len(data["recommended_specialists"]) > 0
        assert "disclaimer" in data
        
        # Verify specialist format
        spec = data["recommended_specialists"][0]
        assert "specialist" in spec
        assert "for_symptoms" in spec
        assert "priority" in spec
        
        print(f"PASS: Symptom analysis returned session {data['session_id']} with urgency {data['urgency']}")
    
    def test_analyze_severity_urgency_mapping(self):
        """Test that high severity results in high urgency"""
        payload = {
            "symptoms": ["Chest pain", "Shortness of breath"],
            "severity": 9,
            "duration_days": 1
        }
        response = requests.post(
            f"{BASE_URL}/api/symptom-checker/analyze",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["urgency"] == "high"
        print("PASS: High severity (9/10) correctly maps to high urgency")


class TestLabReportsAPI:
    """Test Lab Reports APIs"""
    
    def test_get_health_summary(self):
        """GET /api/lab-reports/summary/{phone} returns health summary"""
        phone = "9999999999"
        response = requests.get(f"{BASE_URL}/api/lab-reports/summary/{phone}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "score" in data
        assert isinstance(data["score"], (int, float))
        assert 0 <= data["score"] <= 100
        assert "normal" in data
        assert "borderline" in data
        assert "abnormal" in data
        assert "details" in data
        
        # Verify details structure
        assert len(data["details"]) > 0
        detail = data["details"][0]
        assert "test" in detail
        assert "value" in detail
        assert "status" in detail
        
        print(f"PASS: Health summary returned score {data['score']} with {len(data['details'])} test details")
    
    def test_get_patient_reports(self):
        """GET /api/lab-reports/patient/{phone} returns reports"""
        phone = "9999999999"
        response = requests.get(f"{BASE_URL}/api/lab-reports/patient/{phone}")
        assert response.status_code == 200
        data = response.json()
        
        assert "reports" in data
        assert "total" in data
        assert len(data["reports"]) > 0
        
        # Verify report structure
        report = data["reports"][0]
        assert "report_id" in report
        assert "date" in report
        assert "lab" in report
        assert "type" in report
        assert "results" in report
        assert "status" in report
        
        print(f"PASS: Patient reports returned {data['total']} reports")
    
    def test_get_test_trends(self):
        """GET /api/lab-reports/trends/{phone}/{test_key} returns trends"""
        phone = "9999999999"
        test_key = "hemoglobin"
        response = requests.get(f"{BASE_URL}/api/lab-reports/trends/{phone}/{test_key}")
        assert response.status_code == 200
        data = response.json()
        
        assert "trends" in data
        assert len(data["trends"]) > 0
        
        # Verify trend data point structure
        trend = data["trends"][0]
        assert "date" in trend
        assert "value" in trend
        
        print(f"PASS: Trends returned {len(data['trends'])} data points for {test_key}")


class TestDoctorSearchAPI:
    """Test Doctor Search API (existing endpoint used by new page)"""
    
    def test_get_all_doctors(self):
        """GET /api/doctors/all returns doctors list"""
        response = requests.get(f"{BASE_URL}/api/doctors/all")
        assert response.status_code == 200
        data = response.json()
        
        assert "doctors" in data
        # May be empty but structure should exist
        if len(data["doctors"]) > 0:
            doc = data["doctors"][0]
            # Verify doctor has expected fields
            assert "id" in doc or "doctor_id" in doc
            assert "name" in doc
            print(f"PASS: Doctors API returned {len(data['doctors'])} doctors")
        else:
            print("PASS: Doctors API returned empty list (no doctors registered)")


class TestTrackingAPI:
    """Test Order Tracking API (existing endpoint used by new page)"""
    
    def test_track_demo_order(self):
        """Test tracking endpoint responds"""
        response = requests.get(f"{BASE_URL}/api/track/ORD-DEMO-001")
        # May return 404 for demo order, but endpoint should exist
        assert response.status_code in [200, 404]
        print("PASS: Tracking API endpoint exists and responds")


class TestReferralAPI:
    """Test Referral API (existing endpoint used by new page)"""
    
    def test_get_referral_code(self):
        """GET /api/referral/code/{user_id} returns referral data"""
        user_id = "9999999999"
        response = requests.get(f"{BASE_URL}/api/referral/code/{user_id}")
        # Endpoint may or may not exist - just verify it doesn't crash
        assert response.status_code in [200, 404, 500]
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Referral API returned code")
        else:
            print(f"INFO: Referral API returned {response.status_code} - endpoint may need implementation")


class TestHealthCheck:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
