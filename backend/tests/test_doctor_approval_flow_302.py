"""
Test Doctor Approval Flow for Pharmacy Orders - Iteration 302
Tests:
1. POST /api/pharmacy/order with prescription_required items → status 'pending_doctor_approval'
2. POST /api/pharmacy/order WITHOUT prescription_required items → status 'confirmed'
3. GET /api/emr/pharmacy-orders/pending returns pending orders (auth: dr_vikas/test1234)
4. POST /api/emr/pharmacy-order/{order_id}/approve changes status to 'confirmed'
5. POST /api/emr/pharmacy-order/{order_id}/reject changes status to 'rejected'
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDoctorApprovalFlow:
    """Test pharmacy order doctor approval flow"""
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor auth token via staff login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Doctor login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, doctor_token):
        """Auth headers for doctor endpoints"""
        return {"Authorization": f"Bearer {doctor_token}"}
    
    def test_01_pharmacy_order_with_rx_items_pending_approval(self):
        """POST /api/pharmacy/order with prescription_required items → pending_doctor_approval"""
        order_data = {
            "customer": {
                "name": "TEST_RxPatient",
                "phone": "9876543210",
                "email": "test_rx@example.com"
            },
            "address": {
                "line1": "123 Test Street",
                "city": "Mumbai",
                "pincode": "400001"
            },
            "payment_method": "cod",
            "items": [
                {
                    "name": "TEST_Amoxicillin 500mg",
                    "quantity": 10,
                    "price": 50,
                    "prescription_required": True  # Rx item
                }
            ],
            "subtotal": 500,
            "discount": 0,
            "delivery_fee": 40,
            "total": 540
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy/order", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Order not successful: {data}"
        assert data.get("status") == "pending_doctor_approval", f"Expected pending_doctor_approval, got: {data.get('status')}"
        assert data.get("requires_approval") is True, f"Expected requires_approval=True: {data}"
        
        # Store order_id for later tests
        self.__class__.rx_order_id = data.get("order_id")
        print(f"✓ Rx order created with status pending_doctor_approval: {self.__class__.rx_order_id}")
    
    def test_02_pharmacy_order_without_rx_items_confirmed(self):
        """POST /api/pharmacy/order WITHOUT prescription_required items → confirmed"""
        order_data = {
            "customer": {
                "name": "TEST_OTCPatient",
                "phone": "9876543211",
                "email": "test_otc@example.com"
            },
            "address": {
                "line1": "456 Test Avenue",
                "city": "Mumbai",
                "pincode": "400002"
            },
            "payment_method": "cod",
            "items": [
                {
                    "name": "TEST_Paracetamol 500mg",
                    "quantity": 5,
                    "price": 20,
                    "prescription_required": False  # OTC item
                }
            ],
            "subtotal": 100,
            "discount": 0,
            "delivery_fee": 40,
            "total": 140
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy/order", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Order not successful: {data}"
        assert data.get("status") == "confirmed", f"Expected confirmed, got: {data.get('status')}"
        assert data.get("requires_approval") is False, f"Expected requires_approval=False: {data}"
        
        self.__class__.otc_order_id = data.get("order_id")
        print(f"✓ OTC order created with status confirmed: {self.__class__.otc_order_id}")
    
    def test_03_doctor_login_success(self, doctor_token):
        """Verify doctor login works with dr_vikas/test1234"""
        assert doctor_token is not None, "Doctor token should not be None"
        assert len(doctor_token) > 10, "Token should be a valid JWT"
        print(f"✓ Doctor login successful, token length: {len(doctor_token)}")
    
    def test_04_get_pending_pharmacy_orders(self, auth_headers):
        """GET /api/emr/pharmacy-orders/pending returns pending orders"""
        response = requests.get(
            f"{BASE_URL}/api/emr/pharmacy-orders/pending",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get pending orders failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Request not successful: {data}"
        assert "orders" in data, f"No orders field in response: {data}"
        assert "count" in data, f"No count field in response: {data}"
        
        # Check if our test order is in the pending list
        orders = data.get("orders", [])
        order_ids = [o.get("id") for o in orders]
        
        if hasattr(self.__class__, 'rx_order_id'):
            assert self.__class__.rx_order_id in order_ids, f"Test Rx order not found in pending orders"
            print(f"✓ Found test Rx order in pending list")
        
        print(f"✓ Get pending orders returned {data.get('count')} orders")
    
    def test_05_approve_pharmacy_order(self, auth_headers):
        """POST /api/emr/pharmacy-order/{order_id}/approve changes status to confirmed"""
        if not hasattr(self.__class__, 'rx_order_id'):
            pytest.skip("No Rx order created in previous test")
        
        order_id = self.__class__.rx_order_id
        response = requests.post(
            f"{BASE_URL}/api/emr/pharmacy-order/{order_id}/approve",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Approve order failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Approval not successful: {data}"
        assert data.get("status") == "confirmed", f"Expected confirmed status: {data}"
        assert data.get("order_id") == order_id, f"Order ID mismatch: {data}"
        
        print(f"✓ Order {order_id} approved and status changed to confirmed")
    
    def test_06_create_order_for_rejection_test(self):
        """Create another Rx order for rejection test"""
        order_data = {
            "customer": {
                "name": "TEST_RejectPatient",
                "phone": "9876543212",
                "email": "test_reject@example.com"
            },
            "address": {
                "line1": "789 Test Road",
                "city": "Mumbai",
                "pincode": "400003"
            },
            "payment_method": "cod",
            "items": [
                {
                    "name": "TEST_Antibiotic XYZ",
                    "quantity": 7,
                    "price": 100,
                    "prescription_required": True
                }
            ],
            "subtotal": 700,
            "discount": 0,
            "delivery_fee": 40,
            "total": 740
        }
        
        response = requests.post(f"{BASE_URL}/api/pharmacy/order", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "pending_doctor_approval"
        self.__class__.reject_order_id = data.get("order_id")
        print(f"✓ Created order for rejection test: {self.__class__.reject_order_id}")
    
    def test_07_reject_pharmacy_order(self, auth_headers):
        """POST /api/emr/pharmacy-order/{order_id}/reject changes status to rejected"""
        if not hasattr(self.__class__, 'reject_order_id'):
            pytest.skip("No order created for rejection test")
        
        order_id = self.__class__.reject_order_id
        response = requests.post(
            f"{BASE_URL}/api/emr/pharmacy-order/{order_id}/reject",
            headers=auth_headers,
            json={"reason": "Test rejection - prescription verification needed"}
        )
        assert response.status_code == 200, f"Reject order failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Rejection not successful: {data}"
        assert data.get("status") == "rejected", f"Expected rejected status: {data}"
        assert data.get("order_id") == order_id, f"Order ID mismatch: {data}"
        
        print(f"✓ Order {order_id} rejected successfully")
    
    def test_08_verify_approved_order_not_in_pending(self, auth_headers):
        """Verify approved order is no longer in pending list"""
        if not hasattr(self.__class__, 'rx_order_id'):
            pytest.skip("No Rx order to verify")
        
        response = requests.get(
            f"{BASE_URL}/api/emr/pharmacy-orders/pending",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        order_ids = [o.get("id") for o in orders]
        
        # Approved order should NOT be in pending list
        assert self.__class__.rx_order_id not in order_ids, "Approved order should not be in pending list"
        print(f"✓ Approved order correctly removed from pending list")
    
    def test_09_get_all_orders_with_status_filter(self, auth_headers):
        """GET /api/emr/pharmacy-orders/all with status filter"""
        # Test confirmed filter
        response = requests.get(
            f"{BASE_URL}/api/emr/pharmacy-orders/all?status=confirmed",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get all orders failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        
        # All returned orders should have confirmed status
        for order in data.get("orders", []):
            assert order.get("status") == "confirmed", f"Order has wrong status: {order.get('status')}"
        
        print(f"✓ Get all orders with status filter working, returned {data.get('count')} confirmed orders")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
