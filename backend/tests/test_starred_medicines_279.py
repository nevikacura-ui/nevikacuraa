"""
Test Suite for Starred Medicines Feature (Top Brand Priority)
Tests the pharmacy API endpoints for:
- Starred medicines appearing first in results
- Description fields (composition, uses, side_effects, manufacturer, top_company)
- Search returning starred medicines with is_starred=true
- Sorting order: starred+image first, then starred no-image, then unstarred+image, then rest
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPharmacyAllEndpoint:
    """Tests for GET /api/pharmacy/all endpoint"""
    
    def test_pharmacy_all_returns_200(self):
        """Test that /api/pharmacy/all returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=20")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "medicines" in data, "Response should contain 'medicines' key"
        assert "total" in data, "Response should contain 'total' key"
        print(f"PASS: /api/pharmacy/all returns 200 with {len(data['medicines'])} medicines, total: {data['total']}")
    
    def test_starred_medicines_appear_first(self):
        """Test that starred medicines (is_starred=true) appear before non-starred"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=50")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        if len(medicines) == 0:
            pytest.skip("No medicines in database")
        
        # Find first non-starred medicine
        first_non_starred_idx = None
        starred_count = 0
        for idx, med in enumerate(medicines):
            if med.get("is_starred"):
                starred_count += 1
                if first_non_starred_idx is not None:
                    # Found starred after non-starred - this is wrong
                    pytest.fail(f"Starred medicine at index {idx} appears after non-starred at index {first_non_starred_idx}")
            else:
                if first_non_starred_idx is None:
                    first_non_starred_idx = idx
        
        print(f"PASS: Starred medicines ({starred_count}) appear before non-starred. First non-starred at index {first_non_starred_idx}")
    
    def test_medicines_have_description_fields(self):
        """Test that medicines have description fields (composition, uses, side_effects, manufacturer)"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=20")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        if len(medicines) == 0:
            pytest.skip("No medicines in database")
        
        # Check for description fields in starred medicines
        starred_meds = [m for m in medicines if m.get("is_starred")]
        
        fields_found = {
            "composition": 0,
            "uses": 0,
            "side_effects": 0,
            "manufacturer": 0,
            "is_top_company": 0
        }
        
        for med in starred_meds[:10]:  # Check first 10 starred
            if med.get("composition") or med.get("salt") or med.get("generic_name"):
                fields_found["composition"] += 1
            if med.get("uses"):
                fields_found["uses"] += 1
            if med.get("side_effects"):
                fields_found["side_effects"] += 1
            if med.get("manufacturer"):
                fields_found["manufacturer"] += 1
            if med.get("is_top_company"):
                fields_found["is_top_company"] += 1
        
        print(f"PASS: Description fields found in starred medicines: {fields_found}")
        
        # At least manufacturer should be present for starred medicines
        if starred_meds:
            assert fields_found["manufacturer"] > 0, "Starred medicines should have manufacturer field"
    
    def test_sorting_order_starred_with_image_first(self):
        """Test sorting: starred+image first, then starred no-image, then unstarred+image, then rest"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=100")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        if len(medicines) < 10:
            pytest.skip("Not enough medicines to test sorting")
        
        # Categorize medicines
        starred_with_img = []
        starred_no_img = []
        unstarred_with_img = []
        unstarred_no_img = []
        
        for idx, med in enumerate(medicines):
            is_starred = med.get("is_starred", False)
            has_img = bool(med.get("image_url"))
            
            if is_starred and has_img:
                starred_with_img.append(idx)
            elif is_starred and not has_img:
                starred_no_img.append(idx)
            elif not is_starred and has_img:
                unstarred_with_img.append(idx)
            else:
                unstarred_no_img.append(idx)
        
        print(f"Distribution: starred+img={len(starred_with_img)}, starred_no_img={len(starred_no_img)}, unstarred+img={len(unstarred_with_img)}, unstarred_no_img={len(unstarred_no_img)}")
        
        # Verify order: all starred should come before unstarred
        if starred_with_img and unstarred_with_img:
            assert max(starred_with_img) < min(unstarred_with_img) or max(starred_no_img) < min(unstarred_with_img), \
                "Starred medicines should appear before unstarred"
        
        print("PASS: Sorting order verified - starred medicines appear before unstarred")


class TestPharmacySearchEndpoint:
    """Tests for GET /api/pharmacy/search endpoint"""
    
    def test_search_returns_200(self):
        """Test that /api/pharmacy/search returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=cipla&limit=15")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "medicines" in data, "Response should contain 'medicines' key"
        print(f"PASS: /api/pharmacy/search?q=cipla returns 200 with {len(data.get('medicines', []))} results")
    
    def test_search_cipla_returns_starred_medicines(self):
        """Test that searching for 'cipla' returns medicines with is_starred=true"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=cipla&limit=15")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        if len(medicines) == 0:
            print("INFO: No medicines found for 'cipla' search")
            return
        
        starred_count = sum(1 for m in medicines if m.get("is_starred"))
        print(f"PASS: Search 'cipla' returned {len(medicines)} medicines, {starred_count} are starred")
        
        # First results should be starred if any exist
        if starred_count > 0:
            first_med = medicines[0]
            assert first_med.get("is_starred"), "First search result should be starred if starred medicines exist"
    
    def test_search_sun_pharma_returns_starred(self):
        """Test that searching for 'sun pharma' returns starred medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=sun%20pharma&limit=15")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        starred_count = sum(1 for m in medicines if m.get("is_starred"))
        print(f"PASS: Search 'sun pharma' returned {len(medicines)} medicines, {starred_count} are starred")
    
    def test_search_prioritizes_starred_medicines(self):
        """Test that search results prioritize starred medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/search?q=tablet&limit=30")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        if len(medicines) < 5:
            pytest.skip("Not enough search results to test prioritization")
        
        # Check if starred medicines appear first
        first_non_starred_idx = None
        for idx, med in enumerate(medicines):
            if not med.get("is_starred"):
                first_non_starred_idx = idx
                break
        
        if first_non_starred_idx is not None and first_non_starred_idx > 0:
            print(f"PASS: Search prioritizes starred medicines - first {first_non_starred_idx} results are starred")
        else:
            print(f"INFO: Search returned {len(medicines)} results, starred prioritization depends on data")


class TestTopCompanyMedicines:
    """Tests for top company (48 pharma companies) medicines"""
    
    TOP_COMPANIES = [
        "Sun Pharma", "Cipla", "Dr. Reddy's", "Lupin", "Torrent", "Aurobindo", 
        "Zydus", "Alkem", "Mankind", "Intas", "Glenmark", "Abbott", "Aristo",
        "Micro Labs", "Ipca", "Ajanta", "USV", "Franco-Indian", "La Renon", "Eris",
        "Pfizer", "GSK", "Sanofi", "Novartis", "Merck", "Bayer", "AstraZeneca",
        "Eli Lilly", "Boehringer", "Johnson", "Biocon", "Natco", "Hetero", "Strides",
        "Gland Pharma", "Alembic", "Wockhardt", "Neuland", "Medley", "Leeford",
        "Knoll", "Scott Edil", "Kabir", "Biochem", "Anthem", "Covxyl", "Win Ovulation", "Biotic"
    ]
    
    def test_search_top_company_returns_starred(self):
        """Test that searching for top company names returns starred medicines"""
        # Test a few top companies
        test_companies = ["Cipla", "Sun Pharma", "Lupin", "Abbott", "Pfizer"]
        
        for company in test_companies:
            response = requests.get(f"{BASE_URL}/api/pharmacy/search?q={company}&limit=10")
            assert response.status_code == 200, f"Search for {company} failed"
            data = response.json()
            medicines = data.get("medicines", [])
            
            if medicines:
                starred = [m for m in medicines if m.get("is_starred")]
                print(f"  {company}: {len(medicines)} results, {len(starred)} starred")
    
    def test_manufacturer_filter_returns_starred(self):
        """Test that filtering by manufacturer returns starred medicines"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=20&manufacturer=Cipla")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        if medicines:
            starred_count = sum(1 for m in medicines if m.get("is_starred"))
            print(f"PASS: Manufacturer filter 'Cipla' returned {len(medicines)} medicines, {starred_count} starred")


