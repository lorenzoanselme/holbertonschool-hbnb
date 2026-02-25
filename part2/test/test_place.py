import unittest
import uuid
from app import create_app


class TestPlaceEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.testing = True
        self.client = self.app.test_client()

        # Create owner user (unique email)
        email = f"owner_{uuid.uuid4().hex}@test.com"
        r_user = self.client.post('/api/v1/users/', json={
            "first_name": "Owner",
            "last_name": "One",
            "email": email
        })
        self.assertEqual(r_user.status_code, 201, msg=r_user.get_json())
        self.user_id = r_user.get_json()["id"]

        # Create amenity
        r_am = self.client.post('/api/v1/amenities/', json={"name": "WiFi"})
        self.assertEqual(r_am.status_code, 201, msg=r_am.get_json())
        self.amenity_id = r_am.get_json()["id"]

    def test_create_place_ok(self):
        r = self.client.post('/api/v1/places/', json={
            "title": "Nice House",
            "description": "Beautiful place",
            "price": 100.0,
            "latitude": 48.85,
            "longitude": 2.35,
            "owner_id": self.user_id,
            "amenities": [self.amenity_id]
        })
        self.assertEqual(r.status_code, 201, msg=r.get_json())
        self.assertIn("id", r.get_json())

    def test_create_place_owner_not_found(self):
        r = self.client.post('/api/v1/places/', json={
            "title": "X",
            "description": "",
            "price": 10.0,
            "latitude": 1.0,
            "longitude": 1.0,
            "owner_id": "does-not-exist",
            "amenities": [self.amenity_id]
        })
        self.assertEqual(r.status_code, 400, msg=r.get_json())

    def test_create_place_amenity_not_found(self):
        r = self.client.post('/api/v1/places/', json={
            "title": "X",
            "description": "",
            "price": 10.0,
            "latitude": 1.0,
            "longitude": 1.0,
            "owner_id": self.user_id,
            "amenities": ["does-not-exist"]
        })
        self.assertEqual(r.status_code, 400, msg=r.get_json())

    def test_get_places_list(self):
        self.client.post('/api/v1/places/', json={
            "title": "P1",
            "description": "",
            "price": 10.0,
            "latitude": 1.0,
            "longitude": 1.0,
            "owner_id": self.user_id,
            "amenities": [self.amenity_id]
        })

        r = self.client.get('/api/v1/places/')
        self.assertEqual(r.status_code, 200, msg=r.get_json())
        self.assertIsInstance(r.get_json(), list)

    def test_get_place_not_found(self):
        r = self.client.get('/api/v1/places/does-not-exist')
        self.assertEqual(r.status_code, 404, msg=r.get_json())

    def test_update_place_ok(self):
        r_create = self.client.post('/api/v1/places/', json={
            "title": "Before",
            "description": "",
            "price": 10.0,
            "latitude": 1.0,
            "longitude": 1.0,
            "owner_id": self.user_id,
            "amenities": [self.amenity_id]
        })
        self.assertEqual(r_create.status_code, 201, msg=r_create.get_json())
        place_id = r_create.get_json()["id"]

        r = self.client.put(f'/api/v1/places/{place_id}',
                            json={"title": "After"})
        self.assertEqual(r.status_code, 200, msg=r.get_json())
        self.assertEqual(r.get_json()["title"], "After")

    def test_update_place_not_found(self):
        r = self.client.put('/api/v1/places/does-not-exist',
                            json={"title": "X"})
        self.assertEqual(r.status_code, 404, msg=r.get_json())


if __name__ == "__main__":
    unittest.main()
