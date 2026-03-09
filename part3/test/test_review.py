import unittest
import uuid
from app import create_app


class TestReviewEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.testing = True
        self.client = self.app.test_client()

        # Create user
        email = f"reviewer_{uuid.uuid4().hex}@test.com"
        r_user = self.client.post('/api/v1/users/', json={
            "first_name": "Reviewer",
            "last_name": "One",
            "email": email
        })
        self.assertEqual(r_user.status_code, 201, msg=r_user.get_json())
        self.user_id = r_user.get_json()["id"]

        # Create amenity
        r_am = self.client.post('/api/v1/amenities/', json={"name": "Parking"})
        self.assertEqual(r_am.status_code, 201, msg=r_am.get_json())
        amenity_id = r_am.get_json()["id"]

        # Create place
        r_place = self.client.post('/api/v1/places/', json={
            "title": "Place for reviews",
            "description": "",
            "price": 50.0,
            "latitude": 1.0,
            "longitude": 1.0,
            "owner_id": self.user_id,
            "amenities": [amenity_id]
        })
        self.assertEqual(r_place.status_code, 201, msg=r_place.get_json())
        self.place_id = r_place.get_json()["id"]

    def test_create_review_ok(self):
        r = self.client.post('/api/v1/reviews/', json={
            "text": "Great!",
            "rating": 5,
            "user_id": self.user_id,
            "place_id": self.place_id
        })
        self.assertEqual(r.status_code, 201, msg=r.get_json())
        self.assertIn("id", r.get_json())

    def test_create_review_user_not_found(self):
        r = self.client.post('/api/v1/reviews/', json={
            "text": "X",
            "rating": 5,
            "user_id": "does-not-exist",
            "place_id": self.place_id
        })
        self.assertEqual(r.status_code, 400, msg=r.get_json())

    def test_create_review_place_not_found(self):
        r = self.client.post('/api/v1/reviews/', json={
            "text": "X",
            "rating": 5,
            "user_id": self.user_id,
            "place_id": "does-not-exist"
        })
        self.assertEqual(r.status_code, 400, msg=r.get_json())

    def test_get_reviews_list(self):
        r = self.client.get('/api/v1/reviews/')
        self.assertEqual(r.status_code, 200, msg=r.get_json())
        self.assertIsInstance(r.get_json(), list)

    def test_get_review_not_found(self):
        r = self.client.get('/api/v1/reviews/does-not-exist')
        self.assertEqual(r.status_code, 404, msg=r.get_json())

    def test_update_review_ok(self):
        r_create = self.client.post('/api/v1/reviews/', json={
            "text": "Before",
            "rating": 3,
            "user_id": self.user_id,
            "place_id": self.place_id
        })
        self.assertEqual(r_create.status_code, 201, msg=r_create.get_json())
        review_id = r_create.get_json()["id"]

        r = self.client.put(
            f'/api/v1/reviews/{review_id}',
            json={"text": "After"}
        )
        self.assertEqual(r.status_code, 200, msg=r.get_json())
        response_text = r.get_json()["text"]
        self.assertEqual(response_text, "After")

    def test_update_review_not_found(self):
        r = self.client.put(
            '/api/v1/reviews/does-not-exist',
            json={"text": "X"}
        )
        self.assertEqual(r.status_code, 404, msg=r.get_json())


if __name__ == "__main__":
    unittest.main()
