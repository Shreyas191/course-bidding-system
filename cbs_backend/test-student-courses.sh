#!/bin/bash

BASE_URL="http://localhost:8080"

echo "=== Testing Student Course Endpoints ==="
echo ""

# Step 1: Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.j@university.edu",
    "password": "password123"
  }')

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed! Check credentials."
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:50}..."
echo ""

# Step 2: Test all endpoints
echo "2. Getting all courses (public)..."
curl -s -X GET $BASE_URL/api/courses | jq '.[0:2]'
echo ""

echo "3. Getting courses in my department..."
curl -s -X GET $BASE_URL/api/courses/my-department \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:2]'
echo ""

echo "4. Getting my enrolled courses..."
curl -s -X GET $BASE_URL/api/courses/my-enrollments \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

echo "5. Getting courses I've bid on..."
curl -s -X GET $BASE_URL/api/courses/my-bids \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

echo "6. Getting available courses..."
curl -s -X GET $BASE_URL/api/courses/available | jq '.[0:2]'
echo ""

echo "=== Testing Complete ==="
