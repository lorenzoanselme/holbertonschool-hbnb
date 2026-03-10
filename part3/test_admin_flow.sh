#!/usr/bin/env bash

BASE_URL="http://127.0.0.1:5000/api/v1"
ADMIN_EMAIL="admin@test.com"
ADMIN_PASS="123456"
USER_PASS="123456"

extract_json_field() {
  local json="$1"
  local field="$2"
  echo "$json" | python3 -c "
import sys, json
data = sys.stdin.read().strip()
if not data:
    raise SystemExit('Empty response')
obj = json.loads(data)
print(obj['$field'])
"
}

echo "== Login admin =="
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$ADMIN_EMAIL"'",
    "password": "'"$ADMIN_PASS"'"
  }')
echo "$ADMIN_LOGIN"
ADMIN_TOKEN=$(extract_json_field "$ADMIN_LOGIN" "access_token") || exit 1

echo
echo "== Admin creates normal user 1 =="
USER1=$(curl -s -X POST "$BASE_URL/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Alice",
    "last_name": "Owner",
    "email": "alice@test.com",
    "password": "'"$USER_PASS"'"
  }')
echo "$USER1"
USER1_ID=$(extract_json_field "$USER1" "id") || exit 1

echo
echo "== Admin creates normal user 2 =="
USER2=$(curl -s -X POST "$BASE_URL/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Bob",
    "last_name": "Reviewer",
    "email": "bob@test.com",
    "password": "'"$USER_PASS"'"
  }')
echo "$USER2"
USER2_ID=$(extract_json_field "$USER2" "id") || exit 1

echo
echo "== Login user 1 =="
LOGIN1=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "'"$USER_PASS"'"
  }')
echo "$LOGIN1"
TOKEN1=$(extract_json_field "$LOGIN1" "access_token") || exit 1

echo
echo "== Login user 2 =="
LOGIN2=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@test.com",
    "password": "'"$USER_PASS"'"
  }')
echo "$LOGIN2"
TOKEN2=$(extract_json_field "$LOGIN2" "access_token") || exit 1

echo
echo "== Normal user cannot create user =="
curl -s -X POST "$BASE_URL/users/" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Hack",
    "last_name": "User",
    "email": "hack@test.com",
    "password": "123456"
  }'
echo

echo
echo "== Admin can modify another user's email =="
curl -s -X PUT "$BASE_URL/users/$USER1_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.updated@test.com"
  }'
echo

echo
echo "== Admin duplicate email should fail =="
curl -s -X PUT "$BASE_URL/users/$USER1_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@test.com"
  }'
echo

echo
echo "== Normal user cannot create amenity =="
NORMAL_AMENITY=$(curl -s -X POST "$BASE_URL/amenities/" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Swimming Pool"
  }')
echo "$NORMAL_AMENITY"

echo
echo "== Admin creates amenity =="
ADMIN_AMENITY=$(curl -s -X POST "$BASE_URL/amenities/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Swimming Pool"
  }')
echo "$ADMIN_AMENITY"
AMENITY_ID=$(extract_json_field "$ADMIN_AMENITY" "id") || exit 1

echo
echo "== Admin updates amenity =="
curl -s -X PUT "$BASE_URL/amenities/$AMENITY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Pool"
  }'
echo

echo
echo "== User 1 creates place =="
PLACE=$(curl -s -X POST "$BASE_URL/places/" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Maison test",
    "description": "Une maison sympa",
    "price": 100,
    "latitude": 44.1,
    "longitude": 1.5
  }')
echo "$PLACE"
PLACE_ID=$(extract_json_field "$PLACE" "id") || exit 1

echo
echo "== Normal user 2 cannot update user 1 place =="
curl -s -X PUT "$BASE_URL/places/$PLACE_ID" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hack place"
  }'
echo

echo
echo "== Admin can update user 1 place =="
curl -s -X PUT "$BASE_URL/places/$PLACE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Place updated by admin"
  }'
echo

echo
echo "== User 2 creates review =="
REVIEW=$(curl -s -X POST "$BASE_URL/reviews/" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Super endroit",
    "rating": 5,
    "place_id": "'"$PLACE_ID"'"
  }')
echo "$REVIEW"
REVIEW_ID=$(extract_json_field "$REVIEW" "id") || exit 1

echo
echo "== User 1 cannot update user 2 review =="
curl -s -X PUT "$BASE_URL/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hack review"
  }'
echo

echo
echo "== Admin can update user 2 review =="
curl -s -X PUT "$BASE_URL/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Review updated by admin",
    "rating": 4
  }'
echo

echo
echo "== Admin can delete user 2 review =="
curl -s -X DELETE "$BASE_URL/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo