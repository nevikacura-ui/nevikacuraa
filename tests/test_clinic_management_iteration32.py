"""
Clinic Management Features Test Suite - Iteration 32
Tests for: Queue Management, Appointment Optimizer, Staff Analytics, Patient Recall, Financial Dashboard
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cura-healthcare.preview.emergentagent.com')
ADMIN_PASSWORD = "nevikacura2026"

class TestClinicManagement:
    """Test suite for Clinic Management features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for all tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Get admin token
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    # ============ 1. QUEUE MANAGEMENT TESTS ============
    
    def test_get_queue_pushpa_clinic(self):
        """Test getting live queue for Pushpa clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/queue/pushpa")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "queue" in data
        assert "total_waiting" in data
        assert "in_progress" in data
        assert "avg_consultation_time" in data
        assert data.get("clinic") == "pushpa"
        print(f"✓ Pushpa queue: {data.get('total_waiting')} waiting, {data.get('in_progress')} in progress")
    
    def test_get_queue_amnion_clinic(self):
        """Test getting live queue for Amnion clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/queue/amnion")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "queue" in data
        assert data.get("clinic") == "amnion"
        print(f"✓ Amnion queue: {data.get('total_waiting')} waiting")
    
    def test_queue_analytics_pushpa(self):
        """Test peak hours analytics for Pushpa clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/queue/analytics/pushpa?days=30")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "peak_hours" in data
        assert "busiest_hours" in data
        assert "weekday_summary" in data
        assert "overall_avg_wait" in data
        assert data.get("period_days") == 30
        print(f"✓ Peak hours analytics: {len(data.get('peak_hours', []))} hours analyzed")
    
    def test_queue_analytics_amnion(self):
        """Test peak hours analytics for Amnion clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/queue/analytics/amnion?days=30")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "peak_hours" in data
        print(f"✓ Amnion analytics: {data.get('total_patients', 0)} patients in period")
    
    def test_check_in_patient_invalid_appointment(self):
        """Test check-in with invalid appointment ID (should fail gracefully)"""
        response = self.session.post(f"{BASE_URL}/api/clinic-management/queue/check-in", json={
            "appointment_id": "invalid_appointment_id_12345",
            "clinic": "pushpa",
            "priority": "normal"
        })
        # Should return 404 (not found) or 422 (validation) for non-existent appointment
        assert response.status_code in [404, 422], f"Expected 404 or 422, got {response.status_code}"
        print("✓ Check-in correctly rejects invalid appointment")
    
    def test_queue_notify_invalid_appointment(self):
        """Test notification with invalid appointment ID"""
        response = self.session.post(f"{BASE_URL}/api/clinic-management/queue/notify", json={
            "appointment_id": "invalid_appointment_id_12345",
            "notification_type": "app"
        })
        assert response.status_code == 404
        print("✓ Notify correctly rejects invalid appointment")
    
    # ============ 2. APPOINTMENT OPTIMIZER TESTS ============
    
    def test_optimize_schedule_today_pushpa(self):
        """Test AI appointment optimization for today - Pushpa"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = self.session.post(f"{BASE_URL}/api/clinic-management/appointments/optimize", json={
            "clinic": "pushpa",
            "date": today
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "schedule_gaps" in data
        assert "no_show_predictions" in data
        assert "buffer_recommendations" in data
        assert "optimization_score" in data
        assert data.get("clinic") == "pushpa"
        assert data.get("date") == today
        print(f"✓ Optimization score: {data.get('optimization_score')}/100, {data.get('total_appointments')} appointments")
    
    def test_optimize_schedule_today_amnion(self):
        """Test AI appointment optimization for today - Amnion"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = self.session.post(f"{BASE_URL}/api/clinic-management/appointments/optimize", json={
            "clinic": "amnion",
            "date": today
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "optimization_score" in data
        print(f"✓ Amnion optimization: {data.get('total_appointments')} appointments")
    
    def test_optimize_schedule_future_date(self):
        """Test optimization for a future date"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        response = self.session.post(f"{BASE_URL}/api/clinic-management/appointments/optimize", json={
            "clinic": "pushpa",
            "date": future_date
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Future date optimization: {future_date}")
    
    # ============ 3. STAFF ANALYTICS TESTS ============
    
    def test_staff_analytics_all_clinics(self):
        """Test staff analytics for all clinics"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/staff/analytics?days=30")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "doctor_analytics" in data
        assert "staff_attendance" in data
        assert "summary" in data
        summary = data.get("summary", {})
        assert "total_appointments" in summary
        assert "total_completed" in summary
        assert "total_revenue" in summary
        assert "overall_completion_rate" in summary
        print(f"✓ Staff analytics: {len(data.get('doctor_analytics', []))} doctors, {summary.get('total_appointments')} appointments")
    
    def test_staff_analytics_pushpa_clinic(self):
        """Test staff analytics filtered by Pushpa clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/staff/analytics?clinic=pushpa&days=30")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("clinic") == "pushpa"
        print(f"✓ Pushpa staff analytics: {data.get('summary', {}).get('total_completed', 0)} completed")
    
    def test_staff_analytics_amnion_clinic(self):
        """Test staff analytics filtered by Amnion clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/staff/analytics?clinic=amnion&days=30")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("clinic") == "amnion"
        print(f"✓ Amnion staff analytics retrieved")
    
    def test_log_staff_attendance(self):
        """Test logging staff attendance"""
        response = self.session.post(
            f"{BASE_URL}/api/clinic-management/staff/attendance?staff_id=test_staff_001&status=present&notes=Test attendance log"
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        print(f"✓ Staff attendance logged: {data.get('message')}")
    
    def test_log_staff_attendance_late(self):
        """Test logging late attendance"""
        response = self.session.post(
            f"{BASE_URL}/api/clinic-management/staff/attendance?staff_id=test_staff_002&status=late&notes=Traffic delay"
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Late attendance logged")
    
    # ============ 4. PATIENT RECALL TESTS ============
    
    def test_get_due_followups(self):
        """Test getting patients due for follow-ups"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/recall/due-followups?days_overdue=7")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "due_followups" in data
        assert "total_due" in data
        assert "high_priority" in data
        print(f"✓ Due follow-ups: {data.get('total_due')} total, {data.get('high_priority')} high priority")
    
    def test_get_due_followups_extended(self):
        """Test getting follow-ups with extended overdue period"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/recall/due-followups?days_overdue=30")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Extended follow-ups: {data.get('total_due')} due")
    
    def test_send_followup_reminder(self):
        """Test sending follow-up reminder"""
        response = self.session.post(
            f"{BASE_URL}/api/clinic-management/recall/send-reminder?user_id=test_user_recall&patient_name=Test Patient&patient_email=test@example.com&reason=Regular follow-up"
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        print(f"✓ Follow-up reminder sent: {data.get('message')}")
    
    def test_get_recall_campaigns(self):
        """Test getting recall campaign performance"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/recall/campaigns")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "campaigns" in data
        assert "total_reminders_sent" in data
        assert "total_conversions" in data
        print(f"✓ Campaigns: {len(data.get('campaigns', []))} types, {data.get('total_reminders_sent')} sent")
    
    # ============ 5. FINANCIAL DASHBOARD TESTS ============
    
    def test_finance_dashboard_day(self):
        """Test financial dashboard for today"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/finance/dashboard?period=day")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "summary" in data
        assert "service_breakdown" in data
        assert "daily_trend" in data
        assert "payment_modes" in data
        assert "doctor_revenue" in data
        summary = data.get("summary", {})
        assert "total_consultation_revenue" in summary
        assert "diagnostic_revenue" in summary
        assert "pharmacy_revenue" in summary
        assert "grand_total" in summary
        print(f"✓ Today's revenue: ₹{summary.get('grand_total', 0)}")
    
    def test_finance_dashboard_week(self):
        """Test financial dashboard for this week"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/finance/dashboard?period=week")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("period") == "This Week"
        print(f"✓ Week revenue: ₹{data.get('summary', {}).get('grand_total', 0)}")
    
    def test_finance_dashboard_month(self):
        """Test financial dashboard for this month"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/finance/dashboard?period=month")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("period") == "This Month"
        print(f"✓ Month revenue: ₹{data.get('summary', {}).get('grand_total', 0)}")
    
    def test_finance_dashboard_pushpa_clinic(self):
        """Test financial dashboard filtered by Pushpa clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/finance/dashboard?period=month&clinic=pushpa")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("clinic") == "pushpa"
        print(f"✓ Pushpa month revenue: ₹{data.get('summary', {}).get('grand_total', 0)}")
    
    def test_finance_dashboard_amnion_clinic(self):
        """Test financial dashboard filtered by Amnion clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/finance/dashboard?period=month&clinic=amnion")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("clinic") == "amnion"
        print(f"✓ Amnion month revenue: ₹{data.get('summary', {}).get('grand_total', 0)}")
    
    def test_finance_comparison(self):
        """Test month-over-month financial comparison"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/finance/comparison")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "current_period" in data
        assert "previous_period" in data
        assert "growth_percentage" in data
        assert "growth_direction" in data
        current = data.get("current_period", {})
        previous = data.get("previous_period", {})
        assert "label" in current
        assert "revenue" in current
        print(f"✓ Comparison: {current.get('label')} ₹{current.get('revenue')} vs {previous.get('label')} ₹{previous.get('revenue')} ({data.get('growth_percentage')}% {data.get('growth_direction')})")
    
    def test_finance_comparison_pushpa(self):
        """Test financial comparison for Pushpa clinic"""
        response = self.session.get(f"{BASE_URL}/api/clinic-management/finance/comparison?clinic=pushpa")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Pushpa comparison: {data.get('growth_percentage')}% {data.get('growth_direction')}")
    
    # ============ 6. AUTHORIZATION TESTS ============
    
    def test_unauthorized_access_queue(self):
        """Test that queue endpoint requires authorization"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/clinic-management/queue/pushpa")
        assert response.status_code == 401
        print("✓ Queue endpoint correctly requires authorization")
    
    def test_unauthorized_access_finance(self):
        """Test that finance endpoint requires authorization"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/clinic-management/finance/dashboard")
        assert response.status_code == 401
        print("✓ Finance endpoint correctly requires authorization")


class TestAdminClinicManagementTab:
    """Test Admin page Clinic Management tab visibility"""
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Admin login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
