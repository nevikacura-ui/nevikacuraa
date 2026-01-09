"""
Test suite for Staff Portal Features:
1. Staff Login (clinic, pharmacy, diagnostics, doctor)
2. Pharmacy staff - view orders and update status
3. Diagnostics staff - view orders and update status
4. Emergency appointments (no time slot, 10/day limit)
5. Slot blocking (prevent double booking)
6. Add-on services (BLOOD_TEST, SONOGRAPHY, ECG)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
CLINIC_STAFF_PUSHPA = {"username": "staff_pushpa", "password": "Nevika@2026C"}
CLINIC_STAFF_AMNION = {"username": "staff_amnion", "password": "Nevika@2026C"}
DOCTOR_PUSHPA = {"username": "doc_pushpa_01", "password": "Nevika@2026D"}
PHARMACY_STAFF = {"username": "staff_pharmacy", "password": "Nevika@2026P"}
DIAGNOSTICS_STAFF = {"username": "staff_proton", "password": "Nevika@2026L"}

TODAY = datetime.now().strftime("%Y-%m-%d")


class TestStaffLogin:
    """Test all staff login functionality"""
    
    def test_clinic_staff_pushpa_login(self):
        """Test clinic staff (Pushpa) can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "clinic_staff_pushpa"
        assert data["clinic"] == "Pushpa Clinic"
        print(f"✓ Clinic staff Pushpa login - Role: {data['role']}, Clinic: {data['clinic']}")
    
    def test_pharmacy_staff_login(self):
        """Test pharmacy staff can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=PHARMACY_STAFF)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "pharmacy_staff"
        assert data["name"] == "Orange Pharmacy Team"
        print(f"✓ Pharmacy staff login - Role: {data['role']}, Name: {data['name']}")
    
    def test_diagnostics_staff_login(self):
        """Test diagnostics staff can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "diagnostics_staff"
        assert data["name"] == "Proton Lab Team"
        print(f"✓ Diagnostics staff login - Role: {data['role']}, Name: {data['name']}")
    
    def test_doctor_pushpa_login(self):
        """Test doctor (Pushpa) can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DOCTOR_PUSHPA)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "doctor_pushpa"
        assert data["doctor_name"] == "Dr. Neha Batra"
        assert data["clinic"] == "Pushpa Clinic"
        print(f"✓ Doctor login - Role: {data['role']}, Doctor: {data['doctor_name']}")


class TestPharmacyStaffOrders:
    """Test pharmacy staff can view and update orders"""
    
    @pytest.fixture
    def pharmacy_token(self):
        """Get pharmacy staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=PHARMACY_STAFF)
        if response.status_code != 200:
            pytest.skip("Pharmacy staff login failed")
        return response.json()["token"]
    
    def test_pharmacy_view_orders(self, pharmacy_token):
        """Test pharmacy staff can view orders at /api/staff/pharmacy/orders"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        response = requests.get(f"{BASE_URL}/api/staff/pharmacy/orders", headers=headers)
        
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        
        assert "orders" in data
        assert "statuses" in data
        
        # Verify statuses match expected values
        expected_statuses = ["Order Booked", "Packing", "Out for Delivery", "Delivered"]
        assert data["statuses"] == expected_statuses, f"Statuses mismatch: {data['statuses']}"
        
        print(f"✓ Pharmacy orders endpoint works - {len(data['orders'])} orders found")
        print(f"✓ Available statuses: {data['statuses']}")
    
    def test_pharmacy_status_update_flow(self, pharmacy_token):
        """Test pharmacy staff can update status: Order Booked -> Packing -> Out for Delivery -> Delivered"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        
        # First, create a test order
        # We need to create a pharmacy order first
        order_data = {
            "medicines": [{"name": "TEST_Status_Medicine", "quantity": 1}],
            "patient_name": "TEST_Pharmacy_Status_Flow",
            "patient_phone": "9876500001",
            "delivery_address": "Test Address for Status Flow"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test order: {create_response.text}")
        
        order_id = create_response.json()["id"]
        print(f"✓ Created test order: {order_id}")
        
        # Test status flow: Order Booked -> Packing -> Out for Delivery -> Delivered
        status_flow = ["Order Booked", "Packing", "Out for Delivery", "Delivered"]
        
        for status in status_flow:
            response = requests.put(
                f"{BASE_URL}/api/staff/pharmacy/orders/{order_id}/status",
                json={"status": status},
                headers=headers
            )
            assert response.status_code == 200, f"Failed to update to {status}: {response.text}"
            print(f"✓ Updated status to: {status}")
        
        # Verify final status
        orders_response = requests.get(f"{BASE_URL}/api/staff/pharmacy/orders", headers=headers)
        orders = orders_response.json()["orders"]
        test_order = next((o for o in orders if o["id"] == order_id), None)
        
        assert test_order is not None, "Test order not found"
        assert test_order["status"] == "Delivered", f"Final status should be Delivered, got: {test_order['status']}"
        print(f"✓ Pharmacy status flow complete - Final status: {test_order['status']}")


class TestDiagnosticsStaffOrders:
    """Test diagnostics staff can view and update orders"""
    
    @pytest.fixture
    def diagnostics_token(self):
        """Get diagnostics staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF)
        if response.status_code != 200:
            pytest.skip("Diagnostics staff login failed")
        return response.json()["token"]
    
    def test_diagnostics_view_orders(self, diagnostics_token):
        """Test diagnostics staff can view orders at /api/staff/diagnostic/orders"""
        headers = {"Authorization": f"Bearer {diagnostics_token}"}
        response = requests.get(f"{BASE_URL}/api/staff/diagnostic/orders", headers=headers)
        
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        
        assert "orders" in data
        assert "statuses" in data
        
        # Verify statuses match expected values
        expected_statuses = ["Test Booked", "Sample Collected", "In Process", "Reports Generated"]
        assert data["statuses"] == expected_statuses, f"Statuses mismatch: {data['statuses']}"
        
        print(f"✓ Diagnostics orders endpoint works - {len(data['orders'])} orders found")
        print(f"✓ Available statuses: {data['statuses']}")
    
    def test_diagnostics_status_update_flow(self, diagnostics_token):
        """Test diagnostics staff can update status: Test Booked -> Sample Collected -> In Process -> Reports Generated"""
        headers = {"Authorization": f"Bearer {diagnostics_token}"}
        
        # First, create a test diagnostic order
        order_data = {
            "tests": ["TEST_Blood_Test"],
            "preferred_date": TODAY,
            "patient_name": "TEST_Diagnostics_Status_Flow",
            "patient_phone": "9876500002"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test order: {create_response.text}")
        
        order_id = create_response.json()["id"]
        print(f"✓ Created test diagnostic order: {order_id}")
        
        # Test status flow: Test Booked -> Sample Collected -> In Process -> Reports Generated
        status_flow = ["Test Booked", "Sample Collected", "In Process", "Reports Generated"]
        
        for status in status_flow:
            response = requests.put(
                f"{BASE_URL}/api/staff/diagnostic/orders/{order_id}/status",
                json={"status": status},
                headers=headers
            )
            assert response.status_code == 200, f"Failed to update to {status}: {response.text}"
            print(f"✓ Updated status to: {status}")
        
        # Verify final status
        orders_response = requests.get(f"{BASE_URL}/api/staff/diagnostic/orders", headers=headers)
        orders = orders_response.json()["orders"]
        test_order = next((o for o in orders if o["id"] == order_id), None)
        
        assert test_order is not None, "Test order not found"
        assert test_order["status"] == "Reports Generated", f"Final status should be Reports Generated, got: {test_order['status']}"
        print(f"✓ Diagnostics status flow complete - Final status: {test_order['status']}")
    
    def test_diagnostics_service_orders(self, diagnostics_token):
        """Test diagnostics staff can view service-linked orders"""
        headers = {"Authorization": f"Bearer {diagnostics_token}"}
        response = requests.get(f"{BASE_URL}/api/staff/diagnostic/service-orders", headers=headers)
        
        assert response.status_code == 200, f"Failed to get service orders: {response.text}"
        data = response.json()
        
        assert "orders" in data
        assert "service_statuses" in data
        
        print(f"✓ Service-linked orders endpoint works - {len(data['orders'])} orders found")


class TestEmergencyAppointments:
    """Test emergency appointment booking"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_emergency_appointment_no_time_slot(self, staff_token):
        """Test emergency appointment does NOT require time slot"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        emergency_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "patient_name": "TEST_Emergency_NoTime",
            "patient_phone": "9876500003"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/emergency",
            json=emergency_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Emergency booking failed: {response.text}"
        data = response.json()
        
        # Verify no time slot
        assert data.get("time") is None, "Emergency appointment should have NO time slot"
        assert data.get("appointment_type") == "EMERGENCY"
        assert data.get("booking_type") == "emergency"
        print(f"✓ Emergency appointment booked without time slot - ID: {data['id']}")
    
    def test_emergency_count_endpoint(self, staff_token):
        """Test emergency count endpoint returns X/10 format"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/emergency-count/Dr. Neha Batra/{TODAY}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Emergency count failed: {response.text}"
        data = response.json()
        
        assert "emergency_count" in data
        assert "max_allowed" in data
        assert data["max_allowed"] == 10, "Max emergency should be 10"
        print(f"✓ Emergency count: {data['emergency_count']}/{data['max_allowed']}")


class TestSlotBlocking:
    """Test slot blocking for normal appointments"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_slot_blocking_prevents_double_booking(self, staff_token):
        """Test same slot cannot be double-booked"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Use a unique time slot for this test
        test_time = "09:00"
        
        # Book first walk-in appointment
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": test_time,
            "patient_name": "TEST_SlotBlock_First",
            "patient_phone": "9876500004"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        # First booking should succeed (or slot already taken)
        if response1.status_code == 200:
            print(f"✓ First booking at {test_time} succeeded")
            
            # Try to book same slot again
            walkin_data["patient_name"] = "TEST_SlotBlock_Second"
            walkin_data["patient_phone"] = "9876500005"
            
            response2 = requests.post(
                f"{BASE_URL}/api/staff/appointments/walk-in",
                json=walkin_data,
                headers=headers
            )
            
            # Second booking should fail with slot blocking error
            assert response2.status_code == 400, f"Double booking should fail but got: {response2.status_code}"
            assert "already booked" in response2.json().get("detail", "").lower()
            print(f"✓ Double booking correctly blocked: {response2.json().get('detail')}")
        else:
            # Slot already taken from previous test
            assert "already booked" in response1.json().get("detail", "").lower()
            print(f"✓ Slot blocking working - slot already taken")


class TestAddOnServices:
    """Test add-on services (Blood Test, Sonography, ECG)"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_add_blood_test_service(self, staff_token):
        """Test adding Blood Test service to appointment"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Create appointment first
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "16:30",
            "patient_name": "TEST_BloodTest_Service",
            "patient_phone": "9876500006"
        }
        
        appt_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if appt_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {appt_response.text}")
        
        appointment_id = appt_response.json()["id"]
        
        # Add Blood Test service
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/services",
            json={"service_type": "BLOOD_TEST"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Add Blood Test failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("service", {}).get("service_type") == "BLOOD_TEST"
        print(f"✓ Blood Test service added successfully")
    
    def test_add_sonography_service(self, staff_token):
        """Test adding Sonography service to appointment"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "17:00",
            "patient_name": "TEST_Sonography_Service",
            "patient_phone": "9876500007"
        }
        
        appt_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if appt_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {appt_response.text}")
        
        appointment_id = appt_response.json()["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/services",
            json={"service_type": "SONOGRAPHY"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Add Sonography failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("service", {}).get("service_type") == "SONOGRAPHY"
        print(f"✓ Sonography service added successfully")
    
    def test_add_ecg_service(self, staff_token):
        """Test adding ECG service to appointment"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        walkin_data = {
            "doctor": "Dr. Neha Batra",
            "clinic": "Pushpa Clinic",
            "date": TODAY,
            "time": "17:30",
            "patient_name": "TEST_ECG_Service",
            "patient_phone": "9876500008"
        }
        
        appt_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if appt_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {appt_response.text}")
        
        appointment_id = appt_response.json()["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/services",
            json={"service_type": "ECG"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Add ECG failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("service", {}).get("service_type") == "ECG"
        print(f"✓ ECG service added successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
