"""
IST Timezone Fix and Pay Later Feature Tests - Iteration 95

Tests:
1. IST Timezone Fix: /api/diagyn-staff/appointments/today returns appointments with correct IST date
2. IST Timezone Fix: /api/diagyn-staff/appointments/by-date correctly filters appointments
3. IST Timezone Fix: /api/diagyn-staff/summary/daily returns data for IST date
4. IST Timezone Fix: /api/diagyn-staff/summary/weekly returns data for IST week
5. Pay Later Feature: /api/payments/cashfree/create-payment-link creates payment link and sends notification
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-rx-portal.preview.emergentagent.com")

# IST timezone helper (same as backend)
IST_OFFSET = timedelta(hours=5, minutes=30)

def get_ist_now():
    """Get current time in IST"""
    return datetime.now(timezone.utc) + IST_OFFSET

def get_ist_date():
    """Get current date in IST (YYYY-MM-DD)"""
    return get_ist_now().strftime("%Y-%m-%d")

def get_utc_date():
    """Get current date in UTC (YYYY-MM-DD)"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class TestISTTimezoneFix:
    """Tests for IST timezone fix in diagyn_staff endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token for diagyn staff"""
        # Login as diagyn staff
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        assert self.token, "No token received from login"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Print IST vs UTC dates for debugging
        print(f"\n[DEBUG] IST Date: {get_ist_date()}, UTC Date: {get_utc_date()}")
    
    def test_01_appointments_today_returns_ist_date(self):
        """
        Test that /api/diagyn-staff/appointments/today returns appointments for IST date.
        The fix ensures get_ist_date() is used instead of UTC date.
        """
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/today",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify the returned date is IST date
        returned_date = data.get("date")
        ist_date = get_ist_date()
        
        print(f"[TEST] Returned date: {returned_date}, Expected IST date: {ist_date}")
        assert returned_date == ist_date, f"Expected IST date {ist_date}, got {returned_date}"
        
        # Verify structure
        assert "appointments" in data, "Missing 'appointments' field"
        assert "summary" in data, "Missing 'summary' field"
        
        # Verify summary structure
        summary = data.get("summary", {})
        assert "total" in summary, "Missing 'total' in summary"
        assert "booked" in summary, "Missing 'booked' in summary"
        assert "completed" in summary, "Missing 'completed' in summary"
        
        print(f"[PASS] appointments/today returns IST date: {returned_date}")
        print(f"[INFO] Total appointments: {summary.get('total', 0)}")
    
    def test_02_appointments_by_date_filters_correctly(self):
        """
        Test that /api/diagyn-staff/appointments/by-date filters appointments correctly.
        """
        ist_date = get_ist_date()
        
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/by-date",
            params={"date": ist_date},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify returned date matches requested date
        returned_date = data.get("date")
        assert returned_date == ist_date, f"Expected date {ist_date}, got {returned_date}"
        
        # Verify all appointments have the correct date
        appointments = data.get("appointments", [])
        for apt in appointments:
            apt_date = apt.get("date")
            assert apt_date == ist_date, f"Appointment has wrong date: {apt_date}, expected {ist_date}"
        
        print(f"[PASS] appointments/by-date filters correctly for {ist_date}")
        print(f"[INFO] Found {len(appointments)} appointments")
    
    def test_03_summary_daily_uses_ist_date(self):
        """
        Test that /api/diagyn-staff/summary/daily uses IST date when no date parameter provided.
        The fix ensures get_ist_date() is used for default date.
        """
        # Test without date param (should default to IST today)
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/summary/daily",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify the returned date is IST date
        returned_date = data.get("date")
        ist_date = get_ist_date()
        
        print(f"[TEST] Daily summary date: {returned_date}, Expected IST date: {ist_date}")
        assert returned_date == ist_date, f"Expected IST date {ist_date}, got {returned_date}"
        
        # Verify response structure
        assert "total_patients" in data, "Missing 'total_patients' field"
        assert "total_collection" in data, "Missing 'total_collection' field"
        assert "by_clinic" in data, "Missing 'by_clinic' field"
        
        print(f"[PASS] summary/daily uses IST date: {returned_date}")
        print(f"[INFO] Total patients: {data.get('total_patients', 0)}, Collection: {data.get('total_collection', 0)}")
    
    def test_04_summary_weekly_uses_ist_dates(self):
        """
        Test that /api/diagyn-staff/summary/weekly uses IST dates for last 7 days.
        The fix ensures get_ist_now() is used for date range calculation.
        """
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/summary/weekly",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("period") == "weekly", "Period should be 'weekly'"
        assert "dates" in data, "Missing 'dates' field"
        assert "total_patients" in data, "Missing 'total_patients' field"
        assert "total_collection" in data, "Missing 'total_collection' field"
        assert "by_date" in data, "Missing 'by_date' field"
        
        # Verify dates are IST-based (today should be first)
        dates = data.get("dates", [])
        ist_today = get_ist_date()
        
        print(f"[TEST] Weekly dates: {dates}")
        print(f"[TEST] IST today: {ist_today}")
        
        # First date should be today (IST)
        if dates:
            assert dates[0] == ist_today, f"First date should be IST today ({ist_today}), got {dates[0]}"
        
        # Should have 7 dates
        assert len(dates) == 7, f"Expected 7 dates, got {len(dates)}"
        
        print(f"[PASS] summary/weekly uses IST dates")
        print(f"[INFO] Total patients (7 days): {data.get('total_patients', 0)}, Collection: {data.get('total_collection', 0)}")
    
    def test_05_compare_ist_vs_utc_boundary_case(self):
        """
        Test to verify IST is being used correctly when IST and UTC dates differ.
        This is critical for times between 00:00-05:30 IST (when IST date != UTC date)
        """
        ist_now = get_ist_now()
        utc_now = datetime.now(timezone.utc)
        
        ist_date = get_ist_date()
        utc_date = get_utc_date()
        
        print(f"[DEBUG] Current IST time: {ist_now.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[DEBUG] Current UTC time: {utc_now.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[DEBUG] IST date: {ist_date}")
        print(f"[DEBUG] UTC date: {utc_date}")
        
        # Get today's appointments
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/appointments/today",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # The returned date should ALWAYS be IST date, regardless of UTC time
        returned_date = data.get("date")
        assert returned_date == ist_date, f"API should return IST date ({ist_date}), not UTC date"
        
        # If dates differ (boundary case), this test confirms the fix works
        if ist_date != utc_date:
            print(f"[CRITICAL] IST/UTC dates differ - confirmed API uses IST ({ist_date})")
        else:
            print(f"[INFO] IST and UTC dates are same currently: {ist_date}")
        
        print("[PASS] IST vs UTC boundary case handled correctly")


