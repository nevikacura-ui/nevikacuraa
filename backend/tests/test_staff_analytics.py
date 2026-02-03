"""
Staff Analytics API Tests
Tests for the new analytics endpoints added to staff portal
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://healthrefresh.preview.emergentagent.com')

class TestStaffAnalytics:
    """Test staff analytics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_pushpa", "password": "Nevika@2026C"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_clinic_analytics_week(self):
        """Test clinic analytics endpoint with week range"""
        response = requests.get(
            f"{BASE_URL}/api/staff/analytics/clinic",
            params={"clinic": "Pushpa", "time_range": "week"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "total_appointments" in data
        assert "change_percent" in data
        assert "walkins" in data
        assert "walkin_percent" in data
        assert "emergencies" in data
        assert "emergency_change" in data
        assert "completed" in data
        assert "completion_rate" in data
        assert "avg_wait_time" in data
        assert "daily_breakdown" in data
        assert "top_doctors" in data
        
        # Verify daily_breakdown is a list with day data
        assert isinstance(data["daily_breakdown"], list)
        if len(data["daily_breakdown"]) > 0:
            day_data = data["daily_breakdown"][0]
            assert "day" in day_data
            assert "appointments" in day_data
            assert "walkins" in day_data
        
        # Verify top_doctors structure
        assert isinstance(data["top_doctors"], list)
        if len(data["top_doctors"]) > 0:
            doctor = data["top_doctors"][0]
            assert "name" in doctor
            assert "appointments" in doctor
            assert "rating" in doctor
        
        print(f"Clinic Analytics (week): {data['total_appointments']} appointments")
    
    def test_clinic_analytics_today(self):
        """Test clinic analytics endpoint with today range"""
        response = requests.get(
            f"{BASE_URL}/api/staff/analytics/clinic",
            params={"clinic": "Pushpa", "time_range": "today"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_appointments" in data
        assert "daily_breakdown" in data
        # Today should have only 1 day in breakdown
        assert len(data["daily_breakdown"]) == 1
        
        print(f"Clinic Analytics (today): {data['total_appointments']} appointments")
    
    def test_clinic_analytics_month(self):
        """Test clinic analytics endpoint with month range"""
        response = requests.get(
            f"{BASE_URL}/api/staff/analytics/clinic",
            params={"clinic": "Pushpa", "time_range": "month"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_appointments" in data
        assert "top_doctors" in data
        
        # Month should have more data typically
        print(f"Clinic Analytics (month): {data['total_appointments']} appointments, {len(data['top_doctors'])} doctors")
    
    def test_pharmacy_analytics_week(self):
        """Test pharmacy analytics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/staff/analytics/pharmacy",
            params={"time_range": "week"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "total_orders" in data
        assert "order_change" in data
        assert "delivered" in data
        assert "delivery_rate" in data
        assert "pending" in data
        assert "avg_fulfillment_time" in data
        assert "status_breakdown" in data
        assert "hourly_orders" in data
        assert "top_medicines" in data
        
        print(f"Pharmacy Analytics (week): {data['total_orders']} orders")
    
    def test_diagnostics_analytics_week(self):
        """Test diagnostics analytics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/staff/analytics/diagnostics",
            params={"time_range": "week"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "total_tests" in data
        assert "test_change" in data
        assert "samples_collected" in data
        assert "reports_generated" in data
        assert "completion_rate" in data
        assert "avg_turnaround" in data
        assert "status_breakdown" in data
        assert "test_categories" in data
        assert "popular_tests" in data
        
        print(f"Diagnostics Analytics (week): {data['total_tests']} tests")
    
    def test_analytics_requires_auth(self):
        """Test that analytics endpoints require authentication"""
        # Test without auth header
        response = requests.get(
            f"{BASE_URL}/api/staff/analytics/clinic",
            params={"time_range": "week"}
        )
        assert response.status_code == 401, "Should require authentication"
        
        response = requests.get(
            f"{BASE_URL}/api/staff/analytics/pharmacy",
            params={"time_range": "week"}
        )
        assert response.status_code == 401, "Should require authentication"
        
        response = requests.get(
            f"{BASE_URL}/api/staff/analytics/diagnostics",
            params={"time_range": "week"}
        )
        assert response.status_code == 401, "Should require authentication"
        
        print("All analytics endpoints properly require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
