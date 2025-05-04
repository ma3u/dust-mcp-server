#!/bin/bash
# Debug script for Dust API integration
# Created: 2025-05-04

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

# Check if required environment variables are set
if [ -z "$DUST_API_KEY" ]; then
  echo "Error: DUST_API_KEY is not set in .env file"
  exit 1
fi

if [ -z "$DUST_WORKSPACE_ID" ]; then
  echo "Error: DUST_WORKSPACE_ID is not set in .env file"
  exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs/debug

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
LOG_FILE="logs/debug/dust-api-debug-$TIMESTAMP.log"

echo "Dust API Debug Script" > $LOG_FILE
echo "======================" >> $LOG_FILE
echo "Date: $(date)" >> $LOG_FILE
echo "Workspace ID: $DUST_WORKSPACE_ID" >> $LOG_FILE
echo "API URL: $DUST_API_URL" >> $LOG_FILE
echo "" >> $LOG_FILE

# Function to run curl command and log results
run_curl() {
  local description=$1
  local curl_cmd=$2
  
  echo "Test: $description" >> $LOG_FILE
  echo "Command: $curl_cmd" >> $LOG_FILE
  echo "Response:" >> $LOG_FILE
  
  # Run the curl command and capture output
  eval $curl_cmd >> $LOG_FILE 2>&1
  
  echo "" >> $LOG_FILE
  echo "----------------------------------------" >> $LOG_FILE
}

# Test 1: Check API connectivity
run_curl "API Connectivity Test" "curl -s -o /dev/null -w 'Status: %{http_code}' --request GET --url $DUST_API_URL/w/$DUST_WORKSPACE_ID --header 'accept: application/json' --header 'authorization: Bearer $DUST_API_KEY'"

# Test 2: List agent configurations
run_curl "List Agent Configurations" "curl --request GET --url $DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/agent_configurations --header 'accept: application/json' --header 'authorization: Bearer $DUST_API_KEY'"

# Test 3: Get specific agent configuration (using first agent ID from .env)
AGENT_ID=$(echo $DUST_AGENT_IDs | cut -d ',' -f 1 | xargs)
run_curl "Get Agent Configuration" "curl --request GET --url $DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/agent_configurations/$AGENT_ID --header 'accept: application/json' --header 'authorization: Bearer $DUST_API_KEY'"

# Test 4: Create a conversation
run_curl "Create Conversation" "curl --request POST --url $DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/conversations --header 'accept: application/json' --header 'authorization: Bearer $DUST_API_KEY' --header 'content-type: application/json'"

# Test 5: Send a message to the conversation (if Test 4 succeeds)
# This requires parsing the conversation ID from Test 4, which is complex in a bash script
# For simplicity, we'll use a placeholder
echo "Test: Send Message to Conversation" >> $LOG_FILE
echo "Note: This test requires manually extracting the conversation ID from Test 4 response" >> $LOG_FILE
echo "Example command:" >> $LOG_FILE
echo "curl --request POST --url $DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/conversations/CONVERSATION_ID/messages --header 'accept: application/json' --header 'authorization: Bearer $DUST_API_KEY' --header 'content-type: application/json' --data '{\"assistant\": \"$AGENT_ID\", \"content\": \"Give me a summary\", \"mentions\": [], \"context\": {\"username\": \"$DUST_USERNAME\", \"timezone\": \"UTC\", \"email\": \"$DUST_EMAIL\", \"fullname\": \"$DUST_FULLNAME\"}}'" >> $LOG_FILE
echo "" >> $LOG_FILE
echo "----------------------------------------" >> $LOG_FILE

# Test 6: Test both API endpoints for agent info
run_curl "Get Agent (Old Endpoint)" "curl --request GET --url $DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/$AGENT_ID --header 'accept: application/json' --header 'authorization: Bearer $DUST_API_KEY'"

run_curl "Get Agent (New Endpoint)" "curl --request GET --url $DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/agent_configurations/$AGENT_ID --header 'accept: application/json' --header 'authorization: Bearer $DUST_API_KEY'"

echo "Debug completed. Results saved to $LOG_FILE"
echo "Run 'cat $LOG_FILE' to view the results"