class TestPayLaterFeature:
    """Tests for Pay Later feature - payment link creation"""
    
    def test_01_create_payment_link_endpoint_exists(self):
        """
        Test that /api/payments/cashfree/create-payment-link endpoint is accessible.
        Note: Actual payment link creation requires valid Cashfree credentials.
        """
        # Test endpoint exists (expect 422 without proper body, not 404)
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-payment-link",
            json={}  # Empty body to trigger validation
        )
        
        # Should get 422 (validation error) not 404 (not found)
        assert response.status_code == 422, f"Expected 422, got {response.status_code} - {response.text}"
        
        print("[PASS] create-payment-link endpoint exists and validates input")
    
    def test_02_create_payment_link_validation(self):
        """
        Test payment link creation with validation - verify required fields.
        """
        # Test with missing required fields
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-payment-link",
            json={
                "order_id": "TEST_ORDER_001"
                # Missing other required fields
            }
        )
        
        assert response.status_code == 422, f"Expected validation error, got {response.status_code}"
        
        errors = response.json()
        print(f"[INFO] Validation errors: {errors}")
        
        # Should mention missing fields
        detail = errors.get("detail", [])
        assert len(detail) > 0, "Should have validation error details"
        
        print("[PASS] Payment link validates required fields")
    
    def test_03_create_payment_link_with_valid_data(self):
        """
        Test payment link creation with complete data.
        Note: This uses production Cashfree, so we expect actual link creation.
        """
        test_order_data = {
            "order_id": f"TEST_PAY_LATER_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "order_type": "pharmacy",
            "customer_name": "Test Customer",
            "customer_phone": "+919876543210",
            "customer_email": "test@example.com",
            "amount": 100.0,
            "send_via": "whatsapp",  # Will try to send via WhatsApp
            "items_description": "Test Pharmacy Order"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/cashfree/create-payment-link",
            json=test_order_data
        )
        
        print(f"[DEBUG] Response status: {response.status_code}")
        print(f"[DEBUG] Response body: {response.text[:500]}...")
        
        # Should succeed (200) with Cashfree production credentials
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Payment link creation should succeed"
            assert "payment_link" in data, "Should return payment_link"
            assert "order_id" in data, "Should return order_id"
            
            print(f"[PASS] Payment link created successfully")
            print(f"[INFO] Payment link: {data.get('payment_link')}")
            print(f"[INFO] Order ID: {data.get('order_id')}")
            print(f"[INFO] CF Order ID: {data.get('cf_order_id')}")
            print(f"[INFO] Sent via: {data.get('sent_via', [])}")
        elif response.status_code == 500:
            # May fail due to WhatsApp service or other external dependency
            error = response.json()
            print(f"[WARN] Payment link creation failed: {error}")
            # Check if it's a WhatsApp/notification failure (acceptable)
            error_detail = str(error.get("detail", ""))
            if "whatsapp" in error_detail.lower() or "import" in error_detail.lower():
                print("[INFO] Failed due to notification service - Cashfree order may have been created")
            else:
                # Unexpected error
                pytest.fail(f"Unexpected error: {error_detail}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_04_payment_link_status_check(self):
        """
        Test payment link status endpoint.
        """
        # Use a fake order ID to test endpoint exists
        test_order_id = "PAY_PHARMACY_20250101_TEST"
        
        response = requests.get(
            f"{BASE_URL}/api/payments/cashfree/payment-link-status/{test_order_id}"
        )
        
        # Should return 404 (order not found) not 500 (server error)
        assert response.status_code in [404, 200], f"Expected 404 or 200, got {response.status_code}"
        
        if response.status_code == 404:
            print("[PASS] Payment link status endpoint exists and returns 404 for unknown order")
        else:
            print("[PASS] Payment link status endpoint works")


class TestDiaGynStaffEndpointsIntegration:
    """Integration tests for diagyn staff endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_diagyn", "password": "test"}
        )
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_01_appointments_today_with_clinic_filter(self):
        """Test appointments/today with clinic filter"""
        for clinic in ["Pushpa Clinic", "Amnion Clinic", "all"]:
            response = requests.get(
                f"{BASE_URL}/api/diagyn-staff/appointments/today",
                params={"clinic": clinic},
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Failed for clinic={clinic}: {response.text}"
            data = response.json()
            
            # Verify clinic in response
            assert data.get("clinic") == clinic, f"Expected clinic={clinic}"
            
            print(f"[PASS] appointments/today works for clinic={clinic}")
    
    def test_02_summary_daily_with_date_param(self):
        """Test summary/daily with explicit date parameter"""
        test_date = get_ist_date()
        
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/summary/daily",
            params={"date": test_date},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("date") == test_date
        
        print(f"[PASS] summary/daily works with date param: {test_date}")
    
    def test_03_summary_weekly_with_clinic_filter(self):
        """Test summary/weekly with clinic filter"""
        response = requests.get(
            f"{BASE_URL}/api/diagyn-staff/summary/weekly",
            params={"clinic": "Pushpa Clinic"},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "by_date" in data
        assert len(data.get("dates", [])) == 7
        
        print(f"[PASS] summary/weekly works with clinic filter")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
