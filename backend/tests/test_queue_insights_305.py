"""
Test Queue Insights API and Billing Timer Endpoints
Iteration 305 - Testing live wait timer, queue insights, and billing timer features
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ API health check passed")


class TestStaffLogin:
    """Staff authentication tests"""
    
    def test_staff_login_success(self):
        """Test staff login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        print(f"✓ Staff login successful - role: {data['staff'].get('role')}")
        return data["token"]
    
    def test_doctor_login_success(self):
        """Test doctor login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Doctor login successful - role: {data['staff'].get('role')}")
        return data["token"]


class TestQueueInsightsAPI:
    """Queue Insights endpoint tests"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff auth token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_queue_insights_endpoint_exists(self, staff_token):
        """Test that queue insights endpoint exists and returns data"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/queue/insights",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "waiting_count" in data
        assert "avg_wait_minutes" in data
        assert "with_doctor_count" in data
        assert "completed_count" in data
        assert "longest_waiting" in data
        assert "waiting_patients" in data
        print(f"✓ Queue insights returned: waiting={data['waiting_count']}, with_dr={data['with_doctor_count']}, avg_wait={data['avg_wait_minutes']}m, done={data['completed_count']}")
    
    def test_queue_insights_with_clinic_filter(self, staff_token):
        """Test queue insights with clinic filter"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/queue/insights",
            headers={"Authorization": f"Bearer {staff_token}"},
            params={"clinic": "Pushpa Clinic"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("clinic") == "Pushpa Clinic"
        print(f"✓ Queue insights for Pushpa Clinic: waiting={data['waiting_count']}, done={data['completed_count']}")
    
    def test_queue_insights_returns_correct_structure(self, staff_token):
        """Verify queue insights response structure"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/queue/insights",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        required_fields = [
            "success", "date", "waiting_count", "with_doctor_count",
            "billing_count", "completed_count", "total_today",
            "avg_wait_minutes", "longest_waiting", "waiting_patients"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify types
        assert isinstance(data["waiting_count"], int)
        assert isinstance(data["with_doctor_count"], int)
        assert isinstance(data["completed_count"], int)
        assert isinstance(data["avg_wait_minutes"], int)
        assert isinstance(data["waiting_patients"], list)
        
        print(f"✓ Queue insights structure verified - all {len(required_fields)} fields present")
    
    def test_queue_insights_requires_auth(self):
        """Test that queue insights requires authentication"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/queue/insights")
        assert response.status_code == 401
        print("✓ Queue insights correctly requires authentication")


class TestBillingTimerEndpoints:
    """Billing timer endpoint tests"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff auth token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_billing_pending_endpoint_exists(self, staff_token):
        """Test that billing pending endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/billing/pending",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "pending_count" in data
        assert "appointments" in data
        assert "server_time" in data
        print(f"✓ Billing pending endpoint works - {data['pending_count']} pending bills")
    
    def test_billing_pending_with_clinic_filter(self, staff_token):
        """Test billing pending with clinic filter"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/billing/pending",
            headers={"Authorization": f"Bearer {staff_token}"},
            params={"clinic": "Pushpa Clinic"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Billing pending for Pushpa Clinic: {data['pending_count']} pending")
    
    def test_billing_close_requires_appointment_id(self, staff_token):
        """Test that billing close requires valid appointment ID"""
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/billing/close",
            headers={"Authorization": f"Bearer {staff_token}"},
            json={
                "appointment_id": "nonexistent-id",
                "final_amount": 500
            }
        )
        # Should return 404 for non-existent appointment
        assert response.status_code == 404
        print("✓ Billing close correctly returns 404 for non-existent appointment")
    
    def test_billing_endpoints_require_auth(self):
        """Test that billing endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/billing/pending")
        assert response.status_code == 401
        
        response = requests.post(f"{BASE_URL}/api/diagyn-staff/billing/close", json={
            "appointment_id": "test",
            "final_amount": 100
        })
        assert response.status_code == 401
        print("✓ Billing endpoints correctly require authentication")


class TestTodaysAppointments:
    """Test today's appointments endpoint for checked-in patients"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff auth token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_todays_appointments_returns_checked_in_at(self, staff_token):
        """Test that today's appointments include checked_in_at for LiveWaitTimer"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/today",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        assert "summary" in data
        
        # Check if any checked-in appointments have checked_in_at field
        checked_in = [a for a in data["appointments"] if a.get("status") == "CheckedIn"]
        for apt in checked_in:
            assert "checked_in_at" in apt, f"CheckedIn appointment {apt.get('booking_id')} missing checked_in_at"
        
        print(f"✓ Today's appointments: {len(data['appointments'])} total, {len(checked_in)} checked-in with timestamps")
    
    def test_appointments_by_date_endpoint(self, staff_token):
        """Test appointments by date endpoint"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            headers={"Authorization": f"Bearer {staff_token}"},
            params={"date": today}
        )
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        assert "summary" in data
        print(f"✓ Appointments by date works - {len(data['appointments'])} appointments for {today}")


class TestDiaGynStaffConfig:
    """Test DiaGyn staff config endpoint"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff auth token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Staff login failed")
    
    def test_diagyn_staff_config(self, staff_token):
        """Test DiaGyn staff config endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/config",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "clinics" in data
        assert "doctor_schedule" in data
        assert "fee_codes" in data
        print(f"✓ DiaGyn staff config works - {len(data['clinics'])} clinics configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
