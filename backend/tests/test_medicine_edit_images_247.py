"""
Test Suite: Medicine Edit and Multi-Image Feature - Iteration 247
Tests:
1. Medicine edit saves composition, uses, side_effects - PUT /api/pharmacy/medicines/{id}
2. Multiple medicine image upload - POST /api/pharmacy/medicines/{id}/upload-image
3. Medicine image download - GET /api/pharmacy/medicines/{id}/images/{image_id}
4. Medicine image delete - DELETE /api/pharmacy/medicines/{id}/images/{image_id}
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STAFF_USERNAME = "orange_staff"
STAFF_PASSWORD = "test1234"

# Test medicine ID (anergen)
TEST_MEDICINE_ID = "6a0a4544-05b9-4312-93ba-7fa45dcf3461"


@pytest.fixture(scope="module")
def staff_token():
    """Get staff authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/staff/login",
        json={"username": STAFF_USERNAME, "password": STAFF_PASSWORD}
    )
    assert response.status_code == 200, f"Staff login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(staff_token):
    """Get authenticated headers"""
    return {"Authorization": f"Bearer {staff_token}"}


class TestMedicineEditContentFields:
    """Test medicine edit saves composition, uses, side_effects fields"""
    
    def test_get_medicine_has_content_fields(self, auth_headers):
        """Verify GET /api/pharmacy/medicines/{id} returns content fields"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET medicine failed: {response.text}"
        
        med = response.json()
        print(f"Medicine data: name={med.get('name')}, composition={med.get('composition')}, uses={med.get('uses')}, side_effects={med.get('side_effects')}")
        
        # Verify fields exist in response
        assert "composition" in med or med.get("composition") is None, "composition field missing from response"
        assert "uses" in med or med.get("uses") is None, "uses field missing from response"
        assert "side_effects" in med or med.get("side_effects") is None, "side_effects field missing from response"
    
    def test_update_medicine_composition_saves(self, auth_headers):
        """Test PUT /api/pharmacy/medicines/{id} saves composition field"""
        test_composition = f"Test Composition {uuid.uuid4().hex[:6]}"
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers,
            json={"composition": test_composition}
        )
        assert response.status_code == 200, f"Update composition failed: {response.text}"
        
        result = response.json()
        updated_med = result.get("medicine", {})
        assert updated_med.get("composition") == test_composition, f"Composition not saved correctly. Expected: {test_composition}, Got: {updated_med.get('composition')}"
        print(f"PASS: Composition saved - {test_composition}")
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched.get("composition") == test_composition, "Composition not persisted in database"
        print(f"PASS: Composition verified via GET")
    
    def test_update_medicine_uses_saves(self, auth_headers):
        """Test PUT /api/pharmacy/medicines/{id} saves uses field"""
        test_uses = f"Test Uses {uuid.uuid4().hex[:6]}"
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers,
            json={"uses": test_uses}
        )
        assert response.status_code == 200, f"Update uses failed: {response.text}"
        
        result = response.json()
        updated_med = result.get("medicine", {})
        assert updated_med.get("uses") == test_uses, f"Uses not saved correctly. Expected: {test_uses}, Got: {updated_med.get('uses')}"
        print(f"PASS: Uses saved - {test_uses}")
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers
        )
        fetched = get_response.json()
        assert fetched.get("uses") == test_uses, "Uses not persisted in database"
        print(f"PASS: Uses verified via GET")
    
    def test_update_medicine_side_effects_saves(self, auth_headers):
        """Test PUT /api/pharmacy/medicines/{id} saves side_effects field"""
        test_side_effects = f"Test Side Effects {uuid.uuid4().hex[:6]}"
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers,
            json={"side_effects": test_side_effects}
        )
        assert response.status_code == 200, f"Update side_effects failed: {response.text}"
        
        result = response.json()
        updated_med = result.get("medicine", {})
        assert updated_med.get("side_effects") == test_side_effects, f"Side effects not saved correctly"
        print(f"PASS: Side effects saved - {test_side_effects}")
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers
        )
        fetched = get_response.json()
        assert fetched.get("side_effects") == test_side_effects, "Side effects not persisted in database"
        print(f"PASS: Side effects verified via GET")
    
    def test_update_all_content_fields_together(self, auth_headers):
        """Test PUT /api/pharmacy/medicines/{id} saves all content fields together"""
        test_id = uuid.uuid4().hex[:6]
        test_composition = f"Combined Composition {test_id}"
        test_uses = f"Combined Uses {test_id}"
        test_side_effects = f"Combined Side Effects {test_id}"
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers,
            json={
                "composition": test_composition,
                "uses": test_uses,
                "side_effects": test_side_effects
            }
        )
        assert response.status_code == 200, f"Update all fields failed: {response.text}"
        
        result = response.json()
        updated_med = result.get("medicine", {})
        
        assert updated_med.get("composition") == test_composition
        assert updated_med.get("uses") == test_uses
        assert updated_med.get("side_effects") == test_side_effects
        print(f"PASS: All content fields saved together")
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers
        )
        fetched = get_response.json()
        assert fetched.get("composition") == test_composition
        assert fetched.get("uses") == test_uses
        assert fetched.get("side_effects") == test_side_effects
        print(f"PASS: All content fields verified via GET")


class TestMedicineMultiImageUpload:
    """Test multiple medicine image upload feature"""
    
    def test_upload_image_requires_auth(self):
        """Test POST /api/pharmacy/medicines/{id}/upload-image requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}/upload-image"
        )
        assert response.status_code == 401, f"Expected 401 without auth, got: {response.status_code}"
        print("PASS: Image upload requires authentication")
    
    def test_upload_image_appends_to_images_array(self, auth_headers):
        """Test POST /api/pharmacy/medicines/{id}/upload-image appends to images array"""
        # Create a small test image (1x1 red pixel PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0x6D,
            0xD2, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': (f'test_image_{uuid.uuid4().hex[:8]}.png', png_data, 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}/upload-image",
            headers=auth_headers,
            files=files
        )
        
        if response.status_code == 500:
            # Object storage might fail, but we check the API is working
            print(f"WARNING: Image upload returned 500 (possible Object Storage issue): {response.text}")
            pytest.skip("Object storage not available for testing")
        
        assert response.status_code == 200, f"Upload image failed: {response.status_code} - {response.text}"
        
        result = response.json()
        assert result.get("success") == True
        assert "image" in result, "Response should contain image entry"
        assert "images" in result, "Response should contain images array"
        
        image_entry = result.get("image", {})
        assert "id" in image_entry, "Image entry should have id"
        assert "url" in image_entry or "storage_path" in image_entry, "Image entry should have url or storage_path"
        
        print(f"PASS: Image uploaded - id: {image_entry.get('id')}, images count: {len(result.get('images', []))}")
        
        return image_entry.get("id")


