"""
Test: Upcoming Events Widget APIs for Patient, Doctor, and Staff
Iteration 196 - Upcoming Events Widget Testing
Tests:
- GET /api/upcoming-events/patient/{phone}
- GET /api/upcoming-events/doctor/{doctor_name}
- GET /api/upcoming-events/staff/{portal}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUpcomingEventsPatient:
    """Tests for patient upcoming events API"""
    
    def test_patient_events_endpoint_exists(self):
        """Test patient events endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/patient/9876543210")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_patient_events_returns_json_structure(self):
        """Test patient events returns correct JSON structure with events and count"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/patient/9876543210")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data, "Response should contain 'events' array"
        assert "count" in data, "Response should contain 'count'"
        assert isinstance(data["events"], list), "'events' should be a list"
        assert isinstance(data["count"], int), "'count' should be an integer"
        
    def test_patient_events_count_matches_events_length(self):
        """Test that count matches the number of events"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/patient/9876543210")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == len(data["events"]), "Count should match events array length"
        
    def test_patient_events_invalid_phone(self):
        """Test patient events with invalid phone returns empty events"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/patient/0000000000")
        assert response.status_code == 200
        data = response.json()
        # Should return empty events for non-existent patient
        assert "events" in data
        assert isinstance(data["events"], list)
        

class TestUpcomingEventsDoctor:
    """Tests for doctor upcoming events API"""
    
    def test_doctor_neha_events_endpoint(self):
        """Test doctor Neha events endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/doctor/Neha")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_doctor_neha_events_structure(self):
        """Test doctor Neha events returns correct JSON structure"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/doctor/Neha")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data, "Response should contain 'events' array"
        assert "count" in data, "Response should contain 'count'"
        assert isinstance(data["events"], list), "'events' should be a list"
        
    def test_doctor_vikas_events_endpoint(self):
        """Test doctor Vikas events endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/doctor/Vikas")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_doctor_events_with_date_param(self):
        """Test doctor events with date query parameter"""
        from datetime import datetime, timedelta
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/upcoming-events/doctor/Neha?date={today}")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        

class TestUpcomingEventsStaff:
    """Tests for staff upcoming events API"""
    
    def test_staff_all_events_endpoint(self):
        """Test staff ALL portal events endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/staff/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_staff_all_events_structure(self):
        """Test staff all events returns correct JSON structure with events and count"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/staff/all")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data, "Response should contain 'events' array"
        assert "count" in data, "Response should contain 'count'"
        assert isinstance(data["events"], list), "'events' should be a list"
        print(f"Staff ALL events count: {data['count']}")
        
    def test_staff_orange_pharmacy_events(self):
        """Test staff ORANGE portal events (pharmacy-only)"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/staff/orange")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        # Orange portal should only return pharmacy_order events
        for event in data["events"]:
            assert event.get("type") in ["pharmacy_order"], f"Orange portal should have pharmacy events only, got {event.get('type')}"
            assert event.get("portal") == "orange", f"Portal should be 'orange', got {event.get('portal')}"
        print(f"Staff ORANGE events count: {data['count']}")
        
    def test_staff_mango_lab_events(self):
        """Test staff MANGO portal events (lab-only)"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/staff/mango")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        # Mango portal should only return lab_order events
        for event in data["events"]:
            assert event.get("type") in ["lab_order"], f"Mango portal should have lab events only, got {event.get('type')}"
            assert event.get("portal") == "mango", f"Portal should be 'mango', got {event.get('portal')}"
        print(f"Staff MANGO events count: {data['count']}")
        
    def test_staff_diagyn_appointments(self):
        """Test staff DIAGYN portal events (appointments-only)"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/staff/diagyn")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        # Diagyn portal should only return appointment events
        for event in data["events"]:
            assert event.get("type") == "appointment", f"Diagyn portal should have appointment events only, got {event.get('type')}"
            assert event.get("portal") == "diagyn", f"Portal should be 'diagyn', got {event.get('portal')}"
        print(f"Staff DIAGYN events count: {data['count']}")
        

class TestEventDataStructure:
    """Test the structure of individual events"""
    
    def test_appointment_event_structure(self):
        """Test appointment event has required fields"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/staff/diagyn")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["events"]) > 0:
            event = data["events"][0]
            required_fields = ["type", "id", "title", "subtitle", "date", "status", "portal"]
            for field in required_fields:
                assert field in event, f"Event should have '{field}' field"
            assert event["type"] == "appointment"
            assert event["portal"] == "diagyn"
            print(f"Appointment event structure verified: {event.get('title')}")
        else:
            print("No appointment events to verify structure")
            
    def test_staff_all_has_multiple_event_types(self):
        """Test staff ALL portal can have different event types"""
        response = requests.get(f"{BASE_URL}/api/upcoming-events/staff/all")
        assert response.status_code == 200
        data = response.json()
        
        event_types = set()
        for event in data["events"]:
            event_types.add(event.get("type"))
            
        print(f"Event types found in staff/all: {event_types}")
        # Staff all should be able to return appointments (from diagyn), may have pharmacy/lab if orders exist


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
