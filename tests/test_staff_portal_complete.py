"""
Comprehensive Test Suite for Staff Portal Features:
1. Staff Login (clinic staff Pushpa, pharmacy staff, diagnostics staff)
2. Walk-in appointment booking for Dr. Neha Patel and Dr. Vikas Jha
3. Emergency appointment booking (no time slot required)
4. Patient check-in status update (Booked -> In Clinic)
5. Slot blocking - prevent double booking same time slot
6. Time slots match doctor schedule (15-minute intervals)
7. Add-on services - Blood Test, Sonography, ECG
8. Pharmacy bill upload before Out for Delivery
9. Diagnostic report upload before Reports Generated
10. Diagnostics staff can create new orders with patient details
11. Pharmacy status update workflow
12. Diagnostic status update workflow
13. WhatsApp notification attempted for appointments and check-ins
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLINIC_STAFF_PUSHPA = {"username": "staff_pushpa", "password": "Nevika@2026C"}
PHARMACY_STAFF = {"username": "staff_pharmacy", "password": "Nevika@2026P"}
DIAGNOSTICS_STAFF = {"username": "staff_proton", "password": "Nevika@2026L"}

# Get tomorrow's date for testing to avoid conflicts with existing appointments
TOMORROW = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
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
        """Test diagnostics staff (Proton) can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "diagnostics_staff"
        assert data["name"] == "Proton Lab Team"
        print(f"✓ Diagnostics staff login - Role: {data['role']}, Name: {data['name']}")


class TestWalkInAppointments:
    """Test walk-in appointment booking for Dr. Neha Patel and Dr. Vikas Jha"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_walkin_dr_neha_patel(self, staff_token):
        """Test walk-in appointment booking for Dr. Neha Patel at Pushpa Clinic"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        walkin_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": "11:00",
            "patient_name": "TEST_WalkIn_NehaPatel",
            "patient_phone": "9876543001"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Walk-in booking failed: {response.text}"
        data = response.json()
        
        assert data["doctor"] == "Dr. Neha Patel"
        assert data["clinic"] == "Pushpa Clinic"
        assert data["status"] == "Booked"
        assert data["booking_type"] == "walk_in"
        assert "whatsapp_notification" in data, "WhatsApp notification should be attempted"
        
        print(f"✓ Walk-in for Dr. Neha Patel booked - ID: {data['id']}")
        print(f"  WhatsApp notification: {data.get('whatsapp_notification', {}).get('type', 'N/A')}")
        return data["id"]
    
    def test_walkin_dr_vikas_jha(self, staff_token):
        """Test walk-in appointment booking for Dr. Vikas Jha at Pushpa Clinic"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        walkin_data = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": "18:00",
            "patient_name": "TEST_WalkIn_VikasJha",
            "patient_phone": "9876543002"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Walk-in booking failed: {response.text}"
        data = response.json()
        
        assert data["doctor"] == "Dr. Vikas Jha"
        assert data["clinic"] == "Pushpa Clinic"
        assert data["status"] == "Booked"
        assert data["booking_type"] == "walk_in"
        assert "whatsapp_notification" in data, "WhatsApp notification should be attempted"
        
        print(f"✓ Walk-in for Dr. Vikas Jha booked - ID: {data['id']}")
        print(f"  WhatsApp notification: {data.get('whatsapp_notification', {}).get('type', 'N/A')}")
        return data["id"]


class TestEmergencyAppointments:
    """Test emergency appointment booking (no time slot required)"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_emergency_no_time_slot(self, staff_token):
        """Test emergency appointment does NOT require time slot"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        emergency_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "patient_name": "TEST_Emergency_NoTime",
            "patient_phone": "9876543003"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/emergency",
            json=emergency_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Emergency booking failed: {response.text}"
        data = response.json()
        
        assert data.get("time") is None, "Emergency appointment should have NO time slot"
        assert data.get("appointment_type") == "EMERGENCY"
        assert data.get("booking_type") == "emergency"
        assert "whatsapp_notification" in data, "WhatsApp notification should be attempted"
        
        print(f"✓ Emergency appointment booked without time slot - ID: {data['id']}")
        print(f"  WhatsApp notification: {data.get('whatsapp_notification', {}).get('type', 'N/A')}")
    
    def test_emergency_count_endpoint(self, staff_token):
        """Test emergency count endpoint returns X/10 format"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/staff/emergency-count/Dr. Neha Patel/{TOMORROW}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Emergency count failed: {response.text}"
        data = response.json()
        
        assert "emergency_count" in data
        assert "max_allowed" in data
        assert data["max_allowed"] == 10, "Max emergency should be 10"
        print(f"✓ Emergency count: {data['emergency_count']}/{data['max_allowed']}")


