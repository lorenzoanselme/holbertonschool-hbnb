import unittest
from app import create_app


class TestAmenityEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.testing = True
        self.client = self.app.test_client()

    def test_create_amenity_ok(self):
        r = self.client.post('/api/v1/amenities/', json={"name": "WiFi"})
        self.assertEqual(r.status_code, 201)
        self.assertIn("id", r.get_json())

    def test_create_amenity_invalid(self):
        r = self.client.post('/api/v1/amenities/', json={"name": ""})
        self.assertEqual(r.status_code, 400)

    def test_get_amenities_list(self):
        r = self.client.get('/api/v1/amenities/')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.get_json(), list)

    def test_get_amenity_not_found(self):
        r = self.client.get('/api/v1/amenities/does-not-exist')
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()
