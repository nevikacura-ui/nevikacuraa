"""
Orange Pharmacy Billing System - Backend API Tests
Tests for: POS billing, customer management, reports, CSV, barcode, purchases
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')
STAFF_CREDENTIALS = {"username": "staff_orange", "password": "test1234"}


class TestPharmacyBillingAuth:
    """Staff authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for pharmacy staff"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class") 
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}

    def test_staff_login(self):
        """Test pharmacy staff can login"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "staff" in data
        print(f"Staff login successful: {data['staff'].get('name', 'Unknown')}, role: {data['staff'].get('role', 'Unknown')}")


class TestBillingDashboard:
    """Dashboard and stats tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_get_dashboard(self, auth_headers):
        """Test dashboard endpoint returns today's stats"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "today" in data
        assert "inventory" in data
        assert "outstanding_dues" in data
        print(f"Dashboard - Today's revenue: {data['today'].get('revenue', 0)}, Bills: {data['today'].get('bills', 0)}")
        print(f"Inventory - Total: {data['inventory'].get('total', 0)}, Low stock: {data['inventory'].get('low_stock', 0)}")
    
    def test_dashboard_requires_auth(self):
        """Test dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/dashboard")
        assert response.status_code == 401


class TestMedicineSearch:
    """Medicine search for POS billing"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_search_medicine_para(self, auth_headers):
        """Test searching for 'para' returns paracetamol products"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/medicine-search?q=para", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"Search 'para' returned {len(data['medicines'])} results")
        if data['medicines']:
            med = data['medicines'][0]
            print(f"First result: {med.get('name', 'Unknown')}, MRP: {med.get('mrp', 0)}, Stock: {med.get('stock_quantity', 0)}")
            assert "name" in med
            assert "mrp" in med
            assert "id" in med
    
    def test_search_empty_query(self, auth_headers):
        """Test empty search returns empty list"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/medicine-search?q=", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["medicines"] == []


class TestBillingPOS:
    """POS billing and bill creation tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    @pytest.fixture(scope="class")
    def sample_medicine(self, auth_headers):
        """Get a medicine to use for billing test"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/medicine-search?q=para", headers=auth_headers)
        if response.status_code == 200 and response.json().get("medicines"):
            return response.json()["medicines"][0]
        # Fallback to general search
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines?limit=1", headers=auth_headers)
        if response.status_code == 200 and response.json().get("medicines"):
            return response.json()["medicines"][0]
        pytest.skip("No medicines available for billing test")
    
    def test_create_bill_cash(self, auth_headers, sample_medicine):
        """Test creating a bill with cash payment"""
        bill_data = {
            "customer_name": "TEST_Walk-in",
            "customer_phone": "9999888877",
            "items": [{
                "medicine_id": sample_medicine["id"],
                "name": sample_medicine["name"],
                "quantity": 1,
                "mrp": sample_medicine.get("mrp", 10),
                "discount_percent": 0,
                "gst_percent": 0,
                "batch_no": sample_medicine.get("batch_no", ""),
                "expiry": sample_medicine.get("expiry", ""),
                "hsn_code": sample_medicine.get("hsn_code", ""),
            }],
            "payment_mode": "cash",
        }
        response = requests.post(f"{BASE_URL}/api/pharmacy-billing/bills", json=bill_data, headers=auth_headers)
        assert response.status_code == 200, f"Bill creation failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "bill" in data
        bill = data["bill"]
        assert "bill_number" in bill
        assert "grand_total" in bill
        assert bill["status"] == "paid"
        print(f"Created bill: {bill['bill_number']}, Total: {bill['grand_total']}, Status: {bill['status']}")
        return bill
    
    def test_create_bill_credit(self, auth_headers, sample_medicine):
        """Test creating a credit bill with partial payment"""
        bill_data = {
            "customer_name": "TEST_Credit Customer",
            "customer_phone": "9999777766",
            "items": [{
                "medicine_id": sample_medicine["id"],
                "name": sample_medicine["name"],
                "quantity": 2,
                "mrp": 100,
                "discount_percent": 10,
                "gst_percent": 0,
            }],
            "payment_mode": "credit",
            "paid_amount": 50,
        }
        response = requests.post(f"{BASE_URL}/api/pharmacy-billing/bills", json=bill_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        bill = data["bill"]
        assert bill["status"] in ["partial", "credit"]
        assert bill["due_amount"] > 0
        print(f"Credit bill: {bill['bill_number']}, Paid: {bill['paid_amount']}, Due: {bill['due_amount']}")
    
    def test_list_bills(self, auth_headers):
        """Test listing bills"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/bills?limit=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "bills" in data
        assert "total" in data
        print(f"Bills list: {len(data['bills'])} bills, Total: {data['total']}")
    
    def test_create_bill_requires_items(self, auth_headers):
        """Test bill creation fails without items"""
        bill_data = {"customer_name": "Test", "items": [], "payment_mode": "cash"}
        response = requests.post(f"{BASE_URL}/api/pharmacy-billing/bills", json=bill_data, headers=auth_headers)
        assert response.status_code == 400


