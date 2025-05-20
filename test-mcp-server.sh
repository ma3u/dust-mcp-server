#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing MCP Server Functionality${NC}"
echo "==============================="
echo ""

# Server URL
SERVER_URL="http://localhost:3000/mcp"

# Step 1: Initialize the MCP connection
echo -e "${BLUE}Step 1: Sending initialization request...${NC}"

INIT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "client": {
        "name": "mcp-test-client",
        "version": "1.0.0"
      },
      "capabilities": ["tools"]
    },
    "id": 1
  }' \
  $SERVER_URL)

echo "Response: $INIT_RESPONSE"
echo ""

# Extract session ID from response headers
SESSION_ID=$(echo "$INIT_RESPONSE" | grep -o '"mcp-session-id":"[^"]*"' | sed 's/"mcp-session-id":"//;s/"//')

if [ -z "$SESSION_ID" ]; then
  # Try alternative approach to extract session ID from the response
  SESSION_ID=$(echo "$INIT_RESPONSE" | grep -o '"sessionId":"[^"]*"' | sed 's/"sessionId":"//;s/"//')
fi

if [ -z "$SESSION_ID" ]; then
  echo -e "${RED}Failed to extract session ID from the response${NC}"
  exit 1
fi

echo -e "${GREEN}Retrieved session ID: $SESSION_ID${NC}"
echo ""

# Step 2: List available tools (if available)
echo -e "${BLUE}Step 2: Retrieving available tools...${NC}"

TOOLS_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "listTools",
    "params": {},
    "id": 2
  }' \
  $SERVER_URL)

echo "Response: $TOOLS_RESPONSE"
echo ""

# Step 3: Test the health endpoint
echo -e "${BLUE}Step 3: Testing health endpoint...${NC}"

HEALTH_RESPONSE=$(curl -s -X GET http://localhost:3000/health)

echo "Response: $HEALTH_RESPONSE"

if [[ "$HEALTH_RESPONSE" == *"status"* && "$HEALTH_RESPONSE" == *"ok"* ]]; then
  echo -e "${GREEN}Health endpoint is working!${NC}"
else
  echo -e "${RED}Health endpoint not responding correctly${NC}"
fi

echo ""

# Step 4: Clean up session
echo -e "${BLUE}Step 4: Cleaning up session...${NC}"

CLEANUP_RESPONSE=$(curl -s -X DELETE \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  $SERVER_URL)

echo "Response: $CLEANUP_RESPONSE"

if [[ "$CLEANUP_RESPONSE" == *"success"* ]]; then
  echo -e "${GREEN}Session cleanup successful!${NC}"
else
  echo -e "${BLUE}Note: Session cleanup response may be empty, which is normal${NC}"
fi

echo ""
echo -e "${GREEN}MCP Server Test Complete!${NC}"
