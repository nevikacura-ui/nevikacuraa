"""
Test Suite for New Healthcare Features - Iteration 22
- Emergency Services (hospitals, ambulance, medical ID, SOS)
- Health Risk Assessment (diabetes, heart, cancer screening)
- Medication Tracker (medications, daily tracking, history)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmergencyServices:
    """Emergency Services API Tests"""
    
    def test_get_hospitals(self):
        """Test GET /api/emergency/hospitals returns hospital list"""
        response = requests.get(f"{BASE_URL}/api/emergency/hospitals")
        assert response.status_code == 200
        
        data = response.json()
        assert "hospitals" in data
        assert len(data["hospitals"]) > 0
        
        # Verify hospital structure
        hospital = data["hospitals"][0]
        assert "id" in hospital
        assert "name" in hospital
        assert "address" in hospital
        assert "emergency_phone" in hospital
        assert "has_icu" in hospital
        assert "has_ambulance" in hospital
        assert "rating" in hospital
        print(f"✓ Found {len(data['hospitals'])} hospitals")
    
    def test_get_hospitals_with_location(self):
        """Test GET /api/emergency/hospitals with location params"""
        response = requests.get(
            f"{BASE_URL}/api/emergency/hospitals",
            params={"latitude": 19.2437, "longitude": 73.1355}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "hospitals" in data
        # Should have distance_km when location provided
        if len(data["hospitals"]) > 0:
            hospital = data["hospitals"][0]
            assert "distance_km" in hospital
            print(f"✓ Nearest hospital: {hospital['name']} ({hospital['distance_km']} km)")
    
    def test_get_ambulance_services(self):
        """Test GET /api/emergency/ambulance-services returns ambulance list"""
        response = requests.get(f"{BASE_URL}/api/emergency/ambulance-services")
        assert response.status_code == 200
        
        data = response.json()
        assert "services" in data
        assert len(data["services"]) > 0
        
        # Verify ambulance service structure
        service = data["services"][0]
        assert "id" in service
        assert "name" in service
        assert "phone" in service
        assert "type" in service
        assert "response_time" in service
        assert "available_24x7" in service
        print(f"✓ Found {len(data['services'])} ambulance services")
    
    def test_get_medical_id_not_found(self):
        """Test GET /api/emergency/medical-id/{user_id} for non-existent user"""
        response = requests.get(f"{BASE_URL}/api/emergency/medical-id/nonexistent-user-123")
        # Should return 404 for non-existent user
        assert response.status_code == 404
        print("✓ Medical ID returns 404 for non-existent user")


class TestHealthRiskAssessment:
    """Health Risk Assessment API Tests"""
    
    def test_get_assessment_history_empty(self):
        """Test GET /api/health-assessment/history/{user_id} returns empty for new user"""
        response = requests.get(f"{BASE_URL}/api/health-assessment/history/test-user-{uuid.uuid4()}")
        assert response.status_code == 200
        
        data = response.json()
        assert "assessments" in data
        assert isinstance(data["assessments"], list)
        print("✓ Assessment history returns empty list for new user")
    
    def test_diabetes_risk_assessment(self):
        """Test POST /api/health-assessment/diabetes-risk"""
        test_user_id = f"test-user-{uuid.uuid4()}"
        
        payload = {
            "age": 45,
            "bmi": 28.5,
            "waist_circumference": 95,
            "physical_activity": False,
            "daily_vegetables": True,
            "high_bp_medication": False,
            "high_blood_glucose_history": False,
            "family_diabetes": "parent_sibling"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-assessment/diabetes-risk",
            params={"user_id": test_user_id},
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "assessment_id" in data
        assert "score" in data
        assert "risk_level" in data
        assert "recommendations" in data
        assert "breakdown" in data
        
        print(f"✓ Diabetes Risk Assessment: Score={data['score']}, Level={data['risk_level']}")
    
    def test_heart_risk_assessment(self):
        """Test POST /api/health-assessment/heart-risk"""
        test_user_id = f"test-user-{uuid.uuid4()}"
        
        payload = {
            "age": 50,
            "gender": "male",
            "total_cholesterol": 220,
            "hdl_cholesterol": 45,
            "systolic_bp": 145,
            "on_bp_treatment": True,
            "smoker": False,
            "diabetic": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-assessment/heart-risk",
            params={"user_id": test_user_id},
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "assessment_id" in data
        assert "risk_points" in data
        assert "risk_level" in data
        assert "recommendations" in data
        assert "breakdown" in data
        
        print(f"✓ Heart Risk Assessment: Points={data['risk_points']}, Level={data['risk_level']}")
    
    def test_cancer_screening_assessment(self):
        """Test POST /api/health-assessment/cancer-screening"""
        test_user_id = f"test-user-{uuid.uuid4()}"
        
        payload = {
            "age": 55,
            "gender": "female",
            "smoker": False,
            "smoking_years": 0,
            "family_cancer_history": ["breast"],
            "alcohol_regular": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-assessment/cancer-screening",
            params={"user_id": test_user_id},
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "assessment_id" in data
        assert "screenings_recommended" in data
        assert "screenings" in data
        assert "recommendations" in data
        
        print(f"✓ Cancer Screening: {data['screenings_recommended']} screenings recommended")


class TestMedicationTracker:
    """Medication Tracker API Tests"""
    
    def test_get_medications_empty(self):
        """Test GET /api/medication-tracker/medications/{user_id} returns empty for new user"""
        response = requests.get(f"{BASE_URL}/api/medication-tracker/medications/test-user-{uuid.uuid4()}")
        assert response.status_code == 200
        
        data = response.json()
        assert "medications" in data
        assert isinstance(data["medications"], list)
        print("✓ Medications returns empty list for new user")
    
    def test_add_medication(self):
        """Test POST /api/medication-tracker/medications/{user_id}"""
        test_user_id = f"test-user-{uuid.uuid4()}"
        
        payload = {
            "name": "TEST_Metformin",
            "dosage": "500mg",
            "frequency": "twice_daily",
            "times": ["09:00", "21:00"],
            "instructions": "after_meal",
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "quantity": 60,
            "refill_reminder_days": 5,
            "notes": "Test medication"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/medication-tracker/medications/{test_user_id}",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "medication" in data
        assert data["medication"]["name"] == "TEST_Metformin"
        assert data["medication"]["dosage"] == "500mg"
        
        print(f"✓ Added medication: {data['medication']['name']}")
        return test_user_id, data["medication"]["id"]
    
    def test_get_today_schedule(self):
        """Test GET /api/medication-tracker/today/{user_id}"""
        # First add a medication
        test_user_id = f"test-user-{uuid.uuid4()}"
        
        payload = {
            "name": "TEST_Aspirin",
            "dosage": "100mg",
            "frequency": "once_daily",
            "times": ["08:00"],
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        requests.post(
            f"{BASE_URL}/api/medication-tracker/medications/{test_user_id}",
            json=payload
        )
        
        # Get today's schedule
        response = requests.get(f"{BASE_URL}/api/medication-tracker/today/{test_user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "schedule" in data
        assert "summary" in data
        
        print(f"✓ Today's schedule: {len(data['schedule'])} doses, Adherence: {data['summary']['adherence_rate']}%")
    
    def test_get_medication_history(self):
        """Test GET /api/medication-tracker/history/{user_id}"""
        test_user_id = f"test-user-{uuid.uuid4()}"
        
        response = requests.get(
            f"{BASE_URL}/api/medication-tracker/history/{test_user_id}",
            params={"days": 7}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "period_days" in data
        assert "history" in data
        assert "statistics" in data
        
        print(f"✓ Medication history: {data['statistics']['total_doses_scheduled']} doses in {data['period_days']} days")
    
    def test_get_refill_alerts(self):
        """Test GET /api/medication-tracker/refill-alerts/{user_id}"""
        test_user_id = f"test-user-{uuid.uuid4()}"
        
        response = requests.get(f"{BASE_URL}/api/medication-tracker/refill-alerts/{test_user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "alerts" in data
        assert isinstance(data["alerts"], list)
        
        print(f"✓ Refill alerts: {len(data['alerts'])} medications need refill")


class TestAPIHealth:
    """API Health Check Tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API is healthy: {data['name']} v{data['version']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
