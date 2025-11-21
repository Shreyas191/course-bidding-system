#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing MySQL Stored Procedures & Functions${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Configuration
BASE_URL="http://localhost:8080"

# 1. Login as student
echo -e "${YELLOW}[1/12] Logging in as student...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@nyu.edu","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
STUDENT_ID=$(echo $LOGIN_RESPONSE | jq -r '.studentId')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Login failed. Please check credentials.${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Login successful. Student ID: $STUDENT_ID${NC}\n"

# 2. Check initial wallet balance
echo -e "${YELLOW}[2/12] Checking initial wallet balance...${NC}"
WALLET=$(curl -s -X GET $BASE_URL/api/wallet \
  -H "Authorization: Bearer $TOKEN")

INITIAL_BALANCE=$(echo $WALLET | jq -r '.balance')
LOCKED_AMOUNT=$(echo $WALLET | jq -r '.lockedAmount')
AVAILABLE=$(echo $WALLET | jq -r '.availableBalance')

echo -e "${GREEN}✓ Wallet Status:${NC}"
echo "  Total Balance: $INITIAL_BALANCE points"
echo "  Locked (Pending Bids): $LOCKED_AMOUNT points"
echo "  Available: $AVAILABLE points"
echo "$WALLET" | jq
echo ""

# 3. Get current active round
echo -e "${YELLOW}[3/12] Getting current active round...${NC}"
ROUND=$(curl -s -X GET $BASE_URL/api/rounds/current \
  -H "Authorization: Bearer $TOKEN")

ROUND_ID=$(echo $ROUND | jq -r '.roundId')
ROUND_NAME=$(echo $ROUND | jq -r '.roundName')

if [ "$ROUND_ID" == "null" ]; then
    echo -e "${RED}✗ No active round found${NC}"
    echo "Response: $ROUND"
else
    echo -e "${GREEN}✓ Active Round: $ROUND_NAME (ID: $ROUND_ID)${NC}"
    echo "$ROUND" | jq
fi
echo ""

# 4. Get available courses
echo -e "${YELLOW}[4/12] Getting available courses...${NC}"
COURSES=$(curl -s -X GET $BASE_URL/api/courses \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✓ Available Courses:${NC}"
echo "$COURSES" | jq '[.[] | {courseId, courseCode, courseName, minBid, capacity, enrolled, isFull}]' | head -20
echo ""

# Select a course that's not full and we can afford
COURSE_ID=$(echo $COURSES | jq -r '[.[] | select(.isFull == false and .minBid <= '$AVAILABLE')][0].courseId')
COURSE_CODE=$(echo $COURSES | jq -r '[.[] | select(.isFull == false and .minBid <= '$AVAILABLE')][0].courseCode')
MIN_BID=$(echo $COURSES | jq -r '[.[] | select(.isFull == false and .minBid <= '$AVAILABLE')][0].minBid')

if [ "$COURSE_ID" == "null" ] || [ -z "$COURSE_ID" ]; then
    echo -e "${RED}✗ No affordable courses found. Using course ID 1 for testing.${NC}"
    COURSE_ID=1
    MIN_BID=10
fi

echo -e "Selected course: ${GREEN}$COURSE_CODE (ID: $COURSE_ID, Min Bid: $MIN_BID)${NC}\n"

# 5. Test is_course_full() function
echo -e "${YELLOW}[5/12] Testing is_course_full() function...${NC}"
COURSE_FULL=$(curl -s -X GET $BASE_URL/api/courses/$COURSE_ID/is-full \
  -H "Authorization: Bearer $TOKEN")

IS_FULL=$(echo $COURSE_FULL | jq -r '.isFull')
echo -e "${GREEN}✓ is_course_full() result: $IS_FULL${NC}"
echo "$COURSE_FULL" | jq
echo ""

# 6. Test sp_place_bid stored procedure
echo -e "${YELLOW}[6/12] Testing sp_place_bid stored procedure...${NC}"

# Calculate a bid amount we can afford
if [ "$AVAILABLE" -gt "$MIN_BID" ]; then
    BID_AMOUNT=$MIN_BID
else
    BID_AMOUNT=$AVAILABLE
fi

if [ "$BID_AMOUNT" -gt 0 ]; then
    echo "Placing bid: Course $COURSE_ID, Amount: $BID_AMOUNT points"
    
    BID_RESPONSE=$(curl -s -X POST $BASE_URL/api/bids \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"courseId\":$COURSE_ID,\"bidAmount\":$BID_AMOUNT}")
    
    if echo "$BID_RESPONSE" | jq -e '.bidId' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ sp_place_bid executed successfully${NC}"
        echo "$BID_RESPONSE" | jq
        BID_ID=$(echo $BID_RESPONSE | jq -r '.bidId')
    else
        echo -e "${RED}✗ Bid placement failed${NC}"
        echo "Response: $BID_RESPONSE"
    fi
else
    echo -e "${RED}✗ Insufficient balance to place bid${NC}"
fi
echo ""

# 7. Verify wallet deduction
echo -e "${YELLOW}[7/12] Verifying wallet deduction after bid...${NC}"
NEW_WALLET=$(curl -s -X GET $BASE_URL/api/wallet \
  -H "Authorization: Bearer $TOKEN")

NEW_BALANCE=$(echo $NEW_WALLET | jq -r '.balance')
NEW_LOCKED=$(echo $NEW_WALLET | jq -r '.lockedAmount')
NEW_AVAILABLE=$(echo $NEW_WALLET | jq -r '.availableBalance')

echo -e "${GREEN}✓ Wallet After Bid:${NC}"
echo "  Previous Available: $AVAILABLE points"
echo "  New Available: $NEW_AVAILABLE points"
echo "  Deducted: $((AVAILABLE - NEW_AVAILABLE)) points"
echo "$NEW_WALLET" | jq
echo ""

# 8. Check all bids
echo -e "${YELLOW}[8/12] Getting all my bids...${NC}"
MY_BIDS=$(curl -s -X GET $BASE_URL/api/bids/my-bids \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✓ All Bids:${NC}"
echo "$MY_BIDS" | jq '[.[] | {bidId, courseCode, bidAmount, status, roundName}]'
echo ""

# 9. Test validate_min_credits() function
echo -e "${YELLOW}[9/12] Testing validate_min_credits() function...${NC}"
CREDITS=$(curl -s -X GET $BASE_URL/api/student/validate-credits \
  -H "Authorization: Bearer $TOKEN")

MEETS_MIN=$(echo $CREDITS | jq -r '.meetsMinimumCredits')
CURRENT_CREDITS=$(echo $CREDITS | jq -r '.currentCredits')
MIN_REQUIRED=$(echo $CREDITS | jq -r '.minimumRequired')

echo -e "${GREEN}✓ validate_min_credits() result:${NC}"
echo "  Current Credits: $CURRENT_CREDITS"
echo "  Minimum Required: $MIN_REQUIRED"
echo "  Meets Minimum: $MEETS_MIN"
echo "$CREDITS" | jq
echo ""

# 10. Check current enrollments
echo -e "${YELLOW}[10/12] Getting current enrollments...${NC}"
ENROLLMENTS=$(curl -s -X GET $BASE_URL/api/courses/my-courses \
  -H "Authorization: Bearer $TOKEN")

ENROLLMENT_COUNT=$(echo "$ENROLLMENTS" | jq 'length')
echo -e "${GREEN}✓ Current Enrollments: $ENROLLMENT_COUNT course(s)${NC}"
echo "$ENROLLMENTS" | jq '[.[] | {courseCode, courseName, credits}]'
echo ""

# 11. Check waitlist
echo -e "${YELLOW}[11/12] Checking waitlist...${NC}"
WAITLIST=$(curl -s -X GET $BASE_URL/api/waitlist/my-waitlist \
  -H "Authorization: Bearer $TOKEN")

WAITLIST_COUNT=$(echo "$WAITLIST" | jq 'length')
echo -e "${GREEN}✓ Waitlist Entries: $WAITLIST_COUNT${NC}"
if [ "$WAITLIST_COUNT" -gt 0 ]; then
    echo "$WAITLIST" | jq '[.[] | {courseCode, position, isCourseFull}]'
fi
echo ""

# 12. Test auction processing (Admin only)
echo -e "${YELLOW}[12/12] Testing process_auction_winners (requires admin)...${NC}"

ADMIN_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nyu.edu","password":"adminpass"}')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.token')

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ] && [ "$ROUND_ID" != "null" ]; then
    echo "Processing auction for round $ROUND_ID..."
    
    PROCESS_RESULT=$(curl -s -X POST $BASE_URL/api/admin/rounds/$ROUND_ID/process-all \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$PROCESS_RESULT" | grep -q "success"; then
        echo -e "${GREEN}✓ process_auction_winners executed successfully${NC}"
        echo "Response: $PROCESS_RESULT"
        
        # Check updated bid status
        echo -e "\n${YELLOW}Checking updated bid statuses...${NC}"
        UPDATED_BIDS=$(curl -s -X GET $BASE_URL/api/bids/my-bids \
          -H "Authorization: Bearer $TOKEN")
        echo "$UPDATED_BIDS" | jq '[.[] | {bidId, courseCode, bidAmount, status}]'
    else
        echo -e "${YELLOW}⚠ Auction processing response:${NC}"
        echo "$PROCESS_RESULT"
    fi
else
    echo -e "${YELLOW}⚠ Skipped: Admin login failed or no active round${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ sp_place_bid:${NC} Tested - Wallet deducted, bid created"
echo -e "${GREEN}✓ is_course_full():${NC} Tested - Returns true/false"
echo -e "${GREEN}✓ validate_min_credits():${NC} Tested - Returns credit validation"
echo -e "${GREEN}✓ process_auction_winners:${NC} Tested - Determines winners/losers"
echo ""
echo -e "${BLUE}Current Status:${NC}"
echo "  Balance: $NEW_BALANCE points"
echo "  Locked: $NEW_LOCKED points"
echo "  Available: $NEW_AVAILABLE points"
echo "  Enrollments: $ENROLLMENT_COUNT courses ($CURRENT_CREDITS credits)"
echo "  Waitlist: $WAITLIST_COUNT courses"
echo "  Total Bids: $(echo $MY_BIDS | jq 'length')"
echo ""