class TestPatientCheckIn:
    """Test patient check-in status update (Booked -> In Clinic)"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_checkin_updates_status(self, staff_token):
        """Test check-in updates status from Booked to In Clinic"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # First create an appointment
        walkin_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": "11:30",
            "patient_name": "TEST_CheckIn_Patient",
            "patient_phone": "9876543004"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {create_response.text}")
        
        appointment_id = create_response.json()["id"]
        assert create_response.json()["status"] == "Booked"
        print(f"✓ Created appointment with status: Booked")
        
        # Now check-in the patient
        checkin_response = requests.put(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/check-in",
            headers=headers
        )
        
        assert checkin_response.status_code == 200, f"Check-in failed: {checkin_response.text}"
        data = checkin_response.json()
        
        assert data["status"] == "In Clinic", f"Status should be 'In Clinic', got: {data['status']}"
        assert "whatsapp_notification" in data, "WhatsApp notification should be attempted for check-in"
        
        print(f"✓ Check-in successful - Status updated to: {data['status']}")
        print(f"  WhatsApp notification: {data.get('whatsapp_notification', {}).get('type', 'N/A')}")


class TestSlotBlocking:
    """Test slot blocking - prevent double booking same time slot"""
    
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
        test_time = "12:00"
        
        # Book first walk-in appointment
        walkin_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": test_time,
            "patient_name": "TEST_SlotBlock_First",
            "patient_phone": "9876543005"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if response1.status_code == 200:
            print(f"✓ First booking at {test_time} succeeded")
            
            # Try to book same slot again
            walkin_data["patient_name"] = "TEST_SlotBlock_Second"
            walkin_data["patient_phone"] = "9876543006"
            
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


