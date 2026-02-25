# HBnB - Testing Report (Task 6)

## Swagger
Swagger UI: http://127.0.0.1:5000/api/v1/

Namespaces verified:
- users
- amenities
- places (if implemented)
- reviews (if implemented)

---

## Manual tests (cURL)

### Users

#### POST /api/v1/users/ (valid)
Input:
{"first_name":"John","last_name":"Doe","email":"john@test.com"}
Expected: 201
Actual: 201

#### POST /api/v1/users/ (invalid email)
Input:
{"first_name":"John","last_name":"Doe","email":"invalid"}
Expected: 400
Actual: 400

#### POST /api/v1/users/ (duplicate email)
Expected: 400
Actual: 400

#### GET /api/v1/users/
Expected: 200 + list
Actual: 200

#### GET /api/v1/users/<id_not_found>
Expected: 404
Actual: 404

#### PUT /api/v1/users/<id>
Expected: 200
Actual: 200

---

### Amenities

#### POST /api/v1/amenities/ (valid)
Input: {"name":"WiFi"}
Expected: 201
Actual: 201

#### POST /api/v1/amenities/ (invalid)
Input: {"name":""}
Expected: 400
Actual: 400

#### GET /api/v1/amenities/
Expected: 200 + list
Actual: 200

#### GET /api/v1/amenities/<id_not_found>
Expected: 404
Actual: 404

---

## Automated tests

Command:
python3 -m unittest discover -s test -p "test_*.py" -v

Result:
- All tests passed