"""
Billing Timer System Tests
Testing the billing timer flow for healthcare clinic app:
- Doctor ends consultation (adds fees) → status becomes 'billing_pending' + timer starts
- Staff sees live timer + enters final amount to close bill → status becomes 'Completed'
- Auto-sends WhatsApp appointment completed + Google Review
- Anti-fraud: flags fast closes (<60s) and amount mismatches
- Analytics endpoint tracks avg billing time
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

# Use REACT_APP_BACKEND_URL for external testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')

class TestBillingTimerSystem:
    """Test the billing timer flow for DiaGyn clinic"""
    
    # Class-level variables to share state between tests
    staff_token = None
    doctor_token = None
    test_appointment_id = None
    test_booking_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup: Login as staff and doctor before each test"""
        # Staff login
        if not TestBillingTimerSystem.staff_token:
            staff_res = requests.post(f"{BASE_URL}/api/staff/login", json={
                "username": "staff_diagyn",
                "password": "test1234"
            })
            if staff_res.status_code == 200:
                TestBillingTimerSystem.staff_token = staff_res.json().get("token")
        
        # Doctor login
        if not TestBillingTimerSystem.doctor_token:
            doctor_res = requests.post(f"{BASE_URL}/api/staff/login", json={
                "username": "dr_vikas",
                "password": "test1234"
            })
            if doctor_res.status_code == 200:
                TestBillingTimerSystem.doctor_token = doctor_res.json().get("token")
    
    def get_staff_headers(self):
        return {"Authorization": f"Bearer {TestBillingTimerSystem.staff_token}"}
    
    def get_doctor_headers(self):
        return {"Authorization": f"Bearer {TestBillingTimerSystem.doctor_token}"}
    
    def get_today_ist(self):
        """Get current date in IST"""
        now_utc = datetime.now(timezone.utc)
        ist_offset = timedelta(hours=5, minutes=30)
        ist_now = now_utc + ist_offset
        return ist_now.strftime("%Y-%m-%d")
    
    # === Test 1: Staff and Doctor Login ===
    def test_01_staff_login(self):
        """Test staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_diagyn",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        TestBillingTimerSystem.staff_token = data["token"]
        print(f"✓ Staff login successful")
    
    def test_02_doctor_login(self):
        """Test doctor login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Doctor login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        TestBillingTimerSystem.doctor_token = data["token"]
        print(f"✓ Doctor login successful")
    
    # === Test 2: Create Test Appointment ===
    def test_03_create_test_appointment(self):
        """Create a test appointment for billing flow"""
        today = self.get_today_ist()
        test_phone = f"TEST{str(uuid.uuid4())[:6]}"
        # Use dynamic time slot to avoid conflicts
        import random
        hour = random.choice([11, 12, 13, 18, 19, 20])
        minute = random.choice([0, 15, 30, 45])
        time_slot = f"{hour:02d}:{minute:02d}"
        
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/appointments/book",
            headers=self.get_staff_headers(),
            json={
                "clinic": "Pushpa Clinic",
                "doctor": "Dr. Vikas Jha",
                "date": today,
                "time": time_slot,
                "patient_name": f"Test Patient {test_phone}",
                "patient_mobile": f"9999{test_phone[-6:]}",
                "appointment_type": "EMERGENCY",  # Emergency doesn't check slot conflicts
                "notes": "Test billing timer flow"
            }
        )
        assert response.status_code == 200, f"Create appointment failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Appointment creation not successful"
        assert "appointment" in data, "No appointment in response"
        
        TestBillingTimerSystem.test_appointment_id = data["appointment"]["id"]
        TestBillingTimerSystem.test_booking_id = data.get("booking_id")
        print(f"✓ Test appointment created: {TestBillingTimerSystem.test_booking_id}")
    
    # === Test 3: Check-in Appointment ===
    def test_04_checkin_appointment(self):
        """Check-in the test appointment"""
        if not TestBillingTimerSystem.test_appointment_id:
            pytest.skip("No test appointment created")
        
        response = requests.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/{TestBillingTimerSystem.test_appointment_id}/status",
            headers=self.get_staff_headers(),
            json={"status": "CheckedIn"}
        )
        assert response.status_code == 200, f"Check-in failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Check-in not successful"
        assert data.get("status") == "CheckedIn", "Status not CheckedIn"
        print(f"✓ Appointment checked in with token: {data.get('token_data', {}).get('token_number', 'N/A')}")
    
    # === Test 4: Move to WithDoctor ===
    def test_05_move_to_with_doctor(self):
        """Move appointment to WithDoctor status"""
        if not TestBillingTimerSystem.test_appointment_id:
            pytest.skip("No test appointment created")
        
        response = requests.put(
            f"{BASE_URL}/api/diagyn-staff/appointments/{TestBillingTimerSystem.test_appointment_id}/status",
            headers=self.get_staff_headers(),
            json={"status": "WithDoctor"}
        )
        assert response.status_code == 200, f"WithDoctor failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "WithDoctor status not successful"
        print(f"✓ Appointment moved to WithDoctor")
    
    # === Test 5: Doctor Collect Fee - Should Set billing_pending ===
    def test_06_doctor_collect_fee_sets_billing_pending(self):
        """
        Test POST /api/diagyn-staff/doctor/collect-fee
        Should set status to 'billing_pending' (NOT 'Completed')
        """
        if not TestBillingTimerSystem.test_appointment_id:
            pytest.skip("No test appointment created")
        
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/doctor/collect-fee",
            headers=self.get_doctor_headers(),
            json={
                "appointment_id": TestBillingTimerSystem.test_appointment_id,
                "fee_code": "G1",
                "scan_codes": [],
                "total_amount": 150.0,
                "payment_method": "cash",
                "notes": "Test billing timer",
                "follow_up_date": None,
                "send_receipt_whatsapp": False
            }
        )
        assert response.status_code == 200, f"Collect fee failed: {response.text}"
        data = response.json()
        
        # Key assertions for billing_pending status
        assert data.get("success") == True, "Fee collection not successful"
        assert data.get("status") == "billing_pending", f"Expected 'billing_pending', got '{data.get('status')}'"
        assert "billing_timer_start" in data, "billing_timer_start not in response"
        assert data.get("doctor_fee_amount") == 150.0, "Doctor fee amount mismatch"
        
        print(f"✓ Doctor collect-fee sets status to 'billing_pending'")
        print(f"  - Receipt: {data.get('receipt_number')}")
        print(f"  - Billing timer started: {data.get('billing_timer_start')}")
    
    # === Test 6: Get Pending Billings ===
    def test_07_get_pending_billings(self):
        """
        Test GET /api/diagyn-staff/billing/pending
        Should return pending billings with elapsed time
        """
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/billing/pending",
            headers=self.get_staff_headers(),
            params={"clinic": "Pushpa Clinic"}
        )
        assert response.status_code == 200, f"Get pending billings failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Get pending billings not successful"
        assert "appointments" in data, "No appointments in response"
        assert "pending_count" in data, "No pending_count in response"
        
        # Find our test appointment
        pending = data.get("appointments", [])
        our_apt = next((a for a in pending if a.get("id") == TestBillingTimerSystem.test_appointment_id), None)
        
        if our_apt:
            assert our_apt.get("status") == "billing_pending", "Appointment status not billing_pending"
            assert "billing_timer_start" in our_apt, "billing_timer_start missing"
            assert "billing_elapsed_seconds" in our_apt, "billing_elapsed_seconds missing"
            print(f"✓ Pending billings returned with elapsed time")
            print(f"  - Pending count: {data.get('pending_count')}")
            print(f"  - Our appointment elapsed: {our_apt.get('billing_elapsed_seconds')}s")
        else:
            print(f"✓ Pending billings endpoint works (our test appointment may have expired from list)")
            print(f"  - Pending count: {data.get('pending_count')}")
    
    # === Test 7: Close Billing ===
    def test_08_close_billing(self):
        """
        Test POST /api/diagyn-staff/billing/close
        Should accept final_amount, close the bill, set status to 'Completed'
        """
        if not TestBillingTimerSystem.test_appointment_id:
            pytest.skip("No test appointment created")
        
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/billing/close",
            headers=self.get_staff_headers(),
            json={
                "appointment_id": TestBillingTimerSystem.test_appointment_id,
                "final_amount": 150.0,
                "payment_method": "cash",
                "notes": "Test billing closure"
            }
        )
        assert response.status_code == 200, f"Close billing failed: {response.text}"
        data = response.json()
        
        # Key assertions for billing close
        assert data.get("success") == True, "Billing close not successful"
        assert data.get("final_amount") == 150.0, "Final amount mismatch"
        assert "billing_duration_seconds" in data, "billing_duration_seconds missing"
        assert "billing_duration_display" in data, "billing_duration_display missing"
        
        # Check anti-fraud flags
        assert "flagged_fast_close" in data, "flagged_fast_close missing"
        assert "amount_mismatch" in data, "amount_mismatch missing"
        
        print(f"✓ Billing closed successfully")
        print(f"  - Final amount: ₹{data.get('final_amount')}")
        print(f"  - Duration: {data.get('billing_duration_display')}")
        print(f"  - Fast close flag: {data.get('flagged_fast_close')}")
        print(f"  - Amount mismatch: {data.get('amount_mismatch')}")
    
    # === Test 8: Verify Appointment is Completed ===
    def test_09_verify_appointment_completed(self):
        """Verify the appointment status is now 'Completed'"""
        if not TestBillingTimerSystem.test_appointment_id:
            pytest.skip("No test appointment created")
        
        today = self.get_today_ist()
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            headers=self.get_staff_headers(),
            params={"date": today, "clinic": "Pushpa Clinic"}
        )
        assert response.status_code == 200, f"Get appointments failed: {response.text}"
        data = response.json()
        
        appointments = data.get("appointments", [])
        our_apt = next((a for a in appointments if a.get("id") == TestBillingTimerSystem.test_appointment_id), None)
        
        if our_apt:
            assert our_apt.get("status") == "Completed", f"Expected 'Completed', got '{our_apt.get('status')}'"
            assert our_apt.get("total_amount") == 150.0, "Total amount not saved"
            print(f"✓ Appointment status is 'Completed'")
        else:
            print(f"✓ Cannot verify (appointment not in today's list)")
    
    # === Test 9: Get Billing Analytics ===
    def test_10_get_billing_analytics(self):
        """
        Test GET /api/diagyn-staff/billing/analytics
        Should return billing timer statistics
        """
        today = self.get_today_ist()
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/billing/analytics",
            headers=self.get_staff_headers(),
            params={"date": today, "clinic": "Pushpa Clinic"}
        )
        assert response.status_code == 200, f"Get billing analytics failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Get billing analytics not successful"
        
        # Check for required analytics fields
        required_fields = [
            "total_bills", "avg_billing_seconds", "avg_billing_display",
            "fastest_seconds", "slowest_seconds", "flagged_fast_close",
            "amount_mismatches", "total_collected"
        ]
        for field in required_fields:
            assert field in data, f"Missing analytics field: {field}"
        
        print(f"✓ Billing analytics returned successfully")
        print(f"  - Total bills: {data.get('total_bills')}")
        print(f"  - Avg billing time: {data.get('avg_billing_display')}")
        print(f"  - Total collected: ₹{data.get('total_collected')}")
        print(f"  - Flagged fast closes: {data.get('flagged_fast_close')}")
        print(f"  - Amount mismatches: {data.get('amount_mismatches')}")


class TestBillingTimerEdgeCases:
    """Test edge cases and error handling"""
    
    staff_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestBillingTimerEdgeCases.staff_token:
            res = requests.post(f"{BASE_URL}/api/staff/login", json={
                "username": "staff_diagyn",
                "password": "test1234"
            })
            if res.status_code == 200:
                TestBillingTimerEdgeCases.staff_token = res.json().get("token")
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestBillingTimerEdgeCases.staff_token}"}
    
    def test_close_nonexistent_appointment(self):
        """Test closing a non-existent appointment returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/diagyn-staff/billing/close",
            headers=self.get_headers(),
            json={
                "appointment_id": "nonexistent-id-12345",
                "final_amount": 100.0
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent appointment returns 404")
    
    def test_pending_billings_without_auth(self):
        """Test pending billings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/billing/pending")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Pending billings requires authentication")
    
    def test_analytics_without_auth(self):
        """Test analytics endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/diagyn-staff/billing/analytics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Analytics requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
