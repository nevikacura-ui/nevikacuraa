import requests
import sys
import json
from datetime import datetime, timedelta

class NevikaHealthcareAPITester:
    def __init__(self, base_url="https://healix-portal-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}, Expected: {expected_status}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            return {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return {}

    def test_health_endpoint(self):
        """Test health endpoint"""
        try:
            # Try the direct backend health endpoint first
            response = requests.get("http://localhost:8001/health", timeout=10)
            success = response.status_code == 200
            
            if success:
                try:
                    data = response.json()
                    expected_response = {"status": "healthy", "service": "nevika-cura-api"}
                    success = data == expected_response
                    details = f"Status: {response.status_code}, Response: {data}"
                except:
                    success = False
                    details = f"Status: {response.status_code}, Invalid JSON response"
            else:
                details = f"Status: {response.status_code}, Expected: 200"
            
            self.log_test("Health Endpoint (Direct)", success, details)
            return success
            
        except Exception as e:
            # If direct access fails, note that health endpoint is not externally accessible
            self.log_test("Health Endpoint (Direct)", False, f"Health endpoint not externally accessible via ingress (expected): {str(e)}")
            return True  # This is actually expected behavior

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_pharmacy_inventory(self):
        """Test pharmacy inventory endpoint - should return 665 medicines"""
        try:
            response = requests.get(f"{self.api_url}/pharmacy/inventory", timeout=10)
            success = response.status_code == 200
            
            if success:
                try:
                    data = response.json()
                    # API returns {"medicines": [...], "total": count}
                    medicines = data.get('medicines', [])
                    total_count = data.get('total', 0)
                    medicine_count = len(medicines)
                    
                    success = medicine_count == 665 and total_count == 665
                    details = f"Status: {response.status_code}, Medicine count: {medicine_count}, Total: {total_count}, Expected: 665"
                    
                    if not success:
                        details += f" - First few medicines: {[m.get('name', 'Unknown') for m in medicines[:3]]}"
                        
                except Exception as e:
                    success = False
                    details = f"Status: {response.status_code}, JSON parse error: {str(e)}"
            else:
                details = f"Status: {response.status_code}, Expected: 200"
            
            self.log_test("Pharmacy Inventory (665 medicines)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Pharmacy Inventory (665 medicines)", False, f"Exception: {str(e)}")
            return False

    def test_pharmacy_inventory_search(self):
        """Test pharmacy inventory search for ABENDOL"""
        try:
            response = requests.get(f"{self.api_url}/pharmacy/inventory?search=ABENDOL", timeout=10)
            success = response.status_code == 200
            
            if success:
                try:
                    data = response.json()
                    # API returns {"medicines": [...], "total": count}
                    medicines = data.get('medicines', [])
                    total_count = data.get('total', 0)
                    
                    # Check if ABENDOL 10 is found
                    abendol_found = any(med.get('name', '').upper() == 'ABENDOL 10' for med in medicines)
                    success = abendol_found and len(medicines) > 0
                    details = f"Status: {response.status_code}, Results: {len(medicines)}, Total: {total_count}, ABENDOL 10 found: {abendol_found}"
                    
                    if medicines:
                        details += f" - Found medicines: {[m.get('name', 'Unknown') for m in medicines[:3]]}"
                        
                except Exception as e:
                    success = False
                    details = f"Status: {response.status_code}, JSON parse error: {str(e)}"
            else:
                details = f"Status: {response.status_code}, Expected: 200"
            
            self.log_test("Pharmacy Inventory Search (ABENDOL)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Pharmacy Inventory Search (ABENDOL)", False, f"Exception: {str(e)}")
            return False

    def test_pharmacy_forms(self):
        """Test pharmacy forms endpoint"""
        try:
            response = requests.get(f"{self.api_url}/pharmacy/forms", timeout=10)
            success = response.status_code == 200
            
            if success:
                try:
                    data = response.json()
                    # API returns {"forms": [...]}
                    forms = data.get('forms', [])
                    success = isinstance(forms, list) and len(forms) > 0
                    details = f"Status: {response.status_code}, Forms count: {len(forms)}"
                    
                    if forms:
                        details += f" - Sample forms: {forms[:5]}"
                        
                except Exception as e:
                    success = False
                    details = f"Status: {response.status_code}, JSON parse error: {str(e)}"
            else:
                details = f"Status: {response.status_code}, Expected: 200"
            
            self.log_test("Pharmacy Forms Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("Pharmacy Forms Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_user_registration(self):
        """Test user registration with WhatsApp notification link"""
        test_user_data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "testpass123",
            "phone": "9876543210",
            "name": "Test User"
        }
        
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if response and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            
            # Check for WhatsApp notification link
            whatsapp_link = response.get('whatsapp_notification_link', '')
            has_whatsapp_link = 'whatsapp_notification_link' in response
            has_correct_number = '9833188288' in whatsapp_link
            
            success = has_whatsapp_link and has_correct_number
            details = f"WhatsApp link present: {has_whatsapp_link}, Contains 9833188288: {has_correct_number}"
            
            if has_whatsapp_link:
                details += f" - Link: {whatsapp_link[:100]}..."
            
            self.log_test("User Registration WhatsApp Link", success, details)
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # First register a user
        test_email = f"login_test_{datetime.now().strftime('%H%M%S')}@example.com"
        register_data = {
            "email": test_email,
            "password": "TestPass123!",
            "phone": "9876543210",
            "name": "Login Test User"
        }
        
        # Register user first
        self.run_test("Pre-Login Registration", "POST", "auth/register", 200, data=register_data)
        
        # Now test login
        login_data = {
            "email": test_email,
            "password": "TestPass123!"
        }
        
        response = self.run_test("User Login", "POST", "auth/login", 200, data=login_data)
        return bool(response and 'token' in response)

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
        
        response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return bool(response and 'id' in response)

    def test_create_appointment(self):
        """Test creating an appointment with email notification"""
        if not self.token:
            self.log_test("Create Appointment", False, "No token available")
            return False
        
        appointment_data = {
            "doctor": "Dr. Vikas Jha",
            "clinic": "DiaGyn Healthcare",
            "date": "2026-01-15",
            "time": "10:00 AM",
            "patient_name": "Test Patient",
            "patient_phone": "9876543210"
        }
        
        response = self.run_test(
            "Create Appointment (Email Test)",
            "POST",
            "appointments",
            200,
            data=appointment_data
        )
        
        success = bool(response and 'id' in response)
        if success:
            print(f"   📧 Email should be sent to nevikacura@gmail.com for appointment {response.get('id')}")
        
        return success

    def test_get_appointments(self):
        """Test getting user appointments"""
        if not self.token:
            self.log_test("Get Appointments", False, "No token available")
            return False
        
        response = self.run_test("Get Appointments", "GET", "appointments", 200)
        return isinstance(response, list)

    def test_create_diagnostic_order(self):
        """Test creating a diagnostic order with email notification"""
        if not self.token:
            self.log_test("Create Diagnostic Order", False, "No token available")
            return False
        
        diagnostic_data = {
            "tests": ["CBC", "Blood Sugar"],
            "preferred_date": "2026-01-15",
            "patient_name": "Test Patient",
            "patient_phone": "9876543210"
        }
        
        response = self.run_test(
            "Create Diagnostic Order (Email Test)",
            "POST",
            "diagnostics",
            200,
            data=diagnostic_data
        )
        
        success = bool(response and 'id' in response)
        if success:
            print(f"   📧 Email should be sent to nevikacura@gmail.com for diagnostic order {response.get('id')}")
        
        return success

    def test_get_diagnostic_orders(self):
        """Test getting diagnostic orders"""
        if not self.token:
            self.log_test("Get Diagnostic Orders", False, "No token available")
            return False
        
        response = self.run_test("Get Diagnostic Orders", "GET", "diagnostics", 200)
        return isinstance(response, list)

    def test_create_pharmacy_order(self):
        """Test creating a pharmacy order with email notification"""
        if not self.token:
            self.log_test("Create Pharmacy Order", False, "No token available")
            return False
        
        pharmacy_data = {
            "medicines": [{"name": "ABENDOL 10", "quantity": 2}],
            "patient_name": "Test Patient",
            "patient_phone": "9876543210",
            "delivery_address": "Test Address, Mumbai"
        }
        
        response = self.run_test(
            "Create Pharmacy Order (Email Test)",
            "POST",
            "pharmacy",
            200,
            data=pharmacy_data
        )
        
        success = bool(response and 'id' in response)
        if success:
            print(f"   📧 Email should be sent to nevikacura@gmail.com for pharmacy order {response.get('id')}")
        
        return success

    def test_get_pharmacy_orders(self):
        """Test getting pharmacy orders"""
        if not self.token:
            self.log_test("Get Pharmacy Orders", False, "No token available")
            return False
        
        response = self.run_test("Get Pharmacy Orders", "GET", "pharmacy", 200)
        return isinstance(response, list)

    def test_file_upload_without_auth(self):
        """Test file upload without authentication (should work as fallback)"""
        # Create a simple test file
        test_file_content = b"Test prescription content"
        files = {'file': ('test_prescription.txt', test_file_content, 'text/plain')}
        
        try:
            response = requests.post(
                f"{self.api_url}/upload",
                files=files,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    data = response.json()
                    if 'url' in data:
                        details += f", URL returned: {data['url'][:50]}..."
                    else:
                        success = False
                        details += ", No URL in response"
                except:
                    success = False
                    details += ", Invalid JSON response"
            
            self.log_test("File Upload (No Auth)", success, details)
            return success
            
        except Exception as e:
            self.log_test("File Upload (No Auth)", False, f"Exception: {str(e)}")
            return False

    def test_drive_connect_endpoint(self):
        """Test Google Drive connection endpoint"""
        if not self.token:
            self.log_test("Drive Connect", False, "No token available")
            return False
        
        response = self.run_test("Drive Connect", "GET", "drive/connect", 200)
        return bool(response and 'authorization_url' in response)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Nevika Cura Healthcare API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test health endpoint first
        self.test_health_endpoint()
        
        # Test pharmacy inventory (high priority)
        self.test_pharmacy_inventory()
        self.test_pharmacy_inventory_search()
        self.test_pharmacy_forms()
        
        # Test basic connectivity
        self.test_root_endpoint()
        
        # Test authentication with WhatsApp notification
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        
        # Test order creation with email notifications (high priority)
        self.test_create_appointment()
        self.test_create_diagnostic_order()
        self.test_create_pharmacy_order()
        
        # Test user order history
        self.test_get_appointments()
        self.test_get_diagnostic_orders()
        self.test_get_pharmacy_orders()
        
        # Test file upload
        self.test_file_upload_without_auth()
        
        # Test Google Drive integration
        self.test_drive_connect_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = NevikaHealthcareAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())