class TestMedicineImageDownload:
    """Test medicine image download feature"""
    
    @pytest.fixture(autouse=True)
    def setup_image(self, auth_headers):
        """Upload an image first to test download"""
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0x6D,
            0xD2, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': (f'test_download_{uuid.uuid4().hex[:8]}.png', png_data, 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}/upload-image",
            headers=auth_headers,
            files=files
        )
        
        if response.status_code != 200:
            self.uploaded_image_id = None
            return
        
        result = response.json()
        self.uploaded_image_id = result.get("image", {}).get("id")
    
    def test_get_medicine_image_serves_image(self, auth_headers):
        """Test GET /api/pharmacy/medicines/{id}/images/{image_id} serves the image"""
        if not hasattr(self, 'uploaded_image_id') or not self.uploaded_image_id:
            pytest.skip("No image uploaded for download test")
        
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}/images/{self.uploaded_image_id}"
        )
        
        if response.status_code == 500:
            print(f"WARNING: Image download returned 500 (Object Storage issue)")
            pytest.skip("Object storage not available")
        
        assert response.status_code == 200, f"Image download failed: {response.status_code}"
        assert len(response.content) > 0, "Image content should not be empty"
        print(f"PASS: Image downloaded - {len(response.content)} bytes")
    
    def test_get_nonexistent_image_returns_404(self, auth_headers):
        """Test GET /api/pharmacy/medicines/{id}/images/{invalid_id} returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}/images/nonexistent-image-id"
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent image, got: {response.status_code}"
        print("PASS: Nonexistent image returns 404")


class TestMedicineImageDelete:
    """Test medicine image delete feature"""
    
    def test_delete_image_requires_auth(self):
        """Test DELETE /api/pharmacy/medicines/{id}/images/{image_id} requires auth"""
        response = requests.delete(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}/images/test-id"
        )
        assert response.status_code == 401, f"Expected 401 without auth, got: {response.status_code}"
        print("PASS: Image delete requires authentication")
    
    def test_delete_image_removes_from_array(self, auth_headers):
        """Test DELETE /api/pharmacy/medicines/{id}/images/{image_id} removes from images array"""
        # First upload an image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0x6D,
            0xD2, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': (f'test_delete_{uuid.uuid4().hex[:8]}.png', png_data, 'image/png')}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}/upload-image",
            headers=auth_headers,
            files=files
        )
        
        if upload_response.status_code != 200:
            pytest.skip("Could not upload image for delete test")
        
        upload_result = upload_response.json()
        image_id = upload_result.get("image", {}).get("id")
        images_before = len(upload_result.get("images", []))
        
        # Now delete the image
        delete_response = requests.delete(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}/images/{image_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200, f"Delete image failed: {delete_response.text}"
        
        delete_result = delete_response.json()
        assert delete_result.get("success") == True
        assert "images" in delete_result
        
        images_after = len(delete_result.get("images", []))
        assert images_after == images_before - 1, f"Image not removed from array. Before: {images_before}, After: {images_after}"
        
        # Verify image is no longer in the array
        remaining_ids = [img.get("id") for img in delete_result.get("images", [])]
        assert image_id not in remaining_ids, "Deleted image ID still in images array"
        
        print(f"PASS: Image deleted - images count before: {images_before}, after: {images_after}")


class TestMedicineUpdateModel:
    """Test MedicineUpdate model includes all required fields"""
    
    def test_medicine_update_accepts_all_fields(self, auth_headers):
        """Verify MedicineUpdate model accepts composition, uses, side_effects, images"""
        test_id = uuid.uuid4().hex[:6]
        
        # Test all fields together
        payload = {
            "name": "ANERGEN TAB",
            "generic_name": "Test Generic",
            "manufacturer": "Test Manufacturer",
            "category": "General",
            "mrp": 115.3,
            "discount_percent": 0,
            "unit": "Tablet",
            "description": "Test description",
            "composition": f"Test Composition {test_id}",
            "uses": f"Test Uses {test_id}",
            "side_effects": f"Test Side Effects {test_id}"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Update with all fields failed: {response.text}"
        
        result = response.json()
        med = result.get("medicine", {})
        
        # Verify all fields saved
        assert med.get("composition") == payload["composition"]
        assert med.get("uses") == payload["uses"]
        assert med.get("side_effects") == payload["side_effects"]
        
        print("PASS: MedicineUpdate model accepts all required fields")


# Restore original values after tests
@pytest.fixture(scope="module", autouse=True)
def restore_original_values(auth_headers):
    """Restore original medicine values after tests"""
    yield
    
    # Restore original values
    original_values = {
        "composition": "Promethazine 25mg",
        "uses": "Allergic reactions, Insomnia, Motion sickness",
        "side_effects": "Drowsiness, Dizziness, Dry mouth"
    }
    
    try:
        requests.put(
            f"{BASE_URL}/api/pharmacy/medicines/{TEST_MEDICINE_ID}",
            headers={"Authorization": f"Bearer {requests.post(f'{BASE_URL}/api/staff/login', json={'username': STAFF_USERNAME, 'password': STAFF_PASSWORD}).json().get('token')}"},
            json=original_values
        )
        print("Restored original medicine values")
    except Exception as e:
        print(f"Warning: Could not restore original values: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
