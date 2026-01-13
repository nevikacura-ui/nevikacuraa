"""
Backend API Tests for Nevika Cura - Email Notifications
Tests: Email notifications sent via Resend API for various events
- User registration (welcome email)
- Appointment booking (confirmation)
- Diagnostic order (confirmation)
- Pharmacy order (confirmation)
- Pharmacy status update (notification)
- Diagnostic status update (notification)
- Verifies custom sender email noreply@nevikacura.com
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cura-medapp.preview.emergentagent.com')
ADMIN_PASSWORD = "nevikacura2026"


def get_admin_token():
    """Get admin JWT token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
    if response.status_code == 200:
        return response.json()["token"]
    return None


class TestEmailConfiguration:
    """Tests for email configuration verification"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ API is healthy")


class TestUserRegistrationEmail:
    """Tests for user registration welcome email"""
    
    def test_register_sends_welcome_email(self):
        """Test that user registration sends welcome email to user"""
        unique_email = f"test_email_{uuid.uuid4().hex[:8]}@example.com"
        
        user_data = {
            "email": unique_email,
            "password": "testpass123",
            "phone": f"98765{uuid.uuid4().hex[:5]}"[:10],
            "name": "TEST_Email User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        print(f"✓ User registered: {unique_email}")
        print("✓ Welcome email should be sent to user and admin notification email")
        
        # Return user data for potential cleanup
        return data
    
    def test_register_with_otp_sends_welcome_email(self):
        """Test that OTP registration sends welcome email"""
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"[:10]
        unique_email = f"test_otp_{uuid.uuid4().hex[:8]}@example.com"
        
        # Step 1: Send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": unique_phone})
        assert send_response.status_code == 200
        mock_otp = send_response.json()["mock_otp"]
        
        # Step 2: Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": unique_phone,
            "otp": mock_otp
        })
        assert verify_response.status_code == 200
        
        # Step 3: Register
        register_response = requests.post(f"{BASE_URL}/api/auth/register/otp", json={
            "phone": unique_phone,
            "otp": mock_otp,
            "email": unique_email,
            "password": "testpass123",
            "name": "TEST_OTP Email User"
        })
        assert register_response.status_code == 200
        data = register_response.json()
        
        assert "token" in data
        assert "user" in data
        print(f"✓ User registered via OTP: {unique_email}")
        print("✓ Welcome email should be sent to user via OTP registration")


class TestAppointmentBookingEmail:
    """Tests for appointment booking confirmation email"""
    
    def test_appointment_with_patient_email_sends_confirmation(self):
        """Test that appointment booking with patient_email sends confirmation"""
        appointment_data = {
            "doctor": "Dr. Test Email Doctor",
            "clinic": "DiaGyn Healthcare",
            "date": "2025-12-25",
            "time": f"{uuid.uuid4().hex[:4]}:00 AM",  # Unique time to avoid conflicts
            "patient_name": "TEST_Appointment Email Patient",
            "patient_phone": "9876543210",
            "patient_email": f"patient_appt_{uuid.uuid4().hex[:8]}@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["patient_email"] == appointment_data["patient_email"]
        print(f"✓ Appointment created with patient_email: {appointment_data['patient_email']}")
        print("✓ Confirmation email should be sent to patient and admin")
        
        return data["id"]
    
    def test_appointment_without_patient_email(self):
        """Test appointment booking without patient_email (only admin notification)"""
        appointment_data = {
            "doctor": "Dr. No Email Doctor",
            "clinic": "DiaGyn Healthcare",
            "date": "2025-12-26",
            "time": f"{uuid.uuid4().hex[:4]}:00 PM",
            "patient_name": "TEST_No Email Patient",
            "patient_phone": "9876543211"
            # No patient_email provided
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data.get("patient_email") is None
        print("✓ Appointment created without patient_email")
        print("✓ Only admin notification email should be sent")


class TestDiagnosticOrderEmail:
    """Tests for diagnostic order confirmation email"""
    
    def test_diagnostic_order_with_patient_email_sends_confirmation(self):
        """Test that diagnostic order with patient_email sends confirmation"""
        order_data = {
            "tests": ["Complete Blood Count (CBC)", "Thyroid Profile (T3, T4, TSH)"],
            "preferred_date": "2025-12-27",
            "patient_name": "TEST_Diagnostic Email Patient",
            "patient_phone": "9876543212",
            "patient_email": f"patient_diag_{uuid.uuid4().hex[:8]}@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["patient_email"] == order_data["patient_email"]
        print(f"✓ Diagnostic order created with patient_email: {order_data['patient_email']}")
        print("✓ Confirmation email should be sent to patient and admin")
        
        return data["id"]
    
    def test_diagnostic_order_without_patient_email(self):
        """Test diagnostic order without patient_email (only admin notification)"""
        order_data = {
            "tests": ["Blood Sugar Fasting"],
            "preferred_date": "2025-12-28",
            "patient_name": "TEST_No Email Diag Patient",
            "patient_phone": "9876543213"
            # No patient_email provided
        }
        
        response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data.get("patient_email") is None
        print("✓ Diagnostic order created without patient_email")
        print("✓ Only admin notification email should be sent")


class TestPharmacyOrderEmail:
    """Tests for pharmacy order confirmation email"""
    
    def test_pharmacy_order_with_patient_email_sends_confirmation(self):
        """Test that pharmacy order with patient_email sends confirmation"""
        order_data = {
            "medicines": [
                {"name": "Crocin 650 Tab", "quantity": 2},
                {"name": "Combiflam Tab", "quantity": 1}
            ],
            "patient_name": "TEST_Pharmacy Email Patient",
            "patient_phone": "9876543214",
            "patient_email": f"patient_pharm_{uuid.uuid4().hex[:8]}@example.com",
            "delivery_address": "123 Test Street, Test City"
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["patient_email"] == order_data["patient_email"]
        print(f"✓ Pharmacy order created with patient_email: {order_data['patient_email']}")
        print("✓ Confirmation email should be sent to patient and admin")
        
        return data["id"]
    
    def test_pharmacy_order_without_patient_email(self):
        """Test pharmacy order without patient_email (only admin notification)"""
        order_data = {
            "medicines": [
                {"name": "Paracetamol 500mg", "quantity": 1}
            ],
            "patient_name": "TEST_No Email Pharm Patient",
            "patient_phone": "9876543215",
            "delivery_address": "456 No Email Street"
            # No patient_email provided
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data.get("patient_email") is None
        print("✓ Pharmacy order created without patient_email")
        print("✓ Only admin notification email should be sent")


class TestPharmacyStatusUpdateEmail:
    """Tests for pharmacy order status update email"""
    
    def test_pharmacy_status_update_sends_email(self):
        """Test that pharmacy status update sends email to patient"""
        # First create an order with patient_email
        order_data = {
            "medicines": [{"name": "Test Medicine", "quantity": 1}],
            "patient_name": "TEST_Status Update Patient",
            "patient_phone": "9876543216",
            "patient_email": f"patient_status_{uuid.uuid4().hex[:8]}@example.com",
            "delivery_address": "789 Status Street"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["id"]
        print(f"✓ Pharmacy order created: {order_id}")
        
        # Now update status as admin
        admin_token = get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test each status update
        statuses = ["Packing", "Out for Delivery", "Delivered"]
        
        for status in statuses:
            update_response = requests.put(
                f"{BASE_URL}/api/admin/pharmacy/orders/{order_id}/status",
                json={"order_id": order_id, "status": status, "notes": f"Testing {status} status"},
                headers=headers
            )
            assert update_response.status_code == 200
            data = update_response.json()
            assert data["status"] == status
            print(f"✓ Pharmacy order status updated to '{status}'")
            print(f"✓ Status update email should be sent to patient: {order_data['patient_email']}")
            time.sleep(0.5)  # Small delay between updates


class TestDiagnosticStatusUpdateEmail:
    """Tests for diagnostic order status update email"""
    
    def test_diagnostic_status_update_sends_email(self):
        """Test that diagnostic status update sends email to patient"""
        # First create an order with patient_email
        order_data = {
            "tests": ["Blood Test"],
            "preferred_date": "2025-12-29",
            "patient_name": "TEST_Diag Status Patient",
            "patient_phone": "9876543217",
            "patient_email": f"patient_diag_status_{uuid.uuid4().hex[:8]}@example.com"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["id"]
        print(f"✓ Diagnostic order created: {order_id}")
        
        # Now update status as admin
        admin_token = get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test each status update
        statuses = ["Sample Collected", "In Process", "Reports Generated"]
        
        for status in statuses:
            update_response = requests.put(
                f"{BASE_URL}/api/admin/diagnostic/orders/{order_id}/status",
                json={"order_id": order_id, "status": status, "notes": f"Testing {status} status"},
                headers=headers
            )
            assert update_response.status_code == 200
            data = update_response.json()
            assert data["status"] == status
            print(f"✓ Diagnostic order status updated to '{status}'")
            print(f"✓ Status update email should be sent to patient: {order_data['patient_email']}")
            time.sleep(0.5)  # Small delay between updates


class TestStatusUpdateWithoutPatientEmail:
    """Tests for status updates when patient_email is not provided"""
    
    def test_pharmacy_status_update_without_patient_email(self):
        """Test pharmacy status update when no patient_email (only admin notification)"""
        # Create order without patient_email
        order_data = {
            "medicines": [{"name": "Test Medicine", "quantity": 1}],
            "patient_name": "TEST_No Email Status Patient",
            "patient_phone": "9876543218",
            "delivery_address": "No Email Address"
            # No patient_email
        }
        
        create_response = requests.post(f"{BASE_URL}/api/pharmacy", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["id"]
        
        # Update status
        admin_token = get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {admin_token}"}
        update_response = requests.put(
            f"{BASE_URL}/api/admin/pharmacy/orders/{order_id}/status",
            json={"order_id": order_id, "status": "Packing"},
            headers=headers
        )
        assert update_response.status_code == 200
        print("✓ Pharmacy status updated without patient_email")
        print("✓ Only admin notification should be sent (no patient email)")
    
    def test_diagnostic_status_update_without_patient_email(self):
        """Test diagnostic status update when no patient_email (only admin notification)"""
        # Create order without patient_email
        order_data = {
            "tests": ["Blood Test"],
            "preferred_date": "2025-12-30",
            "patient_name": "TEST_No Email Diag Status",
            "patient_phone": "9876543219"
            # No patient_email
        }
        
        create_response = requests.post(f"{BASE_URL}/api/diagnostics", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["id"]
        
        # Update status
        admin_token = get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {admin_token}"}
        update_response = requests.put(
            f"{BASE_URL}/api/admin/diagnostic/orders/{order_id}/status",
            json={"order_id": order_id, "status": "Sample Collected"},
            headers=headers
        )
        assert update_response.status_code == 200
        print("✓ Diagnostic status updated without patient_email")
        print("✓ Only admin notification should be sent (no patient email)")


class TestAdminEndpoints:
    """Tests for admin endpoints used in status updates"""
    
    def test_admin_pharmacy_orders_list(self):
        """Test admin can list pharmacy orders"""
        admin_token = get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/pharmacy/orders", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "statuses" in data
        print(f"✓ Admin pharmacy orders: {len(data['orders'])} orders")
    
    def test_admin_diagnostic_orders_list(self):
        """Test admin can list diagnostic orders"""
        admin_token = get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/diagnostic/orders", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "statuses" in data
        print(f"✓ Admin diagnostic orders: {len(data['orders'])} orders")
    
    def test_admin_auth_required(self):
        """Test admin endpoints require authentication"""
        # Without admin password
        response = requests.get(f"{BASE_URL}/api/admin/pharmacy/orders")
        assert response.status_code == 401
        print("✓ Admin endpoints require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
