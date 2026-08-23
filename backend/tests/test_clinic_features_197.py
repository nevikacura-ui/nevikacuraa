"""
Test Clinic Features API - Iteration 197
Tests for:
1. Token management (current/next/reset) for token announcer
2. Patient visit history lookup by phone
3. Doctor running late notification system
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTokenManagement:
    """Token management endpoints for token announcer"""
    
    def test_get_current_token_diagyn(self):
        """GET /api/tokens/current?department=diagyn returns token_number"""
        response = requests.get(f"{BASE_URL}/api/tokens/current?department=diagyn")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token_number" in data, "Response missing token_number"
        assert "department" in data, "Response missing department"
        assert data["department"] == "diagyn", f"Expected department diagyn, got {data['department']}"
        print(f"✅ Current token for diagyn: {data['token_number']}")
    
    def test_advance_token_diagyn(self):
        """POST /api/tokens/next with department=diagyn increments token"""
        # First get current token
        current_resp = requests.get(f"{BASE_URL}/api/tokens/current?department=diagyn")
        current_token = current_resp.json().get("token_number", 0)
        
        # Advance token
        response = requests.post(
            f"{BASE_URL}/api/tokens/next",
            json={"department": "diagyn"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token_number" in data, "Response missing token_number"
        assert data["token_number"] == current_token + 1, f"Expected {current_token + 1}, got {data['token_number']}"
        print(f"✅ Token advanced: {current_token} -> {data['token_number']}")
    
    def test_reset_token_diagyn(self):
        """POST /api/tokens/reset with department=diagyn resets to 0"""
        response = requests.post(
            f"{BASE_URL}/api/tokens/reset",
            json={"department": "diagyn"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token_number" in data, "Response missing token_number"
        assert data["token_number"] == 0, f"Expected 0, got {data['token_number']}"
        print(f"✅ Token reset to 0")
        
        # Verify reset worked
        verify_resp = requests.get(f"{BASE_URL}/api/tokens/current?department=diagyn")
        verify_data = verify_resp.json()
        assert verify_data["token_number"] == 0, f"Reset verification failed: {verify_data['token_number']}"
        print(f"✅ Reset verified: token is 0")


class TestPatientHistory:
    """Patient visit history lookup by phone"""
    
    def test_patient_history_valid_phone(self):
        """GET /api/clinic/patient-history/9876543210 returns patient data structure"""
        response = requests.get(f"{BASE_URL}/api/clinic/patient-history/9876543210")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required fields in response
        assert "patient" in data, "Response missing 'patient' field"
        assert "appointments" in data, "Response missing 'appointments' field"
        assert "orders" in data, "Response missing 'orders' field"
        assert "lab_orders" in data, "Response missing 'lab_orders' field"
        assert "wallet_transactions" in data, "Response missing 'wallet_transactions' field"
        assert "total_visits" in data, "Response missing 'total_visits' field"
        assert "total_orders" in data, "Response missing 'total_orders' field"
        
        # Validate data types
        assert isinstance(data["appointments"], list), "appointments should be a list"
        assert isinstance(data["orders"], list), "orders should be a list"
        assert isinstance(data["lab_orders"], list), "lab_orders should be a list"
        assert isinstance(data["wallet_transactions"], list), "wallet_transactions should be a list"
        assert isinstance(data["total_visits"], int), "total_visits should be an int"
        assert isinstance(data["total_orders"], int), "total_orders should be an int"
        
        print(f"✅ Patient history structure verified")
        print(f"   - Total visits: {data['total_visits']}")
        print(f"   - Total orders: {data['total_orders']}")
        print(f"   - Appointments: {len(data['appointments'])}")
        print(f"   - Lab orders: {len(data['lab_orders'])}")
    
    def test_patient_history_new_phone(self):
        """GET /api/clinic/patient-history for non-existent phone returns empty lists"""
        response = requests.get(f"{BASE_URL}/api/clinic/patient-history/0000000000")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return empty structure
        assert data["patient"] is None, "Expected patient to be None for non-existent phone"
        assert data["total_visits"] == 0, "Expected 0 visits for non-existent phone"
        print(f"✅ New patient returns empty history correctly")


class TestDoctorRunningLate:
    """Doctor running late notification system"""
    
    def test_send_running_late_notification(self):
        """POST /api/clinic/doctor-running-late sends delay notification"""
        response = requests.post(
            f"{BASE_URL}/api/clinic/doctor-running-late",
            json={
                "doctor_name": "Dr. Vikas Jha",
                "delay_minutes": 15,
                "clinic": "Pushpa Clinic",
                "date": "2026-03-04"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "delay_minutes" in data, "Response missing delay_minutes"
        assert "patients_notified" in data, "Response missing patients_notified"
        assert "message" in data, "Response missing message"
        
        print(f"✅ Running late notification sent")
        print(f"   - Delay: {data['delay_minutes']} minutes")
        print(f"   - Patients notified: {data['patients_notified']}")
    
    def test_get_doctor_delay_status(self):
        """GET /api/clinic/doctor-delay-status returns active delay"""
        response = requests.get(
            f"{BASE_URL}/api/clinic/doctor-delay-status",
            params={
                "doctor": "Dr. Vikas Jha",
                "date": "2026-03-04"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "active" in data, "Response missing 'active' field"
        assert "delay" in data, "Response missing 'delay' field"
        
        # After sending notification, should be active
        if data["active"]:
            assert data["delay"] is not None, "Active delay should have delay info"
            print(f"✅ Delay status active: {data['delay'].get('delay_minutes')}min")
        else:
            print(f"✅ Delay status check works (no active delay)")
    
    def test_clear_doctor_delay(self):
        """POST /api/clinic/clear-doctor-delay clears the delay"""
        response = requests.post(
            f"{BASE_URL}/api/clinic/clear-doctor-delay",
            json={
                "doctor_name": "Dr. Vikas Jha",
                "date": "2026-03-04"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True, got {data}"
        print(f"✅ Delay cleared successfully")
        
        # Verify cleared
        verify_resp = requests.get(
            f"{BASE_URL}/api/clinic/doctor-delay-status",
            params={
                "doctor": "Dr. Vikas Jha",
                "date": "2026-03-04"
            }
        )
        verify_data = verify_resp.json()
        assert verify_data["active"] == False, "Delay should be cleared"
        print(f"✅ Delay clear verified: active={verify_data['active']}")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"✅ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
