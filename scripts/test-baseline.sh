#!/bin/bash
set -e

echo "=== Testing Frontend Build ==="
cd /Users/shubhamjain/wedding-invite-mvp/frontend && npm run build

echo "=== Testing Backend Syntax ==="
cd /Users/shubhamjain/wedding-invite-mvp/backend
node -c server.js && echo "server.js syntax OK"
node -c gemini.js && echo "gemini.js syntax OK"

echo "=== Baseline Tests Passed ==="
