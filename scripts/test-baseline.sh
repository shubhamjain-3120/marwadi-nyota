#!/bin/bash
set -e

# Baseline Test Script for Codebase Cleanup
# Tests frontend build and backend startup to ensure nothing breaks

echo "=================================================="
echo "🧪 Running Baseline Tests"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Test 1: Frontend Build
echo "📦 Test 1: Frontend Build"
echo "--------------------------------------------------"
cd frontend
if npm run build; then
  echo -e "${GREEN}✅ Frontend build successful${NC}"
else
  echo -e "${RED}❌ Frontend build FAILED${NC}"
  FAILED=1
fi
cd ..
echo ""

# Test 2: Backend Startup (timeout after 10 seconds)
echo "🚀 Test 2: Backend Startup"
echo "--------------------------------------------------"
cd backend

# Start backend in background
npm run dev > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!

# Wait up to 10 seconds for backend to start
COUNTER=0
BACKEND_STARTED=0

while [ $COUNTER -lt 10 ]; do
  if grep -q "Running on http" /tmp/backend-test.log 2>/dev/null; then
    BACKEND_STARTED=1
    break
  fi
  sleep 1
  COUNTER=$((COUNTER + 1))
done

# Kill backend process
kill $BACKEND_PID 2>/dev/null || true
wait $BACKEND_PID 2>/dev/null || true

if [ $BACKEND_STARTED -eq 1 ]; then
  echo -e "${GREEN}✅ Backend started successfully${NC}"
else
  echo -e "${RED}❌ Backend startup FAILED or timed out${NC}"
  echo "Last 20 lines of backend log:"
  tail -20 /tmp/backend-test.log || echo "(no log found)"
  FAILED=1
fi

cd ..
echo ""

# Summary
echo "=================================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All baseline tests PASSED${NC}"
  echo "=================================================="
  exit 0
else
  echo -e "${RED}💥 Some tests FAILED - do not proceed with cleanup${NC}"
  echo "=================================================="
  exit 1
fi
