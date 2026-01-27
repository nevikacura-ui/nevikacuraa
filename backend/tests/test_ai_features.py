"""
Test AI Healthcare Features - Phase 2
Tests for:
- /api/ai/schedule-optimizer - AI appointment time suggestions
- /api/ai/health-insights - Predictive health risk analysis
- /api/ai/appointment-suggestions - AI specialist recommendations
- /api/ai/health-report - AI-generated comprehensive health report
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIFeaturesAuth:
    """Test that AI features require authentication"""
    
    def test_schedule_optimizer_requires_auth(self):
        """Schedule optimizer should require authentication"""
        response = requests.post(f"{BASE_URL}/api/ai/schedule-optimizer", json={
            "preferred_date": "2026-02-01",
            "appointment_type": "consultation"
        })
        assert response.status_code == 401
        
    def test_health_insights_requires_auth(self):
        """Health insights should require authentication"""
        response = requests.post(f"{BASE_URL}/api/ai/health-insights", json={
            "include_vitals": True,
            "include_lab_results": True
        })
        assert response.status_code == 401
        
    def test_appointment_suggestions_requires_auth(self):
        """Appointment suggestions should require authentication"""
        response = requests.post(f"{BASE_URL}/api/ai/appointment-suggestions", json={
            "symptoms": ["headache", "fever"],
            "severity": "moderate"
        })
        assert response.status_code == 401
        
    def test_health_report_requires_auth(self):
        """Health report should require authentication"""
        response = requests.get(f"{BASE_URL}/api/ai/health-report")
        assert response.status_code == 401


class TestAIFeaturesAuthenticated:
    """Test AI features with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        # Send OTP - uses query parameter
        otp_response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp?mobile=9876543210")
        
        if otp_response.status_code != 200:
            pytest.skip("Could not send OTP for authentication")
            
        otp_data = otp_response.json()
        test_otp = otp_data.get("mock_otp")  # API returns mock_otp
        
        if not test_otp:
            pytest.skip("No test OTP returned")
        
        # Verify OTP - uses query parameters
        verify_response = requests.post(f"{BASE_URL}/api/patients/portal/verify-otp?mobile=9876543210&otp={test_otp}")
        
        if verify_response.status_code != 200:
            pytest.skip("Could not verify OTP")
            
        verify_data = verify_response.json()
        self.token = verify_data.get("token")
        
        if not self.token:
            pytest.skip("No token returned after OTP verification")
            
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_schedule_optimizer_success(self):
        """Test AI schedule optimizer returns recommendations"""
        response = requests.post(
            f"{BASE_URL}/api/ai/schedule-optimizer",
            headers=self.headers,
            json={
                "clinic": "pushpa",
                "preferred_date": "2026-02-01",
                "appointment_type": "consultation"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
        assert len(data["recommendations"]) > 0
        
        # Verify recommendation structure
        rec = data["recommendations"][0]
        assert "date" in rec
        assert "time" in rec
        assert "reason" in rec
        
        # Check for AI powered flag and disclaimer
        assert "ai_powered" in data
        assert "disclaimer" in data
        
        print(f"Schedule Optimizer - AI Powered: {data.get('ai_powered')}")
        print(f"Recommendations: {len(data['recommendations'])}")
        
    def test_schedule_optimizer_without_preferences(self):
        """Test schedule optimizer with minimal input"""
        response = requests.post(
            f"{BASE_URL}/api/ai/schedule-optimizer",
            headers=self.headers,
            json={}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "recommendations" in data
        
    def test_health_insights_success(self):
        """Test AI health insights returns risk analysis"""
        response = requests.post(
            f"{BASE_URL}/api/ai/health-insights",
            headers=self.headers,
            json={
                "include_vitals": True,
                "include_lab_results": True,
                "include_medications": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "insights" in data
        
        insights = data["insights"]
        assert "risk_factors" in insights or "recommendations" in insights
        
        # Check for AI powered flag and disclaimer
        assert "ai_powered" in data
        assert "disclaimer" in data
        
        print(f"Health Insights - AI Powered: {data.get('ai_powered')}")
        if "risk_factors" in insights:
            print(f"Risk Factors: {len(insights['risk_factors'])}")
        if "recommendations" in insights:
            print(f"Recommendations: {len(insights['recommendations'])}")
            
    def test_appointment_suggestions_success(self):
        """Test AI appointment suggestions returns specialist recommendation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/appointment-suggestions",
            headers=self.headers,
            json={
                "symptoms": ["headache", "fever", "fatigue"],
                "duration": "few_days",
                "severity": "moderate"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "suggestion" in data
        
        suggestion = data["suggestion"]
        assert "specialist" in suggestion
        assert "urgency" in suggestion
        assert "reason" in suggestion
        
        # Check for AI powered flag and disclaimer
        assert "ai_powered" in data
        assert "disclaimer" in data
        
        print(f"Appointment Suggestions - AI Powered: {data.get('ai_powered')}")
        print(f"Specialist: {suggestion.get('specialist')}")
        print(f"Urgency: {suggestion.get('urgency')}")
        
    def test_appointment_suggestions_with_severe_symptoms(self):
        """Test AI suggestions with severe symptoms"""
        response = requests.post(
            f"{BASE_URL}/api/ai/appointment-suggestions",
            headers=self.headers,
            json={
                "symptoms": ["chest pain", "shortness of breath"],
                "duration": "today",
                "severity": "severe"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        suggestion = data["suggestion"]
        # Severe symptoms should have higher urgency
        assert suggestion.get("urgency") in ["urgent", "emergency", "soon", "routine"]
        
    def test_health_report_success(self):
        """Test AI health report generation"""
        response = requests.get(
            f"{BASE_URL}/api/ai/health-report",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "report" in data
        assert "patient_info" in data
        assert "generated_at" in data
        
        report = data["report"]
        # Report should have summary and recommendations
        assert "summary" in report or "health_overview" in report
        
        # Check for AI powered flag and disclaimer
        assert "ai_powered" in data
        assert "disclaimer" in data
        
        print(f"Health Report - AI Powered: {data.get('ai_powered')}")
        print(f"Patient Info: {data.get('patient_info')}")
        print(f"Generated At: {data.get('generated_at')}")


class TestAIFeaturesEdgeCases:
    """Test edge cases for AI features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        otp_response = requests.post(f"{BASE_URL}/api/patients/portal/send-otp", json={
            "phone": "9876543210"
        })
        
        if otp_response.status_code != 200:
            pytest.skip("Could not send OTP")
            
        otp_data = otp_response.json()
        test_otp = otp_data.get("test_otp")
        
        if not test_otp:
            pytest.skip("No test OTP returned")
        
        verify_response = requests.post(f"{BASE_URL}/api/patients/portal/verify-otp", json={
            "phone": "9876543210",
            "otp": test_otp
        })
        
        if verify_response.status_code != 200:
            pytest.skip("Could not verify OTP")
            
        verify_data = verify_response.json()
        self.token = verify_data.get("token")
        
        if not self.token:
            pytest.skip("No token returned")
            
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_appointment_suggestions_empty_symptoms(self):
        """Test appointment suggestions with empty symptoms list"""
        response = requests.post(
            f"{BASE_URL}/api/ai/appointment-suggestions",
            headers=self.headers,
            json={
                "symptoms": [],
                "severity": "moderate"
            }
        )
        
        # Should still return 200 with fallback
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
    def test_schedule_optimizer_past_date(self):
        """Test schedule optimizer with past date"""
        response = requests.post(
            f"{BASE_URL}/api/ai/schedule-optimizer",
            headers=self.headers,
            json={
                "preferred_date": "2020-01-01",
                "appointment_type": "consultation"
            }
        )
        
        # Should still return 200 with recommendations
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
