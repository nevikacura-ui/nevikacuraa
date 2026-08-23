"""
Platform Analytics Report API Tests - Iteration 259
Tests for:
- GET /api/platform-report/stats?days=1 (daily stats)
- GET /api/platform-report/stats?days=7 (weekly stats)
- POST /api/platform-report/send?report_type=daily (trigger daily email)
- POST /api/platform-report/send?report_type=weekly (trigger weekly email)
- POST /api/platform-report/send?report_type=invalid (400 error)
- Verify stats contain non-zero values for key metrics
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPlatformReportStats:
    """Tests for GET /api/platform-report/stats endpoint"""

    def test_stats_daily_returns_200(self):
        """GET /api/platform-report/stats?days=1 returns 200"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Daily stats endpoint returned 200")

    def test_stats_daily_contains_required_fields(self):
        """Daily stats response contains all required fields"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for platform report
        required_fields = [
            "total_users", "unique_phones", "unique_emails",
            "total_otp_sent", "total_whatsapp_logs",
            "total_appointments", "appointments_booked", "appointments_completed",
            "total_diagnostic_orders", "total_pharmacy_orders",
            "total_revenue", "generated_at", "period_days"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✅ Daily stats contains all {len(required_fields)} required fields")

    def test_stats_daily_has_nonzero_users(self):
        """Daily stats shows non-zero total_users"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("total_users", 0) > 0, f"Expected non-zero total_users, got {data.get('total_users')}"
        print(f"✅ total_users = {data['total_users']} (non-zero)")

    def test_stats_daily_has_nonzero_phones(self):
        """Daily stats shows non-zero unique_phones"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("unique_phones", 0) > 0, f"Expected non-zero unique_phones, got {data.get('unique_phones')}"
        print(f"✅ unique_phones = {data['unique_phones']} (non-zero)")

    def test_stats_daily_has_nonzero_otp(self):
        """Daily stats shows non-zero total_otp_sent"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("total_otp_sent", 0) > 0, f"Expected non-zero total_otp_sent, got {data.get('total_otp_sent')}"
        print(f"✅ total_otp_sent = {data['total_otp_sent']} (non-zero)")

    def test_stats_daily_has_nonzero_appointments(self):
        """Daily stats shows non-zero total_appointments"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("total_appointments", 0) > 0, f"Expected non-zero total_appointments, got {data.get('total_appointments')}"
        print(f"✅ total_appointments = {data['total_appointments']} (non-zero)")

    def test_stats_weekly_returns_200(self):
        """GET /api/platform-report/stats?days=7 returns 200"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=7")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Weekly stats endpoint returned 200")

    def test_stats_weekly_period_days_is_7(self):
        """Weekly stats has period_days=7"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=7")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("period_days") == 7, f"Expected period_days=7, got {data.get('period_days')}"
        print(f"✅ Weekly stats period_days = 7")

    def test_stats_contains_by_doctor_breakdown(self):
        """Stats contains by_doctor breakdown list"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=7")
        assert response.status_code == 200
        data = response.json()
        
        assert "by_doctor" in data, "Missing by_doctor field"
        assert isinstance(data["by_doctor"], list), "by_doctor should be a list"
        print(f"✅ by_doctor breakdown present with {len(data['by_doctor'])} entries")

    def test_stats_contains_engagement_metrics(self):
        """Stats contains engagement metrics (fcm_tokens, medicine_reminders, etc.)"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        engagement_fields = ["fcm_tokens", "medicine_reminders", "family_members", "sos_events"]
        for field in engagement_fields:
            assert field in data, f"Missing engagement field: {field}"
        
        print(f"✅ All engagement metrics present")

    def test_stats_contains_curacoins_metrics(self):
        """Stats contains CuraCoins metrics (coins_earned, coins_redeemed)"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        assert "coins_earned" in data, "Missing coins_earned field"
        assert "coins_redeemed" in data, "Missing coins_redeemed field"
        print(f"✅ CuraCoins metrics present: earned={data['coins_earned']}, redeemed={data['coins_redeemed']}")


class TestPlatformReportSend:
    """Tests for POST /api/platform-report/send endpoint"""

    def test_send_daily_report_returns_200(self):
        """POST /api/platform-report/send?report_type=daily returns 200"""
        response = requests.post(f"{BASE_URL}/api/platform-report/send?report_type=daily")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "nevikacura@gmail.com" in data.get("message", ""), "Response should mention recipient email"
        print(f"✅ Daily report sent successfully: {data['message']}")

    def test_send_weekly_report_returns_200(self):
        """POST /api/platform-report/send?report_type=weekly returns 200"""
        response = requests.post(f"{BASE_URL}/api/platform-report/send?report_type=weekly")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "nevikacura@gmail.com" in data.get("message", ""), "Response should mention recipient email"
        print(f"✅ Weekly report sent successfully: {data['message']}")

    def test_send_invalid_report_type_returns_400(self):
        """POST /api/platform-report/send?report_type=invalid returns 400"""
        response = requests.post(f"{BASE_URL}/api/platform-report/send?report_type=invalid")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have detail field"
        print(f"✅ Invalid report_type correctly returns 400: {data['detail']}")

    def test_send_empty_report_type_returns_200_default_daily(self):
        """POST /api/platform-report/send (no report_type) defaults to daily"""
        response = requests.post(f"{BASE_URL}/api/platform-report/send")
        assert response.status_code == 200, f"Expected 200 (default daily), got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        print(f"✅ Default report_type (daily) works: {data['message']}")


class TestPlatformReportDataIntegrity:
    """Tests for data integrity and consistency"""

    def test_stats_values_are_numeric(self):
        """All numeric fields in stats are actually numbers"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        numeric_fields = [
            "total_users", "unique_phones", "unique_emails",
            "total_otp_sent", "otp_sent_period",
            "total_whatsapp_logs", "whatsapp_period",
            "total_appointments", "appointments_period",
            "total_diagnostic_orders", "total_pharmacy_orders",
            "total_revenue", "total_payments", "payments_paid",
            "fcm_tokens", "medicine_reminders", "family_members",
            "coins_earned", "coins_redeemed"
        ]
        
        for field in numeric_fields:
            if field in data:
                assert isinstance(data[field], (int, float)), f"{field} should be numeric, got {type(data[field])}"
        
        print(f"✅ All numeric fields have correct types")

    def test_stats_generated_at_is_valid_timestamp(self):
        """generated_at field contains valid timestamp string"""
        response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        assert response.status_code == 200
        data = response.json()
        
        assert "generated_at" in data, "Missing generated_at field"
        assert "IST" in data["generated_at"], f"generated_at should contain IST timezone: {data['generated_at']}"
        print(f"✅ generated_at is valid: {data['generated_at']}")

    def test_weekly_stats_period_greater_than_daily(self):
        """Weekly period stats should be >= daily period stats for cumulative metrics"""
        daily_response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=1")
        weekly_response = requests.get(f"{BASE_URL}/api/platform-report/stats?days=7")
        
        assert daily_response.status_code == 200
        assert weekly_response.status_code == 200
        
        daily = daily_response.json()
        weekly = weekly_response.json()
        
        # Period-specific metrics should be >= for weekly
        assert weekly.get("otp_sent_period", 0) >= daily.get("otp_sent_period", 0), \
            f"Weekly OTP period ({weekly.get('otp_sent_period')}) should be >= daily ({daily.get('otp_sent_period')})"
        
        print(f"✅ Weekly period metrics >= daily period metrics")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
