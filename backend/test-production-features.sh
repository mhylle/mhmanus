#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000/v1"

# Test results
PASSED=0
FAILED=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ $2${NC}"
        ((FAILED++))
    fi
}

echo "====================================="
echo "Production Features Test Suite"
echo "====================================="
echo ""

# Test 1: Health Check Endpoints
echo -e "${YELLOW}1. Testing Health Check Endpoints${NC}"

# Main health check
echo -n "Testing /health endpoint... "
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    print_result 0 "Main health check"
else
    print_result 1 "Main health check (HTTP $HEALTH_RESPONSE)"
fi

# Readiness check
echo -n "Testing /health/ready endpoint... "
READY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health/ready)
if [ "$READY_RESPONSE" = "200" ]; then
    print_result 0 "Readiness check"
else
    print_result 1 "Readiness check (HTTP $READY_RESPONSE)"
fi

# Liveness check
echo -n "Testing /health/live endpoint... "
LIVE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health/live)
if [ "$LIVE_RESPONSE" = "200" ]; then
    print_result 0 "Liveness check"
else
    print_result 1 "Liveness check (HTTP $LIVE_RESPONSE)"
fi

echo ""

# Test 2: Authentication Flow
echo -e "${YELLOW}2. Testing Authentication Flow${NC}"

# Generate unique email
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="Test123!@#"

# Register user
echo -n "Testing user registration... "
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\"}")

if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
    print_result 0 "User registration"
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
else
    print_result 1 "User registration"
    ACCESS_TOKEN=""
fi

# Login
echo -n "Testing user login... "
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    print_result 0 "User login"
    if [ -z "$ACCESS_TOKEN" ]; then
        ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    fi
else
    print_result 1 "User login"
fi

# Test protected endpoint
echo -n "Testing protected endpoint... "
if [ -n "$ACCESS_TOKEN" ]; then
    PROTECTED_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/auth/profile \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    if [ "$PROTECTED_RESPONSE" = "200" ]; then
        print_result 0 "Protected endpoint access"
    else
        print_result 1 "Protected endpoint access (HTTP $PROTECTED_RESPONSE)"
    fi
else
    print_result 1 "Protected endpoint access (No token)"
fi

echo ""

# Test 3: Rate Limiting
echo -e "${YELLOW}3. Testing Rate Limiting${NC}"

echo -n "Testing rate limiting... "
RATE_LIMIT_EXCEEDED=0
for i in {1..5}; do
    RATE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/production-test/rate-limit)
    if [ "$RATE_RESPONSE" = "429" ]; then
        RATE_LIMIT_EXCEEDED=1
        break
    fi
done

if [ $RATE_LIMIT_EXCEEDED -eq 1 ]; then
    print_result 0 "Rate limiting (429 received)"
else
    print_result 1 "Rate limiting (No 429 received)"
fi

echo ""

# Test 4: API Versioning
echo -e "${YELLOW}4. Testing API Versioning${NC}"

echo -n "Testing versioned endpoint... "
VERSION_RESPONSE=$(curl -s $BASE_URL/production-test/versioning)
if echo "$VERSION_RESPONSE" | grep -q "v1"; then
    print_result 0 "API versioning"
else
    print_result 1 "API versioning"
fi

echo ""

# Test 5: Compression
echo -e "${YELLOW}5. Testing Response Compression${NC}"

echo -n "Testing compression... "
COMPRESSION_HEADERS=$(curl -s -H "Accept-Encoding: gzip" -I $BASE_URL/production-test/compression | grep -i "content-encoding")
if echo "$COMPRESSION_HEADERS" | grep -q "gzip"; then
    print_result 0 "Response compression"
else
    print_result 1 "Response compression"
fi

echo ""

# Test 6: Configuration
echo -e "${YELLOW}6. Testing Configuration Loading${NC}"

echo -n "Testing configuration endpoint... "
CONFIG_RESPONSE=$(curl -s $BASE_URL/production-test/config)
if echo "$CONFIG_RESPONSE" | grep -q "environment"; then
    print_result 0 "Configuration loading"
else
    print_result 1 "Configuration loading"
fi

echo ""

# Test 7: Production Test Suite
echo -e "${YELLOW}7. Testing Complete Auth Flow${NC}"

echo -n "Testing complete auth flow... "
AUTH_FLOW_RESPONSE=$(curl -s -X POST $BASE_URL/production-test/auth-flow)
if echo "$AUTH_FLOW_RESPONSE" | grep -q "success"; then
    print_result 0 "Complete auth flow test"
else
    print_result 1 "Complete auth flow test"
fi

echo ""

# Test 8: All Features Integration
echo -e "${YELLOW}8. Testing All Features Integration${NC}"

echo -n "Testing all features... "
if [ -n "$ACCESS_TOKEN" ]; then
    ALL_FEATURES_RESPONSE=$(curl -s $BASE_URL/production-test/all-features \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    if echo "$ALL_FEATURES_RESPONSE" | grep -q "authentication.*Passed"; then
        print_result 0 "All features integration"
    else
        print_result 1 "All features integration"
    fi
else
    print_result 1 "All features integration (No token)"
fi

echo ""
echo "====================================="
echo -e "Test Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "====================================="

# Exit with appropriate code
if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi