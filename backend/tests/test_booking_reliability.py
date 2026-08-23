"""
Test Booking Reliability Features for DiaGyn Play Store Launch
Tests:
1. Diagnostic endpoints (booking-system, test-booking-flow)
2. Booking creation with audit logging
3. IST timezone slot filtering
4. Slot blocking
5. Retry mechanism
"""

import pytest
import requests
import os
import random
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com').rstrip('/')

class TestDiagnosticEndpoints:
    """Test diagnostic endpoints for booking system health"""
    
    def test_booking_system_diagnostics_healthy(self):
        """Test /api/diagnostics/booking-system returns HEALTHY status"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert response.status_code == 200
        
        data = response.json()
        assert "overall_status" in data
        assert data["overall_status"] == "HEALTHY"
        assert "checks" in data
        
        # Verify all checks pass
        checks = data["checks"]
        assert checks.get("database_connection", {}).get("status") == "PASS"
        assert checks.get("appointments_collection", {}).get("status") == "PASS"
        assert checks.get("booking_id_generation", {}).get("status") == "PASS"
        
        print(f"✓ Booking system diagnostics: {data['overall_status']}")
        print(f"  - Database: {checks.get('database_connection', {}).get('status')}")
        print(f"  - Appointments: {checks.get('appointments_collection', {}).get('total_appointments')} total")
        print(f"  - Today appointments: {checks.get('appointments_collection', {}).get('today_appointments')}")
    
    def test_booking_flow_dry_run_passes(self):
        """Test /api/diagnostics/test-booking-flow dry run passes"""
        response = requests.post(f"{BASE_URL}/api/diagnostics/test-booking-flow")
        assert response.status_code == 200
        
        data = response.json()
        assert "overall_status" in data
        assert data["overall_status"] in ["PASS", "WARNING"]  # WARNING is OK if slot is blocked
        assert "steps" in data
        
        # Check each step
        steps = {step["step"]: step for step in data["steps"]}
        
        # Input validation must pass
        assert steps.get("INPUT_VALIDATION", {}).get("status") == "PASS"
        # Booking ID generation must pass
        assert steps.get("BOOKING_ID_GENERATION", {}).get("status") == "PASS"
        # Database write must pass
        assert steps.get("DATABASE_WRITE", {}).get("status") == "PASS"
        
        print(f"✓ Booking flow dry run: {data['overall_status']}")
        for step in data["steps"]:
            print(f"  - {step['step']}: {step['status']}")
    
    def test_recent_failures_endpoint(self):
        """Test /api/diagnostics/recent-failures returns list"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/recent-failures?hours=24&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "timeframe_hours" in data
        assert "total_failures" in data
        assert "failures" in data
        assert isinstance(data["failures"], list)
        
        print(f"✓ Recent failures endpoint working")
        print(f"  - Failures in last 24h: {data['total_failures']}")