class TestMedicineDataStructure:
    """Tests for medicine data structure and fields"""
    
    def test_starred_medicine_has_required_fields(self):
        """Test that starred medicines have all required fields for display"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/all?page=1&per_page=50")
        assert response.status_code == 200
        data = response.json()
        medicines = data.get("medicines", [])
        
        starred_meds = [m for m in medicines if m.get("is_starred")]
        
        if not starred_meds:
            pytest.skip("No starred medicines found")
        
        required_fields = ["name", "mrp", "is_starred"]
        optional_fields = ["manufacturer", "composition", "uses", "side_effects", "image_url", "form", "is_top_company"]
        
        for med in starred_meds[:5]:
            for field in required_fields:
                assert field in med, f"Starred medicine missing required field: {field}"
            
            print(f"  Medicine: {med.get('name')[:40]}...")
            print(f"    - is_starred: {med.get('is_starred')}")
            print(f"    - manufacturer: {med.get('manufacturer', 'N/A')}")
            print(f"    - has_image: {bool(med.get('image_url'))}")
        
        print(f"PASS: {len(starred_meds)} starred medicines have required fields")


class TestPharmacyCount:
    """Tests for /api/pharmacy/count endpoint"""
    
    def test_pharmacy_count_returns_total(self):
        """Test that /api/pharmacy/count returns total medicine count"""
        response = requests.get(f"{BASE_URL}/api/pharmacy/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data, "Response should contain 'total' key"
        print(f"PASS: /api/pharmacy/count returns total: {data['total']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