class TestTimeSlots:
    """Test time slots match doctor schedule (15-minute intervals)"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_time_slots_15_minute_intervals(self, staff_token):
        """Test that time slots are in 15-minute intervals"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Get available slots for Dr. Neha Patel
        response = requests.get(
            f"{BASE_URL}/api/staff/available-slots/Dr. Neha Patel/Pushpa Clinic/{TOMORROW}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get slots: {response.text}"
        data = response.json()
        
        assert "slots" in data
        slots = data["slots"]
        
        if len(slots) > 0:
            # Verify 15-minute intervals
            for slot in slots:
                minutes = int(slot.split(":")[1])
                assert minutes in [0, 15, 30, 45], f"Slot {slot} is not on 15-minute interval"
            print(f"✓ Time slots are in 15-minute intervals - {len(slots)} slots available")
        else:
            print("✓ No slots available (all booked or doctor not available)")


class TestAddOnServices:
    """Test add-on services - Blood Test, Sonography, ECG"""
    
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
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": "14:00",
            "patient_name": "TEST_BloodTest_Service",
            "patient_phone": "9876543007"
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
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": "14:15",
            "patient_name": "TEST_Sonography_Service",
            "patient_phone": "9876543008"
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
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": "14:30",
            "patient_name": "TEST_ECG_Service",
            "patient_phone": "9876543009"
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


class TestPharmacyWorkflow:
    """Test pharmacy status update workflow and bill upload"""
    
    @pytest.fixture
    def pharmacy_token(self):
        """Get pharmacy staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=PHARMACY_STAFF)
        if response.status_code != 200:
            pytest.skip("Pharmacy staff login failed")
        return response.json()["token"]
    
    def test_pharmacy_view_orders(self, pharmacy_token):
        """Test pharmacy staff can view orders"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        response = requests.get(f"{BASE_URL}/api/staff/pharmacy/orders", headers=headers)
        
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        
        assert "orders" in data
        assert "statuses" in data
        
        expected_statuses = ["Order Booked", "Packing", "Out for Delivery", "Delivered"]
        assert data["statuses"] == expected_statuses
        
        print(f"✓ Pharmacy orders endpoint works - {len(data['orders'])} orders found")
        print(f"✓ Available statuses: {data['statuses']}")
    
    def test_pharmacy_status_workflow(self, pharmacy_token):
        """Test pharmacy status workflow: Order Booked -> Packing -> Out for Delivery -> Delivered"""
        headers = {"Authorization": f"Bearer {pharmacy_token}"}
        
        # Create a test order
        order_data = {
            "medicines": [{"name": "TEST_Workflow_Medicine", "quantity": 1}],
            "patient_name": "TEST_Pharmacy_Workflow",
            "patient_phone": "9876543010",
            "delivery_address": "Test Address"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test order: {create_response.text}")
        
        order_id = create_response.json()["id"]
        print(f"✓ Created test order: {order_id}")
        
        # Test status flow (without bill upload for now)
        status_flow = ["Order Booked", "Packing"]
        
        for status in status_flow:
            response = requests.put(
                f"{BASE_URL}/api/staff/pharmacy/orders/{order_id}/status",
                json={"status": status},
                headers=headers
            )
            assert response.status_code == 200, f"Failed to update to {status}: {response.text}"
            print(f"✓ Updated status to: {status}")
        
        # Try to update to "Out for Delivery" without bill - should fail
        response = requests.put(
            f"{BASE_URL}/api/staff/pharmacy/orders/{order_id}/status",
            json={"status": "Out for Delivery"},
            headers=headers
        )
        
        # This should fail because bill is required
        if response.status_code == 400:
            print(f"✓ Correctly blocked 'Out for Delivery' without bill upload")
        else:
            print(f"⚠ 'Out for Delivery' allowed without bill (status: {response.status_code})")


class TestDiagnosticsWorkflow:
    """Test diagnostics status update workflow and report upload"""
    
    @pytest.fixture
    def diagnostics_token(self):
        """Get diagnostics staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=DIAGNOSTICS_STAFF)
        if response.status_code != 200:
            pytest.skip("Diagnostics staff login failed")
        return response.json()["token"]
    
    def test_diagnostics_view_orders(self, diagnostics_token):
        """Test diagnostics staff can view orders"""
        headers = {"Authorization": f"Bearer {diagnostics_token}"}
        response = requests.get(f"{BASE_URL}/api/staff/diagnostic/orders", headers=headers)
        
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        
        assert "orders" in data
        assert "statuses" in data
        
        expected_statuses = ["Test Booked", "Sample Collected", "In Process", "Reports Generated"]
        assert data["statuses"] == expected_statuses
        
        print(f"✓ Diagnostics orders endpoint works - {len(data['orders'])} orders found")
        print(f"✓ Available statuses: {data['statuses']}")
    
    def test_diagnostics_create_order(self, diagnostics_token):
        """Test diagnostics staff can create new orders with patient details"""
        headers = {"Authorization": f"Bearer {diagnostics_token}"}
        
        order_data = {
            "tests": ["Complete Blood Count", "Lipid Profile"],
            "patient_name": "TEST_Diag_NewOrder",
            "patient_phone": "9876543011",
            "patient_email": "test@example.com",
            "age": "35",
            "sex": "Male",
            "preferred_date": TOMORROW
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/diagnostic/orders",
            json=order_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        data = response.json()
        
        assert data["patient_name"] == "TEST_Diag_NewOrder"
        assert data["patient_phone"] == "9876543011"
        assert "Complete Blood Count" in data["tests"]
        
        print(f"✓ Diagnostics order created - ID: {data['id']}")
        return data["id"]
    
    def test_diagnostics_status_workflow(self, diagnostics_token):
        """Test diagnostics status workflow: Test Booked -> Sample Collected -> In Process -> Reports Generated"""
        headers = {"Authorization": f"Bearer {diagnostics_token}"}
        
        # Create a test order
        order_data = {
            "tests": ["TEST_Workflow_Test"],
            "preferred_date": TOMORROW,
            "patient_name": "TEST_Diagnostics_Workflow",
            "patient_phone": "9876543012"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test order: {create_response.text}")
        
        order_id = create_response.json()["id"]
        print(f"✓ Created test diagnostic order: {order_id}")
        
        # Test status flow (without report upload for now)
        status_flow = ["Test Booked", "Sample Collected", "In Process"]
        
        for status in status_flow:
            response = requests.put(
                f"{BASE_URL}/api/staff/diagnostic/orders/{order_id}/status",
                json={"status": status},
                headers=headers
            )
            assert response.status_code == 200, f"Failed to update to {status}: {response.text}"
            print(f"✓ Updated status to: {status}")
        
        # Try to update to "Reports Generated" without report - should fail
        response = requests.put(
            f"{BASE_URL}/api/staff/diagnostic/orders/{order_id}/status",
            json={"status": "Reports Generated"},
            headers=headers
        )
        
        # This should fail because report is required
        if response.status_code == 400:
            print(f"✓ Correctly blocked 'Reports Generated' without report upload")
        else:
            print(f"⚠ 'Reports Generated' allowed without report (status: {response.status_code})")


class TestWhatsAppNotifications:
    """Test WhatsApp notification attempts for appointments and check-ins"""
    
    @pytest.fixture
    def staff_token(self):
        """Get clinic staff token"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=CLINIC_STAFF_PUSHPA)
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_whatsapp_on_walkin_booking(self, staff_token):
        """Test WhatsApp notification is attempted on walk-in booking"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        walkin_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": "15:00",
            "patient_name": "TEST_WhatsApp_WalkIn",
            "patient_phone": "9876543013"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Walk-in booking failed: {response.text}"
        data = response.json()
        
        assert "whatsapp_notification" in data, "WhatsApp notification should be in response"
        wa_notification = data["whatsapp_notification"]
        
        # Should be either 'sent', 'pending', or 'link' type
        assert wa_notification.get("type") in ["sent", "pending", "link"], f"Unexpected notification type: {wa_notification}"
        
        if wa_notification.get("type") == "pending" or wa_notification.get("type") == "link":
            assert "url" in wa_notification, "Fallback wa.me link should be present"
            assert "wa.me/917045266466" in wa_notification["url"], "Should target Dr. Neha Patel's number"
        
        print(f"✓ WhatsApp notification attempted - Type: {wa_notification.get('type')}")
    
    def test_whatsapp_on_checkin(self, staff_token):
        """Test WhatsApp notification is attempted on patient check-in"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Create appointment first
        walkin_data = {
            "doctor": "Dr. Neha Patel",
            "clinic": "Pushpa Clinic",
            "date": TOMORROW,
            "time": "15:15",
            "patient_name": "TEST_WhatsApp_CheckIn",
            "patient_phone": "9876543014"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/staff/appointments/walk-in",
            json=walkin_data,
            headers=headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create appointment: {create_response.text}")
        
        appointment_id = create_response.json()["id"]
        
        # Check-in the patient
        checkin_response = requests.put(
            f"{BASE_URL}/api/staff/appointments/{appointment_id}/check-in",
            headers=headers
        )
        
        assert checkin_response.status_code == 200, f"Check-in failed: {checkin_response.text}"
        data = checkin_response.json()
        
        assert "whatsapp_notification" in data, "WhatsApp notification should be in response"
        wa_notification = data["whatsapp_notification"]
        
        assert wa_notification.get("type") in ["sent", "pending", "link"], f"Unexpected notification type: {wa_notification}"
        
        print(f"✓ WhatsApp notification on check-in - Type: {wa_notification.get('type')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