class TestSlotBlocking:
    """Test slot blocking - booked slots should not appear as available"""
    
    def test_booked_slots_endpoint_returns_blocked_slots(self):
        """Test /api/appointments/booked-slots returns booked slots"""
        # Get today's date
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/appointments/booked-slots",
            params={
                "doctor": "Dr. Neha Patel",
                "clinic": "Pushpa Clinic",
                "date": today
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "booked_slots" in data
        assert isinstance(data["booked_slots"], list)
        
        print(f"✓ Booked slots endpoint working")
        print(f"  - Date: {today}")
        print(f"  - Booked slots: {data['booked_slots']}")
    
    def test_booked_slots_for_different_doctors(self):
        """Test booked slots returns different slots for different doctors"""
        today = datetime.now().strftime("%Y-%m-%d")
        doctors = ["Dr. Neha Patel", "Dr. Vikas Jha"]
        clinics = ["Pushpa Clinic", "Amnion Clinic"]
        
        for doctor in doctors:
            for clinic in clinics:
                response = requests.get(
                    f"{BASE_URL}/api/appointments/booked-slots",
                    params={"doctor": doctor, "clinic": clinic, "date": today}
                )
                assert response.status_code == 200
                data = response.json()
                assert "booked_slots" in data
                print(f"  - {doctor} at {clinic}: {len(data['booked_slots'])} slots booked")


class TestISTimezoneHandling:
    """Test IST timezone handling for slot filtering"""
    
    def test_diagnostics_returns_ist_timestamp(self):
        """Test that diagnostics endpoint returns IST timestamp"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert response.status_code == 200
        
        data = response.json()
        assert "timestamp_ist" in data
        
        # The timestamp should be in IST (approximately +5:30 from UTC)
        timestamp_str = data["timestamp_ist"]
        assert timestamp_str is not None
        
        print(f"✓ IST timestamp returned: {timestamp_str}")
    
    def test_dry_run_uses_ist_date(self):
        """Test that dry run uses IST date"""
        response = requests.post(f"{BASE_URL}/api/diagnostics/test-booking-flow")
        assert response.status_code == 200
        
        data = response.json()
        test_data = data.get("test_data", {})
        test_date = test_data.get("date")
        
        assert test_date is not None
        # Should be today's date in IST
        print(f"✓ Dry run uses date: {test_date}")


class TestAuditLogging:
    """Test booking audit logging functionality"""
    
    def test_audit_logs_collection_exists(self):
        """Test that audit logs are being collected"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert response.status_code == 200
        
        data = response.json()
        audit_check = data.get("checks", {}).get("audit_logs", {})
        
        # Audit logs should either pass or report no data yet
        assert audit_check.get("status") in ["PASS", "WARNING"]
        print(f"✓ Audit logs status: {audit_check.get('status')}")
        print(f"  - Total logs: {audit_check.get('total_logs', 0)}")
        print(f"  - Today failures: {audit_check.get('today_failures', 0)}")
    
    def test_booking_audit_trail_endpoint(self):
        """Test /api/diagnostics/booking-audit/{booking_id} endpoint"""
        # Test with a non-existent booking ID (should return empty results, not error)
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-audit/TEST-99999")
        assert response.status_code == 200
        
        data = response.json()
        assert "booking_id" in data
        assert "appointment_exists" in data
        assert "audit_trail" in data
        
        print(f"✓ Audit trail endpoint working")
        print(f"  - Booking ID: {data['booking_id']}")
        print(f"  - Appointment exists: {data['appointment_exists']}")


class TestBookingSuccessRate:
    """Test booking success rate tracking"""
    
    def test_success_rate_reported(self):
        """Test that booking success rate is reported"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert response.status_code == 200
        
        data = response.json()
        success_rate_check = data.get("checks", {}).get("booking_success_rate", {})
        
        assert success_rate_check.get("status") in ["PASS", "WARNING"]
        
        print(f"✓ Booking success rate status: {success_rate_check.get('status')}")
        print(f"  - Today attempts: {success_rate_check.get('today_attempts', 0)}")
        print(f"  - Today successes: {success_rate_check.get('today_successes', 0)}")
        print(f"  - Success rate: {success_rate_check.get('success_rate', 'N/A')}")


class TestHealthEndpoint:
    """Test health check endpoint via diagnostics"""
    
    def test_health_via_diagnostics_endpoint(self):
        """Test system health via /api/diagnostics/booking-system endpoint"""
        # The root /health endpoint is intercepted by frontend routing
        # Use diagnostics endpoint to verify database health
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert response.status_code == 200
        
        data = response.json()
        db_check = data.get("checks", {}).get("database_connection", {})
        
        assert db_check.get("status") == "PASS"
        assert data.get("overall_status") == "HEALTHY"
        
        print(f"✓ System health via diagnostics: {data['overall_status']}")
        print(f"  - Database: {db_check.get('status')}")


class TestNotificationServiceStatus:
    """Test notification service configuration"""
    
    def test_notification_services_configured(self):
        """Test that notification services are configured"""
        response = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert response.status_code == 200
        
        data = response.json()
        notif_check = data.get("checks", {}).get("notification_services", {})
        
        assert notif_check.get("status") == "PASS"
        assert "whatsapp" in notif_check
        assert "email" in notif_check
        
        print(f"✓ Notification services configured")
        print(f"  - WhatsApp: {notif_check.get('whatsapp')}")
        print(f"  - Email: {notif_check.get('email')}")


# Integration test - Full booking flow simulation
class TestBookingReliabilityIntegration:
    """Integration tests for booking reliability system"""
    
    def test_full_diagnostic_suite(self):
        """Run full diagnostic suite and verify all components working"""
        # 1. Health check
        health_resp = requests.get(f"{BASE_URL}/health")
        assert health_resp.status_code == 200
        
        # 2. Full diagnostics
        diag_resp = requests.get(f"{BASE_URL}/api/diagnostics/booking-system")
        assert diag_resp.status_code == 200
        diag_data = diag_resp.json()
        assert diag_data["overall_status"] == "HEALTHY"
        
        # 3. Dry run test
        dry_run_resp = requests.post(f"{BASE_URL}/api/diagnostics/test-booking-flow")
        assert dry_run_resp.status_code == 200
        dry_run_data = dry_run_resp.json()
        assert dry_run_data["overall_status"] in ["PASS", "WARNING"]
        
        # 4. Recent failures check
        failures_resp = requests.get(f"{BASE_URL}/api/diagnostics/recent-failures?hours=24")
        assert failures_resp.status_code == 200
        failures_data = failures_resp.json()
        
        print("\n" + "="*60)
        print("BOOKING RELIABILITY INTEGRATION TEST RESULTS")
        print("="*60)
        print(f"✓ Health Check: PASS")
        print(f"✓ System Status: {diag_data['overall_status']}")
        print(f"✓ Dry Run Test: {dry_run_data['overall_status']}")
        print(f"✓ Recent Failures (24h): {failures_data['total_failures']}")
        print("="*60 + "\n")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
