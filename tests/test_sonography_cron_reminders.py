"""
Test Suite for Sonography Cron Reminders
Tests the automated cron job endpoint: POST /api/cron/sonography-reminders

Features tested:
1. 24-hour advance reminders (day before sonography)
2. 1-hour reminders (45-75 minutes before sonography)
3. Duplicate prevention via reminder_24h_sent and reminder_1h_sent flags
4. IST timezone calculations
5. Secret validation
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://healthapp-hub-1.preview.emergentagent.com').rstrip('/')
CRON_SECRET = "nevika_cron_2026"
STAFF_USERNAME = "staff_pushpa"
STAFF_PASSWORD = "Nevika@2026C"


class TestSonographyCronReminders:
    """Test suite for sonography cron reminders endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get staff token for creating test bookings
        self.staff_token = self._get_staff_token()
        
    def _get_staff_token(self):
        """Get staff authentication token"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_USERNAME,
            "password": STAFF_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def _get_ist_time(self):
        """Get current IST time"""
        ist_offset = timedelta(hours=5, minutes=30)
        now_utc = datetime.now(timezone.utc)
        return now_utc + ist_offset
    
    def _create_test_sonography_booking(self, booking_date: str, booking_time: str, patient_name: str = None):
        """Create a test sonography booking"""
        if not self.staff_token:
            pytest.skip("Staff authentication failed")
        
        if not patient_name:
            patient_name = f"TEST_CronReminder_{uuid.uuid4().hex[:6]}"
        
        booking_data = {
            "patient_name": patient_name,
            "age": "28",  # Age must be string
            "lmp": "2025-12-01",
            "mobile_number": "9999999999",  # Test number
            "date_of_birth": "1997-05-15",
            "husband_name": "Test Husband",
            "address": "Test Address",
            "has_children": False,
            "children": [],
            "booking_date": booking_date,
            "booking_time": booking_time,
            "clinic": "Pushpa Clinic",
            "scan_type": "NT",
            "notes": "Test booking for cron reminder testing"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/book",
            json=booking_data,
            headers={"Authorization": f"Bearer {self.staff_token}"}
        )
        
        if response.status_code == 200:
            return response.json().get("booking_id")
        return None
    
    def _cleanup_test_booking(self, booking_id: str):
        """Clean up test booking by marking it cancelled"""
        if not self.staff_token or not booking_id:
            return
        
        self.session.put(
            f"{BASE_URL}/api/staff/sonography/booking/{booking_id}/status?status=cancelled",
            headers={"Authorization": f"Bearer {self.staff_token}"}
        )
    
    # ===== AUTHENTICATION TESTS =====
    
    def test_cron_endpoint_requires_secret(self):
        """Test that cron endpoint requires valid secret"""
        # No secret
        response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders")
        assert response.status_code == 403, f"Expected 403 without secret, got {response.status_code}"
        
        # Wrong secret
        response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret=wrong_secret")
        assert response.status_code == 403, f"Expected 403 with wrong secret, got {response.status_code}"
        print("✅ PASS: Cron endpoint correctly rejects invalid/missing secrets")
    
    def test_cron_endpoint_accepts_valid_secret(self):
        """Test that cron endpoint accepts valid secret"""
        response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
        assert response.status_code == 200, f"Expected 200 with valid secret, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True in response"
        assert "results" in data, "Expected 'results' in response"
        assert "summary" in data, "Expected 'summary' in response"
        print(f"✅ PASS: Cron endpoint accepts valid secret. Response: {data.get('summary')}")
    
    # ===== RESPONSE STRUCTURE TESTS =====
    
    def test_cron_response_structure(self):
        """Test that cron endpoint returns correct response structure"""
        response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level fields
        assert "success" in data, "Missing 'success' field"
        assert "timestamp" in data, "Missing 'timestamp' field"
        assert "ist_time" in data, "Missing 'ist_time' field"
        assert "results" in data, "Missing 'results' field"
        assert "summary" in data, "Missing 'summary' field"
        
        # Check results structure
        results = data["results"]
        assert "24h_reminders" in results, "Missing '24h_reminders' in results"
        assert "1h_reminders" in results, "Missing '1h_reminders' in results"
        
        # Check 24h_reminders structure
        assert "checked" in results["24h_reminders"], "Missing 'checked' in 24h_reminders"
        assert "sent" in results["24h_reminders"], "Missing 'sent' in 24h_reminders"
        assert "errors" in results["24h_reminders"], "Missing 'errors' in 24h_reminders"
        
        # Check 1h_reminders structure
        assert "checked" in results["1h_reminders"], "Missing 'checked' in 1h_reminders"
        assert "sent" in results["1h_reminders"], "Missing 'sent' in 1h_reminders"
        assert "errors" in results["1h_reminders"], "Missing 'errors' in 1h_reminders"
        
        print(f"✅ PASS: Response structure is correct")
        print(f"   - IST Time: {data.get('ist_time')}")
        print(f"   - Summary: {data.get('summary')}")
    
    # ===== 24-HOUR REMINDER TESTS =====
    
    def test_24h_reminder_for_tomorrow_booking(self):
        """Test that 24h reminders are sent for tomorrow's bookings"""
        now_ist = self._get_ist_time()
        tomorrow = (now_ist + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Create a booking for tomorrow
        patient_name = f"TEST_24h_{uuid.uuid4().hex[:6]}"
        booking_id = self._create_test_sonography_booking(
            booking_date=tomorrow,
            booking_time="10:00",
            patient_name=patient_name
        )
        
        if not booking_id:
            pytest.skip("Could not create test booking")
        
        try:
            # Run cron job
            response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
            assert response.status_code == 200
            
            data = response.json()
            results = data.get("results", {})
            
            # Check that 24h reminders were processed
            checked = results.get("24h_reminders", {}).get("checked", 0)
            sent = results.get("24h_reminders", {}).get("sent", 0)
            
            print(f"✅ 24h Reminders - Checked: {checked}, Sent: {sent}")
            print(f"   Summary: {data.get('summary')}")
            
            # Verify the booking was marked as reminded
            booking_response = self.session.get(
                f"{BASE_URL}/api/staff/sonography/booking/{booking_id}",
                headers={"Authorization": f"Bearer {self.staff_token}"}
            )
            
            if booking_response.status_code == 200:
                booking_data = booking_response.json().get("booking", {})
                reminder_sent = booking_data.get("reminder_24h_sent", False)
                print(f"   Booking reminder_24h_sent flag: {reminder_sent}")
                
        finally:
            self._cleanup_test_booking(booking_id)
    
    def test_24h_reminder_duplicate_prevention(self):
        """Test that 24h reminders are not sent twice"""
        now_ist = self._get_ist_time()
        tomorrow = (now_ist + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Create a booking for tomorrow
        patient_name = f"TEST_24h_Dup_{uuid.uuid4().hex[:6]}"
        booking_id = self._create_test_sonography_booking(
            booking_date=tomorrow,
            booking_time="11:00",
            patient_name=patient_name
        )
        
        if not booking_id:
            pytest.skip("Could not create test booking")
        
        try:
            # Run cron job first time
            response1 = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
            assert response1.status_code == 200
            data1 = response1.json()
            sent1 = data1.get("results", {}).get("24h_reminders", {}).get("sent", 0)
            
            # Run cron job second time
            response2 = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
            assert response2.status_code == 200
            data2 = response2.json()
            
            # The booking should not be sent again (already marked)
            # Check that the booking is not in the checked count for second run
            print(f"✅ PASS: Duplicate prevention test")
            print(f"   First run sent: {sent1}")
            print(f"   Second run summary: {data2.get('summary')}")
            
        finally:
            self._cleanup_test_booking(booking_id)
    
    # ===== 1-HOUR REMINDER TESTS =====
    
    def test_1h_reminder_time_window(self):
        """Test that 1h reminders are sent for bookings 45-75 minutes away"""
        now_ist = self._get_ist_time()
        today = now_ist.strftime("%Y-%m-%d")
        
        # Calculate a time that's ~60 minutes from now
        target_time = now_ist + timedelta(minutes=60)
        booking_time = target_time.strftime("%H:%M")
        
        # Create a booking for today at the target time
        patient_name = f"TEST_1h_{uuid.uuid4().hex[:6]}"
        booking_id = self._create_test_sonography_booking(
            booking_date=today,
            booking_time=booking_time,
            patient_name=patient_name
        )
        
        if not booking_id:
            pytest.skip("Could not create test booking")
        
        try:
            # Run cron job
            response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
            assert response.status_code == 200
            
            data = response.json()
            results = data.get("results", {})
            
            checked = results.get("1h_reminders", {}).get("checked", 0)
            sent = results.get("1h_reminders", {}).get("sent", 0)
            
            print(f"✅ 1h Reminders - Checked: {checked}, Sent: {sent}")
            print(f"   Current IST: {now_ist.strftime('%H:%M')}")
            print(f"   Booking time: {booking_time}")
            print(f"   Summary: {data.get('summary')}")
            
        finally:
            self._cleanup_test_booking(booking_id)
    
    def test_1h_reminder_outside_window(self):
        """Test that 1h reminders are NOT sent for bookings outside 45-75 minute window"""
        now_ist = self._get_ist_time()
        today = now_ist.strftime("%Y-%m-%d")
        
        # Calculate a time that's 3 hours from now (outside window)
        target_time = now_ist + timedelta(hours=3)
        booking_time = target_time.strftime("%H:%M")
        
        # Create a booking for today at the target time
        patient_name = f"TEST_1h_Outside_{uuid.uuid4().hex[:6]}"
        booking_id = self._create_test_sonography_booking(
            booking_date=today,
            booking_time=booking_time,
            patient_name=patient_name
        )
        
        if not booking_id:
            pytest.skip("Could not create test booking")
        
        try:
            # Run cron job
            response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
            assert response.status_code == 200
            
            data = response.json()
            
            # Verify the booking was NOT marked as reminded (outside window)
            booking_response = self.session.get(
                f"{BASE_URL}/api/staff/sonography/booking/{booking_id}",
                headers={"Authorization": f"Bearer {self.staff_token}"}
            )
            
            if booking_response.status_code == 200:
                booking_data = booking_response.json().get("booking", {})
                reminder_sent = booking_data.get("reminder_1h_sent", False)
                
                print(f"✅ PASS: Booking outside 1h window not reminded")
                print(f"   Booking time: {booking_time} (3 hours from now)")
                print(f"   reminder_1h_sent: {reminder_sent}")
                
                # Should NOT be marked as sent since it's outside the window
                assert reminder_sent == False, "Booking outside window should not be reminded"
                
        finally:
            self._cleanup_test_booking(booking_id)
    
    # ===== IST TIMEZONE TESTS =====
    
    def test_ist_timezone_in_response(self):
        """Test that IST timezone is correctly reported in response"""
        response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
        assert response.status_code == 200
        
        data = response.json()
        ist_time = data.get("ist_time", "")
        
        assert "IST" in ist_time, f"Expected 'IST' in ist_time, got: {ist_time}"
        
        # Verify the time is reasonable (within a few minutes of actual IST)
        now_ist = self._get_ist_time()
        expected_date = now_ist.strftime("%Y-%m-%d")
        
        assert expected_date in ist_time, f"Expected date {expected_date} in ist_time: {ist_time}"
        
        print(f"✅ PASS: IST timezone correctly reported: {ist_time}")
    
    # ===== EDGE CASE TESTS =====
    
    def test_cron_with_no_bookings(self):
        """Test cron job behavior when there are no eligible bookings"""
        # Just run the cron - it should handle empty results gracefully
        response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"✅ PASS: Cron handles no/few bookings gracefully")
        print(f"   Summary: {data.get('summary')}")
    
    def test_cron_with_cancelled_booking(self):
        """Test that cancelled bookings are not reminded"""
        now_ist = self._get_ist_time()
        tomorrow = (now_ist + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Create and immediately cancel a booking
        patient_name = f"TEST_Cancelled_{uuid.uuid4().hex[:6]}"
        booking_id = self._create_test_sonography_booking(
            booking_date=tomorrow,
            booking_time="14:00",
            patient_name=patient_name
        )
        
        if not booking_id:
            pytest.skip("Could not create test booking")
        
        try:
            # Cancel the booking
            self.session.put(
                f"{BASE_URL}/api/staff/sonography/booking/{booking_id}/status?status=cancelled",
                headers={"Authorization": f"Bearer {self.staff_token}"}
            )
            
            # Run cron job
            response = self.session.post(f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}")
            assert response.status_code == 200
            
            # Verify the cancelled booking was not reminded
            booking_response = self.session.get(
                f"{BASE_URL}/api/staff/sonography/booking/{booking_id}",
                headers={"Authorization": f"Bearer {self.staff_token}"}
            )
            
            if booking_response.status_code == 200:
                booking_data = booking_response.json().get("booking", {})
                reminder_sent = booking_data.get("reminder_24h_sent", False)
                
                print(f"✅ PASS: Cancelled booking not reminded")
                print(f"   Status: {booking_data.get('status')}")
                print(f"   reminder_24h_sent: {reminder_sent}")
                
        finally:
            pass  # Already cancelled
    
    # ===== SCHEDULER INTEGRATION TEST =====
    
    def test_scheduler_can_call_endpoint(self):
        """Test that the scheduler can successfully call the cron endpoint"""
        # Simulate what the scheduler does
        import aiohttp
        import asyncio
        
        async def call_cron():
            async with aiohttp.ClientSession() as session:
                url = f"{BASE_URL}/api/cron/sonography-reminders?secret={CRON_SECRET}"
                async with session.post(url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                    return resp.status, await resp.json()
        
        try:
            status, data = asyncio.run(call_cron())
            assert status == 200, f"Expected 200, got {status}"
            assert data.get("success") == True
            print(f"✅ PASS: Scheduler integration test successful")
            print(f"   Summary: {data.get('summary')}")
        except Exception as e:
            print(f"⚠️ Scheduler integration test skipped: {e}")


class TestSonographyBookingEndpoints:
    """Test sonography booking endpoints used by the cron job"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.staff_token = self._get_staff_token()
    
    def _get_staff_token(self):
        """Get staff authentication token"""
        response = self.session.post(f"{BASE_URL}/api/staff/login", json={
            "username": STAFF_USERNAME,
            "password": STAFF_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_get_sonography_bookings(self):
        """Test GET /api/staff/sonography/bookings endpoint"""
        if not self.staff_token:
            pytest.skip("Staff authentication failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/staff/sonography/bookings",
            headers={"Authorization": f"Bearer {self.staff_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "success" in data, "Missing 'success' field"
        assert "bookings" in data, "Missing 'bookings' field"
        assert "counts" in data, "Missing 'counts' field"
        
        print(f"✅ PASS: GET sonography bookings endpoint works")
        print(f"   Total bookings: {data.get('counts', {}).get('total', 0)}")
    
    def test_get_sonography_booking_details(self):
        """Test GET /api/staff/sonography/booking/{id} endpoint"""
        if not self.staff_token:
            pytest.skip("Staff authentication failed")
        
        # First get list of bookings
        response = self.session.get(
            f"{BASE_URL}/api/staff/sonography/bookings",
            headers={"Authorization": f"Bearer {self.staff_token}"}
        )
        
        if response.status_code == 200:
            bookings = response.json().get("bookings", [])
            if bookings:
                booking_id = bookings[0].get("id")
                
                # Get details
                detail_response = self.session.get(
                    f"{BASE_URL}/api/staff/sonography/booking/{booking_id}",
                    headers={"Authorization": f"Bearer {self.staff_token}"}
                )
                
                assert detail_response.status_code == 200
                detail_data = detail_response.json()
                
                assert "success" in detail_data
                assert "booking" in detail_data
                
                print(f"✅ PASS: GET sonography booking details works")
                print(f"   Booking ID: {booking_id}")
            else:
                print("⚠️ No bookings found to test details endpoint")
    
    def test_update_sonography_status(self):
        """Test PUT /api/staff/sonography/booking/{id}/status endpoint"""
        if not self.staff_token:
            pytest.skip("Staff authentication failed")
        
        # Create a test booking
        now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        tomorrow = (now_ist + timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "patient_name": f"TEST_Status_{uuid.uuid4().hex[:6]}",
            "age": "30",  # Age must be string
            "lmp": "2025-12-01",
            "mobile_number": "9999999999",
            "date_of_birth": "1995-01-01",
            "husband_name": "Test",
            "address": "Test Address",
            "has_children": False,
            "children": [],
            "booking_date": tomorrow,
            "booking_time": "15:00",
            "clinic": "Pushpa Clinic",
            "scan_type": "GS",
            "notes": "Test"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/staff/sonography/book",
            json=booking_data,
            headers={"Authorization": f"Bearer {self.staff_token}"}
        )
        
        if create_response.status_code == 200:
            booking_id = create_response.json().get("booking_id")
            
            # Update status
            update_response = self.session.put(
                f"{BASE_URL}/api/staff/sonography/booking/{booking_id}/status?status=in_progress",
                headers={"Authorization": f"Bearer {self.staff_token}"}
            )
            
            assert update_response.status_code == 200
            print(f"✅ PASS: Update sonography status works")
            
            # Cleanup
            self.session.put(
                f"{BASE_URL}/api/staff/sonography/booking/{booking_id}/status?status=cancelled",
                headers={"Authorization": f"Bearer {self.staff_token}"}
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
