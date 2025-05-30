#!/bin/bash

echo "=== Phase 1 Testing Script ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command succeeded
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
        exit 1
    fi
}

echo "1. Checking Docker containers..."
docker-compose ps | grep -E "(mhmanus-backend|mhmanus-frontend|mhmanus-postgres|mhmanus-redis|mhmanus-ollama)" > /dev/null
check_result "All containers are running"

echo ""
echo "2. Testing Ollama API..."
curl -s http://localhost:11434/api/tags | grep -q "models"
check_result "Ollama API is accessible"

echo ""
echo "3. Testing Backend Health..."
HEALTH=$(curl -s http://localhost:3000/llm/health)
echo "$HEALTH" | grep -q '"ollama":true'
check_result "Backend LLM health check passed"

echo ""
echo "4. Testing LLM Completion..."
COMPLETION=$(curl -s -X POST http://localhost:3000/llm/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Say hello in one sentence.",
    "options": {
      "temperature": 0.7,
      "maxTokens": 50
    }
  }')
echo "$COMPLETION" | grep -q "content"
check_result "LLM completion endpoint works"
echo "   Response: $(echo $COMPLETION | grep -o '"content":"[^"]*"' | cut -d'"' -f4)"

echo ""
echo "5. Testing Frontend..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4200)
[ "$HTTP_STATUS" = "200" ]
check_result "Frontend is accessible (HTTP $HTTP_STATUS)"

echo ""
echo "6. Testing Database..."
docker exec mhmanus-postgres psql -U mhmanus -d mhmanus_db -c "SELECT 1" > /dev/null 2>&1
check_result "PostgreSQL is accessible"

echo ""
echo "7. Testing Redis..."
docker exec mhmanus-redis redis-cli ping | grep -q "PONG"
check_result "Redis is accessible"

echo ""
echo "=== Phase 1 Testing Complete ==="
echo ""
echo "You can now access the application at:"
echo "  - Frontend: http://localhost:4200"
echo "  - Backend API: http://localhost:3000"
echo "  - Ollama API: http://localhost:11434"
echo ""
echo "Try the chat interface at http://localhost:4200 to interact with the AI!"