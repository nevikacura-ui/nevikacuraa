"""
Test Phase 2 Features: CuraCoins Loyalty, Booking Analytics, Doctor Insights, Emergency SOS, WhatsApp Menu
Iteration 258 - Testing new features added for Nevika Cura
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test phone for CuraCoins testing
TEST_PHONE = "9876543210"
TEST_PHONE_CLEANUP = "TEST_9999999999"


class TestBookingAnalytics:
    """Booking Analytics Dashboard API tests"""
    
    def test_booking_analytics_7_days(self):
        """GET /api/analytics/bookings?days=7 - Returns booking stats"""
        response = requests.get(f"{BASE_URL}/api/analytics/bookings?days=7")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "total" in data, "Missing 'total' field"
        assert "completed" in data, "Missing 'completed' field"
        assert "cancelled" in data, "Missing 'cancelled' field"
        assert "voice_booked" in data, "Missing 'voice_booked' field"
        assert "completion_rate" in data, "Missing 'completion_rate' field"
        assert "by_doctor" in data, "Missing 'by_doctor' field"
        assert "by_status" in data, "Missing 'by_status' field"
        assert "daily" in data, "Missing 'daily' field"
        assert "period_days" in data, "Missing 'period_days' field"
        
        # Validate data types
        assert isinstance(data["total"], int), "total should be int"
        assert isinstance(data["by_doctor"], list), "by_doctor should be list"
        assert isinstance(data["daily"], list), "daily should be list"
        assert data["period_days"] == 7, f"Expected period_days=7, got {data['period_days']}"
        
        print(f"Analytics 7d: total={data['total']}, completed={data['completed']}, rate={data['completion_rate']}%")
    
    def test_booking_analytics_30_days(self):
        """GET /api/analytics/bookings?days=30 - Returns 30-day stats"""
        response = requests.get(f"{BASE_URL}/api/analytics/bookings?days=30")
        assert response.status_code == 200
        
        data = response.json()
        assert data["period_days"] == 30
        assert "by_clinic" in data, "Missing 'by_clinic' field"
        assert "by_source" in data, "Missing 'by_source' field"
        
        print(f"Analytics 30d: total={data['total']}, by_doctor count={len(data['by_doctor'])}")
    
    def test_revenue_analytics(self):
        """GET /api/analytics/revenue?days=30 - Returns revenue analytics"""
        response = requests.get(f"{BASE_URL}/api/analytics/revenue?days=30")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_revenue" in data, "Missing 'total_revenue' field"
        assert "by_service" in data, "Missing 'by_service' field"
        assert "period_days" in data, "Missing 'period_days' field"
        
        print(f"Revenue 30d: total_revenue={data['total_revenue']}, services={len(data['by_service'])}")


class TestCuraCoinsLoyalty:
    """CuraCoins Loyalty Engine API tests"""
    
    def test_get_coin_balance(self):
        """GET /api/curacoins/balance/{phone} - Returns coin balance and rates"""
        response = requests.get(f"{BASE_URL}/api/curacoins/balance/{TEST_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "balance" in data, "Missing 'balance' field"
        assert "total_earned" in data, "Missing 'total_earned' field"
        assert "total_redeemed" in data, "Missing 'total_redeemed' field"
        assert "earn_rates" in data, "Missing 'earn_rates' field"
        assert "redeem_options" in data, "Missing 'redeem_options' field"
        
        # Validate earn rates
        earn_rates = data["earn_rates"]
        assert "appointment" in earn_rates, "Missing appointment earn rate"
        assert "voice_booking" in earn_rates, "Missing voice_booking earn rate"
        assert earn_rates["appointment"] == 50, f"Expected appointment=50, got {earn_rates['appointment']}"
        assert earn_rates["voice_booking"] == 75, f"Expected voice_booking=75, got {earn_rates['voice_booking']}"
        
        # Validate redeem options
        assert isinstance(data["redeem_options"], list), "redeem_options should be list"
        assert len(data["redeem_options"]) > 0, "Should have redeem options"
        
        print(f"CuraCoins balance for {TEST_PHONE}: {data['balance']} coins")
    
    def test_earn_coins_appointment(self):
        """POST /api/curacoins/earn - Awards coins for appointment action"""
        payload = {
            "phone": TEST_PHONE,
            "action": "appointment",
            "reference_id": "TEST_APT_001"
        }
        response = requests.post(f"{BASE_URL}/api/curacoins/earn", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True, "Expected success=True"
        assert data["coins_earned"] == 50, f"Expected 50 coins for appointment, got {data['coins_earned']}"
        assert "new_balance" in data, "Missing 'new_balance' field"
        assert "message" in data, "Missing 'message' field"
        
        print(f"Earned {data['coins_earned']} coins, new balance: {data['new_balance']}")
    
    def test_earn_coins_voice_booking(self):
        """POST /api/curacoins/earn - Awards bonus coins for voice booking"""
        payload = {
            "phone": TEST_PHONE,
            "action": "voice_booking",
            "reference_id": "TEST_VOICE_001"
        }
        response = requests.post(f"{BASE_URL}/api/curacoins/earn", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["coins_earned"] == 75, f"Expected 75 coins for voice_booking, got {data['coins_earned']}"
        
        print(f"Voice booking earned {data['coins_earned']} coins")
    
    def test_earn_coins_with_amount_bonus(self):
        """POST /api/curacoins/earn - Awards coins with 5% bonus on amount"""
        payload = {
            "phone": TEST_PHONE,
            "action": "lab_test",
            "amount": 1000,  # Should add 50 bonus (5% of 1000)
            "reference_id": "TEST_LAB_001"
        }
        response = requests.post(f"{BASE_URL}/api/curacoins/earn", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        # lab_test = 30 + 5% of 1000 = 30 + 50 = 80
        assert data["coins_earned"] == 80, f"Expected 80 coins (30 + 50 bonus), got {data['coins_earned']}"
        
        print(f"Lab test with amount bonus earned {data['coins_earned']} coins")
    
    def test_earn_coins_unknown_action(self):
        """POST /api/curacoins/earn - Returns 0 coins for unknown action"""
        payload = {
            "phone": TEST_PHONE,
            "action": "unknown_action"
        }
        response = requests.post(f"{BASE_URL}/api/curacoins/earn", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == False, "Expected success=False for unknown action"
        assert data["coins_earned"] == 0, "Expected 0 coins for unknown action"
    
    def test_redeem_coins_insufficient_balance(self):
        """POST /api/curacoins/redeem - Validates insufficient balance"""
        # Use a test phone with likely low balance
        payload = {
            "phone": TEST_PHONE_CLEANUP,
            "option_id": "free_checkup"  # Needs 2500 coins
        }
        response = requests.post(f"{BASE_URL}/api/curacoins/redeem", json=payload)
        # Should return 400 for insufficient balance
        assert response.status_code == 400, f"Expected 400 for insufficient balance, got {response.status_code}"
        
        data = response.json()
        assert "Insufficient coins" in data.get("detail", ""), f"Expected insufficient coins error, got: {data}"
        
        print("Insufficient balance validation working correctly")
    
    def test_redeem_coins_invalid_option(self):
        """POST /api/curacoins/redeem - Validates invalid redeem option"""
        payload = {
            "phone": TEST_PHONE,
            "option_id": "invalid_option_xyz"
        }
        response = requests.post(f"{BASE_URL}/api/curacoins/redeem", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid option, got {response.status_code}"
        
        data = response.json()
        assert "Invalid redeem option" in data.get("detail", ""), f"Expected invalid option error, got: {data}"
    
    def test_leaderboard(self):
        """GET /api/curacoins/leaderboard - Returns top earners with masked phones"""
        response = requests.get(f"{BASE_URL}/api/curacoins/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "leaderboard" in data, "Missing 'leaderboard' field"
        assert isinstance(data["leaderboard"], list), "leaderboard should be list"
        
        # Check phone masking if there are entries
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            assert "phone" in entry, "Missing phone in leaderboard entry"
            assert "total_earned" in entry, "Missing total_earned in leaderboard entry"
            # Phone should be masked (e.g., 987****210)
            if len(entry["phone"]) >= 6:
                assert "****" in entry["phone"], f"Phone should be masked, got: {entry['phone']}"
        
        print(f"Leaderboard has {len(data['leaderboard'])} entries")


class TestDoctorInsights:
    """Doctor Insights AI Panel API tests"""
    
    def test_doctor_insights_summary(self):
        """GET /api/doctor-insights/summary/{doctor_name}?days=30 - Returns AI insights"""
        doctor_name = "Dr. Vikas"
        response = requests.get(f"{BASE_URL}/api/doctor-insights/summary/{doctor_name}?days=30", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "doctor" in data, "Missing 'doctor' field"
        assert "period_days" in data, "Missing 'period_days' field"
        assert "total_appointments" in data, "Missing 'total_appointments' field"
        assert "completed" in data, "Missing 'completed' field"
        assert "cancelled" in data, "Missing 'cancelled' field"
        assert "voice_booked" in data, "Missing 'voice_booked' field"
        assert "completion_rate" in data, "Missing 'completion_rate' field"
        assert "peak_hours" in data, "Missing 'peak_hours' field"
        assert "busiest_days" in data, "Missing 'busiest_days' field"
        assert "ai_insights" in data, "Missing 'ai_insights' field"
        
        # Validate data types
        assert isinstance(data["peak_hours"], list), "peak_hours should be list"
        assert isinstance(data["busiest_days"], list), "busiest_days should be list"
        assert isinstance(data["ai_insights"], list), "ai_insights should be list"
        
        print(f"Doctor insights for {doctor_name}: {data['total_appointments']} appointments, rate={data['completion_rate']}%")
        print(f"AI Insights: {data['ai_insights'][:2] if len(data['ai_insights']) > 0 else 'No insights'}")
    
    def test_doctor_insights_7_days(self):
        """GET /api/doctor-insights/summary/{doctor_name}?days=7 - Returns 7-day insights"""
        doctor_name = "Dr. Neha"
        response = requests.get(f"{BASE_URL}/api/doctor-insights/summary/{doctor_name}?days=7", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert data["period_days"] == 7
        assert data["doctor"] == doctor_name
        
        print(f"7-day insights for {doctor_name}: {data['total_appointments']} appointments")


class TestEmergencySOS:
    """Emergency SOS and WhatsApp Menu API tests"""
    
    def test_trigger_sos(self):
        """POST /api/emergency/sos - Logs SOS event with location"""
        payload = {
            "phone": TEST_PHONE,
            "name": "Test User",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "emergency_type": "cardiac"
        }
        response = requests.post(f"{BASE_URL}/api/emergency/sos", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True, "Expected success=True"
        assert "emergency_contacts" in data, "Missing 'emergency_contacts' field"
        assert "location_url" in data, "Missing 'location_url' field"
        assert "sos_id" in data, "Missing 'sos_id' field"
        
        # Validate location URL
        assert data["location_url"] is not None, "location_url should not be None when lat/lng provided"
        assert "maps.google.com" in data["location_url"], "location_url should be Google Maps link"
        assert "19.076" in data["location_url"], "location_url should contain latitude"
        
        # Validate emergency contacts
        contacts = data["emergency_contacts"]
        assert len(contacts) >= 2, "Should have at least 2 emergency contacts"
        contact_types = [c["type"] for c in contacts]
        assert "ambulance" in contact_types, "Should have ambulance contact"
        
        print(f"SOS triggered: {data['sos_id']}, location: {data['location_url']}")
    
    def test_trigger_sos_without_location(self):
        """POST /api/emergency/sos - Works without location"""
        payload = {
            "phone": TEST_PHONE,
            "emergency_type": "general"
        }
        response = requests.post(f"{BASE_URL}/api/emergency/sos", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["location_url"] is None, "location_url should be None when no lat/lng"
    
    def test_get_emergency_contacts(self):
        """GET /api/emergency/contacts - Returns emergency contacts"""
        response = requests.get(f"{BASE_URL}/api/emergency/contacts")
        assert response.status_code == 200
        
        data = response.json()
        assert "contacts" in data, "Missing 'contacts' field"
        
        contacts = data["contacts"]
        assert len(contacts) >= 2, "Should have at least 2 contacts"
        
        # Validate contact structure
        for contact in contacts:
            assert "name" in contact, "Contact missing 'name'"
            assert "number" in contact, "Contact missing 'number'"
            assert "type" in contact, "Contact missing 'type'"
        
        # Check for specific contacts
        contact_names = [c["name"] for c in contacts]
        assert "Ambulance" in contact_names, "Should have Ambulance contact"
        
        print(f"Emergency contacts: {[c['name'] for c in contacts]}")
    
    def test_whatsapp_menu(self):
        """GET /api/emergency/whatsapp-menu - Returns structured WhatsApp menu"""
        response = requests.get(f"{BASE_URL}/api/emergency/whatsapp-menu")
        assert response.status_code == 200
        
        data = response.json()
        assert "greeting" in data, "Missing 'greeting' field"
        assert "options" in data, "Missing 'options' field"
        assert "footer" in data, "Missing 'footer' field"
        
        # Validate options
        options = data["options"]
        assert len(options) >= 4, "Should have at least 4 menu options"
        
        # Check option structure
        for opt in options:
            assert "id" in opt, "Option missing 'id'"
            assert "label" in opt, "Option missing 'label'"
            assert "action" in opt, "Option missing 'action'"
            assert "reply" in opt, "Option missing 'reply'"
        
        # Check for specific options
        actions = [o["action"] for o in options]
        assert "book_appointment" in actions, "Should have book_appointment option"
        assert "emergency" in actions, "Should have emergency option"
        
        print(f"WhatsApp menu has {len(options)} options: {[o['label'] for o in options]}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_transactions(self):
        """Cleanup: Note that test transactions were created"""
        # Note: In production, we'd delete TEST_ prefixed data
        # For now, just verify the test phone balance
        response = requests.get(f"{BASE_URL}/api/curacoins/balance/{TEST_PHONE}")
        if response.status_code == 200:
            data = response.json()
            print(f"Final balance for {TEST_PHONE}: {data['balance']} coins")
        print("Test data created during testing - manual cleanup may be needed for TEST_ prefixed data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
