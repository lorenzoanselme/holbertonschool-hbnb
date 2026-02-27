# HBnB - Testing Report (Task 6)

## Swagger
Swagger UI: http://127.0.0.1:5000/api/v1/

Namespaces verified:
- users
- amenities
- places
- reviews

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

### Places

#### POST /api/v1/places/ (valid)
Input:
{"title":"Nice House","description":"Beautiful place","price":100.0,"latitude":48.85,"longitude":2.35,"owner_id":"<user_id>","amenities":["<amenity_id>"]}
Expected: 201
Actual: 201

#### POST /api/v1/places/ (owner not found)
Input:
{"title":"X","description":"","price":10.0,"latitude":1.0,"longitude":1.0,"owner_id":"does-not-exist","amenities":["<amenity_id>"]}
Expected: 400
Actual: 400

#### POST /api/v1/places/ (amenity not found)
Input:
{"title":"X","description":"","price":10.0,"latitude":1.0,"longitude":1.0,"owner_id":"<user_id>","amenities":["does-not-exist"]}
Expected: 400
Actual: 400

#### GET /api/v1/places/
Expected: 200 + list
Actual: 200

#### GET /api/v1/places/<id_not_found>
Expected: 404
Actual: 404

#### PUT /api/v1/places/<id>
Expected: 200
Actual: 200

#### PUT /api/v1/places/<id_not_found>
Expected: 404
Actual: 404

---

### Reviews

#### POST /api/v1/reviews/ (valid)
Input:
{"text":"Great!","rating":5,"user_id":"<user_id>","place_id":"<place_id>"}
Expected: 201
Actual: 201

#### POST /api/v1/reviews/ (user not found)
Input:
{"text":"X","rating":5,"user_id":"does-not-exist","place_id":"<place_id>"}
Expected: 400
Actual: 400

#### POST /api/v1/reviews/ (place not found)
Input:
{"text":"X","rating":5,"user_id":"<user_id>","place_id":"does-not-exist"}
Expected: 400
Actual: 400

#### GET /api/v1/reviews/
Expected: 200 + list
Actual: 200

#### GET /api/v1/reviews/<id_not_found>
Expected: 404
Actual: 404

#### PUT /api/v1/reviews/<id>
Expected: 200
Actual: 200

#### PUT /api/v1/reviews/<id_not_found>
Expected: 404
Actual: 404

---

## Automated tests

Command:
python3 -m unittest discover -s test -p "test_*.py" -v

Result:
- All tests passed