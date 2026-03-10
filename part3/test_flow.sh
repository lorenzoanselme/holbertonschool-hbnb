#!/usr/bin/env bash

BASE_URL="http://127.0.0.1:5000/api/v1"
PASS="123456"

echo "== Create user 1 =="
USER1=$(curl -s -X POST "$BASE_URL/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Alice",
    "last_name": "Owner",
    "email": "alice@test.com",
    "password": "'"$PASS"'"
  }')
echo "$USER1"
USER1_ID=$(echo "$USER1" | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])')

echo "== Create user 2 =="
USER2=$(curl -s -X POST "$BASE_URL/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Bob",
    "last_name": "Reviewer",
    "email": "bob@test.com",
    "password": "'"$PASS"'"
  }')
echo "$USER2"
USER2_ID=$(echo "$USER2" | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])')

echo "== Login user 1 =="
LOGIN1=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "'"$PASS"'"
  }')
echo "$LOGIN1"
TOKEN1=$(echo "$LOGIN1" | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')

echo "== Login user 2 =="
LOGIN2=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@test.com",
    "password": "'"$PASS"'"
  }')
echo "$LOGIN2"
TOKEN2=$(echo "$LOGIN2" | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')

echo "== Create place with user 1 =="
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
PLACE_ID=$(echo "$PLACE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])')

echo "== Public GET places =="
curl -s "$BASE_URL/places/"
echo

echo "== Public GET place by id =="
curl -s "$BASE_URL/places/$PLACE_ID"
echo

echo "== Unauthorized place update with user 2 =="
curl -s -X PUT "$BASE_URL/places/$PLACE_ID" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hack"
  }'
echo

echo "== Authorized place update with user 1 =="
curl -s -X PUT "$BASE_URL/places/$PLACE_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Maison test modifiée"
  }'
echo

echo "== Create review with user 2 =="
REVIEW=$(curl -s -X POST "$BASE_URL/reviews/" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Super endroit",
    "rating": 5,
    "place_id": "'"$PLACE_ID"'"
  }')
echo "$REVIEW"
REVIEW_ID=$(echo "$REVIEW" | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])')

echo "== Prevent owner review own place =="
curl -s -X POST "$BASE_URL/reviews/" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Mon propre avis",
    "rating": 5,
    "place_id": "'"$PLACE_ID"'"
  }'
echo

echo "== Prevent duplicate review =="
curl -s -X POST "$BASE_URL/reviews/" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Deuxième avis",
    "rating": 4,
    "place_id": "'"$PLACE_ID"'"
  }'
echo

echo "== Unauthorized review update with user 1 =="
curl -s -X PUT "$BASE_URL/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hack review"
  }'
echo

echo "== Authorized review update with user 2 =="
curl -s -X PUT "$BASE_URL/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Review modifiée",
    "rating": 4
  }'
echo

echo "== Unauthorized delete with user 1 =="
curl -s -X DELETE "$BASE_URL/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $TOKEN1"
echo

echo "== Authorized delete with user 2 =="
curl -s -X DELETE "$BASE_URL/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $TOKEN2"
echo

echo "== Authorized self user update =="
curl -s -X PUT "$BASE_URL/users/$USER1_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "AliceUpdated"
  }'
echo

echo "== Unauthorized other user update =="
curl -s -X PUT "$BASE_URL/users/$USER2_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Hack"
  }'
echo

echo "== Email change forbidden =="
curl -s -X PUT "$BASE_URL/users/$USER1_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@test.com"
  }'
echo

echo "== Password change forbidden =="
curl -s -X PUT "$BASE_URL/users/$USER1_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newpass"
  }'
echo