class TestReportsAPI:
    """Reports and analytics tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_daily_sales_report(self, auth_headers):
        """Test daily sales report"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/reports/daily-sales", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "total_revenue" in data
        assert "total_bills" in data
        assert "payment_breakdown" in data
        print(f"Daily report for {data['date']}: Revenue: {data['total_revenue']}, Bills: {data['total_bills']}")
    
    def test_sales_summary_7_days(self, auth_headers):
        """Test 7-day sales summary"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/reports/sales-summary?days=7", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert data["days"] == 7
        assert len(data["summary"]) == 7
        print(f"7-day summary: {[d['date'] for d in data['summary'][:3]]}...")
    
    def test_top_selling(self, auth_headers):
        """Test top selling items report"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/reports/top-selling?days=30", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "top_items" in data
        assert "period_days" in data
        print(f"Top selling: {len(data['top_items'])} items in last {data['period_days']} days")
    
    def test_stock_report(self, auth_headers):
        """Test stock report"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/reports/stock?filter=all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "medicines" in data
        stats = data["stats"]
        print(f"Stock report - Total: {stats.get('total_items', 0)}, Low: {stats.get('low_stock', 0)}, Out: {stats.get('out_of_stock', 0)}")


class TestCustomerManagement:
    """Customer management tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_list_customers(self, auth_headers):
        """Test listing customers"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/customers?limit=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "customers" in data
        print(f"Customers list: {len(data['customers'])} customers, Total: {data.get('total', 0)}")
    
    def test_list_customers_with_dues(self, auth_headers):
        """Test filtering customers with dues"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/customers?has_dues=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "customers" in data
        print(f"Customers with dues: {len(data['customers'])}")
    
    def test_create_customer(self, auth_headers):
        """Test creating a new customer"""
        # Use unique phone to avoid duplicate errors
        phone = f"TEST_{int(time.time())}"[-10:]
        customer_data = {
            "name": "TEST_Customer",
            "phone": phone,
            "email": "test@example.com",
            "address": "Test Address",
        }
        response = requests.post(f"{BASE_URL}/api/pharmacy-billing/customers", json=customer_data, headers=auth_headers)
        # May return 400 if phone exists
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print(f"Created customer: {data['customer']['name']}, Phone: {data['customer']['phone']}")
        else:
            print(f"Customer creation returned {response.status_code} - may be duplicate")
    
    def test_customer_lookup(self, auth_headers):
        """Test customer lookup by phone"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/customers/lookup/999", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "found" in data
        if data["found"]:
            print(f"Found customer: {data['customer']['name']}")
        else:
            print("Customer lookup: No match found (expected for partial phone)")


class TestCSVOperations:
    """CSV import/export tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_download_csv_template(self, auth_headers):
        """Test CSV template download"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/csv-template", headers=auth_headers)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        # Check template has header row
        content = response.content.decode()
        assert "name" in content.lower()
        print(f"CSV template downloaded: {len(content)} bytes")
    
    def test_export_csv(self, auth_headers):
        """Test inventory CSV export"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/csv-export", headers=auth_headers)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.content.decode()
        print(f"CSV export downloaded: {len(content)} bytes")


class TestBarcodeOperations:
    """Barcode generation tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_bulk_generate_barcodes(self, auth_headers):
        """Test bulk barcode generation"""
        response = requests.post(f"{BASE_URL}/api/pharmacy-billing/barcode/bulk-generate", json=[], headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Barcodes generated: {data.get('generated', 0)}")
    
    def test_get_sticker_data(self, auth_headers):
        """Test getting sticker data for barcode printing"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/barcode/sticker-data?limit=65", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "count" in data
        print(f"Sticker data: {data['count']} medicines with barcodes")
    
    def test_barcode_lookup(self, auth_headers):
        """Test barcode lookup (may not find if no barcode exists)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/barcode/lookup/ORG123456", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "found" in data
        print(f"Barcode lookup: {'Found' if data['found'] else 'Not found'}")


class TestPurchaseEntry:
    """Purchase entry and supplier tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_list_suppliers(self, auth_headers):
        """Test listing suppliers"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/suppliers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "suppliers" in data
        print(f"Suppliers: {len(data['suppliers'])}")
    
    def test_create_purchase(self, auth_headers):
        """Test creating a purchase entry"""
        purchase_data = {
            "supplier_name": "TEST_Supplier",
            "invoice_number": f"INV-TEST-{int(time.time())}",
            "items": [{
                "medicine_name": "TEST_Medicine_Purchase",
                "batch_no": "B2026-001",
                "expiry": "2027-12",
                "quantity": 100,
                "purchase_rate": 10.0,
                "mrp": 15.0,
                "gst_percent": 12,
                "location": "Rack-A",
            }],
            "notes": "Test purchase entry",
        }
        response = requests.post(f"{BASE_URL}/api/pharmacy-billing/purchases", json=purchase_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        purchase = data["purchase"]
        print(f"Created purchase: {purchase['purchase_no']}, Items: {purchase['item_count']}, Total: {purchase['grand_total']}")
    
    def test_list_purchases(self, auth_headers):
        """Test listing purchase entries"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/purchases?limit=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "purchases" in data
        print(f"Purchases list: {len(data['purchases'])}")
    
    def test_purchase_csv_template(self, auth_headers):
        """Test purchase CSV template download"""
        response = requests.get(f"{BASE_URL}/api/pharmacy-billing/purchase-csv-template", headers=auth_headers)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("Purchase CSV template downloaded")


class TestInventoryAPI:
    """Test main inventory API (used by inventory tab)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/staff/login", json=STAFF_CREDENTIALS)
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_list_medicines(self, auth_headers):
        """Test listing medicines from main pharmacy API"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines?limit=30", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        print(f"Medicines: {len(data['medicines'])} shown, Total in inventory: {data['total']}")
    
    def test_filter_low_stock(self, auth_headers):
        """Test filtering low stock medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines?stock_filter=low_stock&limit=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"Low stock medicines: {len(data['medicines'])}")
    
    def test_search_medicines(self, auth_headers):
        """Test searching medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/medicines?q=para&limit=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "medicines" in data
        print(f"Search 'para' in inventory: {len(data['medicines'])} results")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
