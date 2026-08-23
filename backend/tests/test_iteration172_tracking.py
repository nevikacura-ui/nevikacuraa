"""
Iteration 172 - Testing New Features:
1. /api/health endpoint
2. Tracking page /track with unified orders view
3. dr_neha staff login with test1234 password
4. Home page stats/certifications compact display
5. Pharmacy Popular Medicines section
6. Cart delivery options
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')


class TestHealthEndpoint:
    """Test /api/health endpoint returns {status: 'ok'}"""
    
    def test_health_returns_ok(self):
        """API health check should return status ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "status" in data, "Response should have 'status' field"
        assert data["status"] == "ok", f"Expected status 'ok', got '{data['status']}'"
        print(f"✓ /api/health returns: {data}")


class TestDrNehaLogin:
    """Test dr_neha staff login with test1234 password"""
    
    def test_dr_neha_login_with_test1234(self):
        """dr_neha should login successfully with password test1234"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_neha",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify token returned
        assert "token" in data, "Response should have 'token' field"
        assert len(data["token"]) > 50, "Token should be a valid JWT"
        
        # Verify staff info
        assert "staff" in data, "Response should have 'staff' field"
        staff = data["staff"]
        assert staff.get("name") == "Dr. Neha Patel", f"Expected 'Dr. Neha Patel', got '{staff.get('name')}'"
        assert staff.get("role") == "doctor", f"Expected role 'doctor', got '{staff.get('role')}'"
        assert staff.get("doctor_name") == "Dr. Neha Patel", "doctor_name field should be present"
        
        print(f"✓ dr_neha/test1234 login successful: {staff.get('name')} ({staff.get('role')})")
        
    def test_dr_neha_wrong_password_fails(self):
        """dr_neha login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_neha",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ dr_neha with wrong password correctly rejected")


class TestTrackingEndpoint:
    """Test /api/guest/orders endpoint for tracking page"""
    
    def test_guest_orders_returns_unified_data(self):
        """guest/orders should return appointments, pharmacy_orders, and diagnostic_orders"""
        phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/guest/orders?phone={phone}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify all three order types are present
        assert "appointments" in data, "Response should have 'appointments'"
        assert "pharmacy_orders" in data, "Response should have 'pharmacy_orders'"
        assert "diagnostic_orders" in data, "Response should have 'diagnostic_orders'"
        
        # Verify data structure
        appointments = data["appointments"]
        pharmacy_orders = data["pharmacy_orders"]
        diagnostic_orders = data["diagnostic_orders"]
        
        assert isinstance(appointments, list), "appointments should be a list"
        assert isinstance(pharmacy_orders, list), "pharmacy_orders should be a list"
        assert isinstance(diagnostic_orders, list), "diagnostic_orders should be a list"
        
        print(f"✓ Tracking data for {phone}: {len(appointments)} appointments, {len(pharmacy_orders)} pharmacy, {len(diagnostic_orders)} diagnostic")
        
        # Verify appointment structure
        if appointments:
            apt = appointments[0]
            assert "doctor" in apt or "doctor_name" in apt, "Appointment should have doctor info"
            assert "status" in apt, "Appointment should have status"
            assert "date" in apt, "Appointment should have date"
            print(f"  ✓ Sample appointment: {apt.get('doctor')}, Status: {apt.get('status')}")
            
        # Verify pharmacy order structure
        if pharmacy_orders:
            order = pharmacy_orders[0]
            assert "status" in order or "order_status" in order, "Pharmacy order should have status"
            print(f"  ✓ Sample pharmacy: Order ID {order.get('order_id') or order.get('id')}, Status: {order.get('status') or order.get('order_status')}")
            
        # Verify diagnostic order structure
        if diagnostic_orders:
            order = diagnostic_orders[0]
            assert "status" in order or "order_status" in order, "Diagnostic order should have status"
            print(f"  ✓ Sample diagnostic: Order ID {order.get('order_id') or order.get('id')}, Status: {order.get('status')}")
    
    def test_guest_orders_no_phone(self):
        """guest/orders without phone should return empty or error"""
        response = requests.get(f"{BASE_URL}/api/guest/orders?phone=")
        # Should still return 200 but with empty data
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        print("✓ guest/orders handles empty phone correctly")


class TestAppointmentsByPhone:
    """Test /api/appointments/by-phone endpoint"""
    
    def test_appointments_by_phone_returns_list(self):
        """appointments/by-phone should return appointments list"""
        phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/appointments/by-phone/{phone}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "appointments" in data, "Response should have 'appointments'"
        appointments = data["appointments"]
        assert isinstance(appointments, list), "appointments should be a list"
        
        print(f"✓ /api/appointments/by-phone/{phone}: {len(appointments)} appointments found")


class TestAdminLogin:
    """Test admin staff login"""
    
    def test_admin_login(self):
        """admin should login with test1234"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "admin",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should have token"
        print(f"✓ admin/test1234 login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
