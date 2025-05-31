#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "====================================="
echo "Basic Production Features Test"
echo "====================================="
echo ""

# Test 1: API is running
echo -e "${YELLOW}1. Testing API availability${NC}"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api)
if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ API documentation available${NC}"
else
    echo -e "${RED}✗ API documentation not available (HTTP $API_RESPONSE)${NC}"
fi

# Test 2: Versioning
echo -e "\n${YELLOW}2. Testing API versioning${NC}"
VERSION_RESPONSE=$(curl -s http://localhost:3000/v1/production-test/versioning)
echo "Response: $VERSION_RESPONSE"
if echo "$VERSION_RESPONSE" | grep -q "v1"; then
    echo -e "${GREEN}✓ API versioning working${NC}"
else
    echo -e "${RED}✗ API versioning not working${NC}"
fi

# Test 3: Configuration
echo -e "\n${YELLOW}3. Testing configuration${NC}"
CONFIG_RESPONSE=$(curl -s http://localhost:3000/v1/production-test/config)
echo "Response: $CONFIG_RESPONSE"
if echo "$CONFIG_RESPONSE" | grep -q "environment"; then
    echo -e "${GREEN}✓ Configuration loaded${NC}"
else
    echo -e "${RED}✗ Configuration not loaded${NC}"
fi

# Test 4: Authentication
echo -e "\n${YELLOW}4. Testing authentication${NC}"
TEST_EMAIL="test-$(date +%s)@example.com"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/v1/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"Test123!\",\"name\":\"Test User\"}")
echo "Register Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓ Registration working${NC}"
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    
    # Test protected endpoint
    PROTECTED_RESPONSE=$(curl -s http://localhost:3000/v1/auth/profile \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    echo "Protected endpoint response: $PROTECTED_RESPONSE"
    
    if echo "$PROTECTED_RESPONSE" | grep -q "email"; then
        echo -e "${GREEN}✓ JWT authentication working${NC}"
    else
        echo -e "${RED}✗ JWT authentication not working${NC}"
    fi
else
    echo -e "${RED}✗ Registration not working${NC}"
fi

# Test 5: Rate limiting
echo -e "\n${YELLOW}5. Testing rate limiting${NC}"
echo "Making multiple requests..."
for i in {1..5}; do
    RATE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/v1/production-test/rate-limit)
    echo "Request $i: HTTP $RATE_RESPONSE"
    if [ "$RATE_RESPONSE" = "429" ]; then
        echo -e "${GREEN}✓ Rate limiting working (429 received)${NC}"
        break
    fi
done

# Test 6: Compression
echo -e "\n${YELLOW}6. Testing compression${NC}"
COMPRESSION_SIZE=$(curl -s -H "Accept-Encoding: gzip" http://localhost:3000/v1/production-test/compression -w "%{size_download}" -o /dev/null)
UNCOMPRESSED_SIZE=$(curl -s http://localhost:3000/v1/production-test/compression -w "%{size_download}" -o /dev/null)
echo "Compressed size: $COMPRESSION_SIZE bytes"
echo "Uncompressed size: $UNCOMPRESSED_SIZE bytes"
if [ "$COMPRESSION_SIZE" -lt "$UNCOMPRESSED_SIZE" ]; then
    echo -e "${GREEN}✓ Compression working${NC}"
else
    echo -e "${RED}✗ Compression not working${NC}"
fi

echo -e "\n====================================="
echo "Test completed"
echo "====================================="