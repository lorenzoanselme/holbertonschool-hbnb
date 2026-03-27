import unittest
from app import create_app


class TestUserEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.testing = True
        self.client = self.app.test_client()

    def test_create_user_ok(self):
        r = self.client.post('/api/v1/users/', json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane.doe@example.com"
        })
        self.assertEqual(r.status_code, 201)
        data = r.get_json()
        self.assertIn("id", data)
        self.assertEqual(data["email"], "jane.doe@example.com")

    def test_create_user_invalid_email(self):
        r = self.client.post('/api/v1/users/', json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "invalid-email"
        })
        self.assertEqual(r.status_code, 400)

    def test_create_user_duplicate_email(self):
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "dup@example.com"
        }
        r1 = self.client.post('/api/v1/users/', json=payload)
        self.assertEqual(r1.status_code, 201)

        r2 = self.client.post('/api/v1/users/', json=payload)
        self.assertEqual(r2.status_code, 400)

    def test_get_users_list(self):
        r = self.client.get('/api/v1/users/')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.get_json(), list)

    def test_get_user_not_found(self):
        r = self.client.get('/api/v1/users/does-not-exist')
        self.assertEqual(r.status_code, 404)

    def test_update_user_ok(self):
        create = self.client.post('/api/v1/users/', json={
            "first_name": "A",
            "last_name": "B",
            "email": "update@example.com"
        })
        user_id = create.get_json()["id"]

        r = self.client.put(
            f'/api/v1/users/{user_id}',
            json={"first_name": "NewName"}
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["first_name"], "NewName")

    def test_update_user_not_found(self):
        r = self.client.put(
            '/api/v1/users/does-not-exist',
            json={"first_name": "X"}
        )
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()
