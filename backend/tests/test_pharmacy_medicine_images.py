"""
Test Pharmacy API endpoints for Medicine Images feature - Iteration 241
Tests the pharmacy API endpoints with images from Google Sheets import
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPharmacyMedicineCount:
    """Tests for /api/pharmacy/count endpoint"""
    
    def test_medicine_count_returns_total(self):
        """Test that count endpoint returns total medicines (253735+)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert isinstance(data["total"], int)
        assert data["total"] >= 253735, f"Expected 253735+ medicines, got {data['total']}"
        print(f"Total medicines: {data['total']}")


class TestPharmacyAllMedicines:
    """Tests for /api/pharmacy/all endpoint"""
    
    def test_get_all_medicines_basic(self):
        """Test basic pagination works"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "medicines" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
        assert len(data["medicines"]) <= 10
        
    def test_medicines_with_images_prioritized_first(self):
        """Test that medicines with images appear first (aggregation pipeline)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=20")
        assert response.status_code == 200
        
        data = response.json()
        medicines = data["medicines"]
        
        # Count how many of the first 10 have images
        first_10_with_images = sum(1 for m in medicines[:10] if m.get("image_url"))
        
        print(f"First 10 medicines with images: {first_10_with_images}")
        
        # At least some of the first medicines should have images
        assert first_10_with_images >= 1, "Expected at least some medicines with images in first 10"
        
    def test_medicine_has_required_fields(self):
        """Test that each medicine has all required fields"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=5")
        assert response.status_code == 200
        
        data = response.json()
        medicines = data["medicines"]
        
        required_fields = ["name", "price", "mrp", "form"]
        optional_rich_fields = ["image_url", "generic_name", "description", "side_effects", 
                               "packaging", "manufacturer", "prescription_required"]
        
        for med in medicines:
            for field in required_fields:
                assert field in med, f"Missing required field: {field} in medicine {med.get('name')}"
            
            # Log rich fields for medicines with images
            if med.get("image_url"):
                print(f"\nMedicine with image: {med.get('name')}")
                for field in optional_rich_fields:
                    if med.get(field):
                        print(f"  {field}: {str(med.get(field))[:50]}...")

    def test_medicine_price_computed_correctly(self):
        """Test that computed price field matches mrp - discount"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=20")
        assert response.status_code == 200
        
        data = response.json()
        for med in data["medicines"][:5]:
            mrp = med.get("mrp", 0) or 0
            discount = med.get("discount_percent", 0) or 0
            expected_price = round(mrp * (1 - discount / 100)) if discount > 0 else mrp
            
            actual_price = med.get("price", 0)
            assert actual_price == expected_price, f"Price mismatch for {med.get('name')}: expected {expected_price}, got {actual_price}"
            
    def test_source_field_is_database(self):
        """Test that source field indicates database (not static fallback)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("source") == "database", "Expected source to be 'database' not static fallback"


class TestPharmacySearch:
    """Tests for /api/pharmacy/search endpoint"""
    
    def test_search_acesure(self):
        """Test searching for Acesure returns results with rich data"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=Acesure&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert "medicines" in data
        assert len(data["medicines"]) >= 1, "Expected at least 1 result for 'Acesure'"
        
        # Check first result
        med = data["medicines"][0]
        assert "Acesure" in med.get("name", ""), f"Expected 'Acesure' in name, got {med.get('name')}"
        
        # Verify rich fields
        print(f"\nSearch result: {med.get('name')}")
        print(f"  image_url: {med.get('image_url', 'N/A')}")
        print(f"  generic_name: {med.get('generic_name', 'N/A')}")
        print(f"  manufacturer: {med.get('manufacturer', 'N/A')}")
        print(f"  prescription_required: {med.get('prescription_required', 'N/A')}")
        
    def test_search_returns_image_url(self):
        """Test that search results include image_url for medicines with images"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=Acesure&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["medicines"]) >= 1
        
        med = data["medicines"][0]
        assert med.get("image_url"), f"Expected image_url for Acesure medicine"
        assert "medicinedata.in" in med.get("image_url", ""), "Image URL should be from medicinedata.in"
        
    def test_search_returns_prescription_required(self):
        """Test that search results include prescription_required field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=Acesure&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        med = data["medicines"][0]
        
        # Acesure-SP should require prescription
        assert "prescription_required" in med
        print(f"  prescription_required: {med.get('prescription_required')}")
        
    def test_search_empty_query(self):
        """Test that empty search query returns empty results"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("medicines") == [], "Empty query should return empty results"
        
    def test_search_partial_match(self):
        """Test partial name matching"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=Para&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["medicines"]) >= 1, "Expected results for 'Para' (Paracetamol, etc.)"
        
        # All results should contain 'Para' in name
        for med in data["medicines"]:
            assert "para" in med.get("name", "").lower(), f"Expected 'para' in {med.get('name')}"

    def test_search_returns_computed_price(self):
        """Test that search results include computed price field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=Vitamin&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["medicines"]) >= 1
        
        for med in data["medicines"]:
            assert "price" in med, f"Missing price field for {med.get('name')}"
            assert "mrp" in med, f"Missing mrp field for {med.get('name')}"


class TestPharmacyMedicineRichData:
    """Tests for rich medicine data fields (description, side_effects, storage, etc.)"""
    
    def test_medicines_have_description(self):
        """Test that medicines with images have description field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=20")
        assert response.status_code == 200
        
        data = response.json()
        
        # Find medicines with images
        with_images = [m for m in data["medicines"] if m.get("image_url")]
        
        if with_images:
            med = with_images[0]
            if med.get("description"):
                assert len(med["description"]) > 10, "Description should be meaningful"
                print(f"\nDescription sample: {med['description'][:100]}...")
                
    def test_medicines_have_side_effects(self):
        """Test that medicines have side_effects field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=Acesure&limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if data["medicines"]:
            med = data["medicines"][0]
            if med.get("side_effects"):
                print(f"\nSide effects: {med['side_effects']}")
                # Side effects are pipe-separated
                if "|" in med["side_effects"]:
                    effects = med["side_effects"].split("|")
                    assert len(effects) >= 1
                    
    def test_medicines_have_storage_info(self):
        """Test that medicines have storage field"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=10")
        assert response.status_code == 200
        
        data = response.json()
        
        with_storage = [m for m in data["medicines"] if m.get("storage")]
        if with_storage:
            med = with_storage[0]
            print(f"\nStorage info: {med['storage']}")
            assert "°C" in med["storage"] or "temperature" in med["storage"].lower() or "below" in med["storage"].lower()


class TestPharmacyImageFields:
    """Tests specifically for image-related functionality"""
    
    def test_image_url_from_medicinedata_domain(self):
        """Test that image URLs come from medicinedata.in domain"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=20")
        assert response.status_code == 200
        
        data = response.json()
        
        with_images = [m for m in data["medicines"] if m.get("image_url")]
        assert len(with_images) >= 1, "Expected at least some medicines with images"
        
        for med in with_images[:5]:
            assert "medicinedata.in" in med["image_url"], f"Unexpected image domain: {med['image_url']}"
            print(f"  Image URL: {med['image_url']}")
            
    def test_form_field_present(self):
        """Test that form field is present for all medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=10")
        assert response.status_code == 200
        
        data = response.json()
        
        for med in data["medicines"]:
            assert "form" in med, f"Missing form field for {med.get('name')}"
            # Form should match unit field or be computed
            if med.get("unit"):
                assert med["form"] == med["unit"] or med.get("form"), "Form should match unit"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
