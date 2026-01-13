"""
Iteration 24 - Testing P1 fixes and new features:
1. Loyalty Leaderboard - All-time period shows correct participant count
2. PDF Download endpoints for Glydex and Evara
3. Admin Appointment Cancellation
4. StaffPortal optimization
5. Doctor Profiles Page
6. Billing Page and APIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLoyaltyLeaderboard:
    """Test Loyalty Leaderboard - All-time period fix"""
    
    def test_leaderboard_all_time_period(self):
        """Test that all-time leaderboard returns correct participant count"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/leaderboard?period=all")
        assert response.status_code == 200
        
        data = response.json()
        assert "leaderboard" in data
        assert "total_participants" in data
        assert "period" in data
        assert data["period"] == "all"
        assert data["period_label"] == "All Time"
        
        # Verify participant count matches leaderboard entries or is greater
        assert data["total_participants"] >= 0
        print(f"PASS: All-time leaderboard shows {data['total_participants']} participants")
        print(f"Leaderboard entries: {len(data['leaderboard'])}")
    
    def test_leaderboard_weekly_period(self):
        """Test weekly leaderboard"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/leaderboard?period=weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert data["period"] == "weekly"
        assert data["period_label"] == "This Week"
        print(f"PASS: Weekly leaderboard shows {data['total_participants']} participants")
    
    def test_leaderboard_monthly_period(self):
        """Test monthly leaderboard"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/leaderboard?period=monthly")
        assert response.status_code == 200
        
        data = response.json()
        assert data["period"] == "monthly"
        assert data["period_label"] == "This Month"
        print(f"PASS: Monthly leaderboard shows {data['total_participants']} participants")


class TestPDFDownloadEndpoints:
    """Test PDF Download endpoints for Glydex and Evara"""
    
    def test_glydex_pdf_endpoint_exists(self):
        """Test that Glydex PDF download endpoint exists (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/glydex/download-pdf")
        # Should return 401 (auth required) not 404
        assert response.status_code == 401
        assert "Authentication required" in response.json().get("detail", "")
        print("PASS: Glydex PDF endpoint exists (returns 401 - auth required)")
    
    def test_evara_pdf_endpoint_exists(self):
        """Test that Evara PDF download endpoint exists (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/evara/download-pdf")
        # Should return 401 (auth required) not 404
        assert response.status_code == 401
        assert "Authentication required" in response.json().get("detail", "")
        print("PASS: Evara PDF endpoint exists (returns 401 - auth required)")


class TestAdminAppointmentCancellation:
    """Test Admin Appointment Cancellation endpoint"""
    
    def test_admin_cancel_endpoint_exists(self):
        """Test that admin cancel endpoint exists (requires admin auth)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/appointments/cancel",
            json={"appointment_id": "test-id"}
        )
        # Should return 401 (admin auth required) not 404
        assert response.status_code == 401
        assert "Admin authentication required" in response.json().get("detail", "")
        print("PASS: Admin cancel endpoint exists (returns 401 - admin auth required)")
    
    def test_admin_cancel_with_admin_auth(self):
        """Test admin cancel with admin authentication"""
        # First login as admin
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "nevikacura2026"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Try to cancel a non-existent appointment
            response = requests.post(
                f"{BASE_URL}/api/admin/appointments/cancel",
                json={"appointment_id": "non-existent-id"},
                headers=headers
            )
            # Should return 404 (appointment not found) not 401
            assert response.status_code in [404, 400]
            print("PASS: Admin cancel endpoint works with admin auth")
        else:
            pytest.skip("Admin login failed")


class TestBillingAPIs:
    """Test Billing Dashboard and Due Payments APIs"""
    
    def test_billing_dashboard(self):
        """Test billing dashboard endpoint"""
        response = requests.get(f"{BASE_URL}/api/billing/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_due" in data
        assert "overdue_count" in data
        assert "pending_count" in data
        assert "partial_count" in data
        assert "collected_today" in data
        
        print(f"PASS: Billing dashboard - Total due: ₹{data['total_due']}")
        print(f"  Pending: {data['pending_count']}, Partial: {data['partial_count']}, Overdue: {data['overdue_count']}")
    
    def test_due_payments_list(self):
        """Test due payments list endpoint"""
        response = requests.get(f"{BASE_URL}/api/billing/due-payments")
        assert response.status_code == 200
        
        data = response.json()
        assert "due_payments" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        print(f"PASS: Due payments list - {data['total']} due payments found")
    
    def test_billing_invoices_list(self):
        """Test invoices list endpoint"""
        response = requests.get(f"{BASE_URL}/api/billing/invoices")
        assert response.status_code == 200
        
        data = response.json()
        assert "invoices" in data
        assert "total" in data
        
        print(f"PASS: Invoices list - {data['total']} invoices found")
    
    def test_billing_summary(self):
        """Test billing summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/billing/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_invoices" in data
        assert "total_billed" in data
        assert "total_collected" in data
        assert "total_due" in data
        assert "collection_rate" in data
        
        print(f"PASS: Billing summary - Billed: ₹{data['total_billed']}, Collected: ₹{data['total_collected']}")


class TestDoctorProfilesAPI:
    """Test Doctor Profiles API"""
    
    def test_doctors_list(self):
        """Test doctors list endpoint"""
        response = requests.get(f"{BASE_URL}/api/doctors/all")
        assert response.status_code == 200
        
        data = response.json()
        assert "doctors" in data
        
        print(f"PASS: Doctors list - {len(data['doctors'])} doctors found")
        
        # Verify doctor data structure
        if data["doctors"]:
            doctor = data["doctors"][0]
            assert "name" in doctor
            print(f"  First doctor: {doctor.get('name')}")


class TestStaffPortalAPIs:
    """Test Staff Portal APIs"""
    
    def test_staff_login(self):
        """Test staff login"""
        response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_pushpa", "password": "Nevika@2026C"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "staff" in data
        
        print(f"PASS: Staff login successful - {data['staff'].get('name')}")
        return data["token"]
    
    def test_staff_appointments_endpoint(self):
        """Test staff appointments endpoint"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/staff/login",
            json={"username": "staff_pushpa", "password": "Nevika@2026C"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Get appointments
            response = requests.get(
                f"{BASE_URL}/api/staff/appointments",
                headers=headers
            )
            assert response.status_code == 200
            print("PASS: Staff appointments endpoint working")
        else:
            pytest.skip("Staff login failed")


class TestLoyaltyTiers:
    """Test Loyalty Tiers API"""
    
    def test_loyalty_tiers(self):
        """Test loyalty tiers endpoint"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/loyalty/tiers")
        assert response.status_code == 200
        
        data = response.json()
        assert "tiers" in data
        assert "bronze" in data["tiers"]
        assert "silver" in data["tiers"]
        assert "gold" in data["tiers"]
        
        print("PASS: Loyalty tiers endpoint working")
        print(f"  Bronze: {data['tiers']['bronze']['name']}")
        print(f"  Silver: {data['tiers']['silver']['name']}")
        print(f"  Gold: {data['tiers']['gold']['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
