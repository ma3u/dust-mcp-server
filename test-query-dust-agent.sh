#!/bin/bash
# Test script for query_dust_agent method
# Created: 2025-05-04

# Load environment variables from .env file
if [ -f .env ]; then
  # Load environment variables without using xargs to avoid issues with spaces and special characters
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    if [[ ! $line =~ ^\s*# && -n $line ]]; then
      # Extract variable name and value
      var_name=$(echo "$line" | cut -d= -f1)
      var_value=$(echo "$line" | cut -d= -f2-)
      # Export the variable
      export "$var_name"="$var_value"
    fi
  done < .env
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
LOG_FILE="logs/debug/query-dust-agent-$TIMESTAMP.log"

# Get the first agent ID from environment variable
AGENT_ID=$(echo $DUST_AGENT_IDs | cut -d',' -f 1 | xargs)

# If AGENT_ID is empty or contains invalid characters, use a hardcoded value from the debug logs
if [ -z "$AGENT_ID" ] || [[ $AGENT_ID == *","* ]]; then
  echo "Warning: Could not extract a valid agent ID from environment variables" | tee -a $LOG_FILE
  # Use the SystemsThinking agent ID from your debug logs
  AGENT_ID="8x9nuWdMnR"
  echo "Using hardcoded agent ID: $AGENT_ID" | tee -a $LOG_FILE
fi
QUERY="Give me a summary"

echo "Dust API Query Test" > $LOG_FILE
echo "===================" >> $LOG_FILE
echo "Date: $(date)" >> $LOG_FILE
echo "Workspace ID: $DUST_WORKSPACE_ID" >> $LOG_FILE
echo "Agent ID: $AGENT_ID" >> $LOG_FILE
echo "Query: $QUERY" >> $LOG_FILE
echo "" >> $LOG_FILE

# Step 1: Create a conversation
echo "Step 1: Creating conversation..." | tee -a $LOG_FILE
CONVERSATION_RESPONSE=$(curl --silent --request POST \
  --url "$DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/conversations" \
  --header "accept: application/json" \
  --header "authorization: Bearer $DUST_API_KEY" \
  --header "content-type: application/json")

echo "Conversation Response:" >> $LOG_FILE
echo "$CONVERSATION_RESPONSE" >> $LOG_FILE
echo "" >> $LOG_FILE

# Extract conversation ID - need to get the conversation.sId, not the owner.sId
echo "Extracting conversation ID from response..." | tee -a $LOG_FILE
echo "$CONVERSATION_RESPONSE" | grep -o '"conversation".*' >> $LOG_FILE

# Try to extract using Python for more reliable JSON parsing
CONVERSATION_ID=$(echo $CONVERSATION_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('conversation', {}).get('sId', ''))" 2>/dev/null)

# If Python method fails, try grep as fallback
if [ -z "$CONVERSATION_ID" ]; then
  # Look specifically for conversation sId, not the first sId which might be the workspace
  CONVERSATION_ID=$(echo $CONVERSATION_RESPONSE | grep -o '"conversation".*"sId":"[^"]*"' | grep -o '"sId":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$CONVERSATION_ID" ]; then
  echo "Error: Failed to extract conversation ID from response"
  echo "Error: Failed to extract conversation ID from response" >> $LOG_FILE
  exit 1
fi

echo "Conversation ID: $CONVERSATION_ID" | tee -a $LOG_FILE
echo "" >> $LOG_FILE

# Step 2: Send a message to the conversation
echo "Step 2: Sending message to conversation..." | tee -a $LOG_FILE

MESSAGE_PAYLOAD='{
  "assistant": "'$AGENT_ID'",
  "content": "'$QUERY'",
  "mentions": [],
  "context": {
    "username": "'${DUST_USERNAME:-Anonymous User}'",
    "timezone": "'${DUST_TIMEZONE:-UTC}'",
    "email": "'${DUST_EMAIL:-}'",
    "fullname": "'${DUST_FULLNAME:-}'"
  }
}'

echo "Message Payload:" >> $LOG_FILE
echo "$MESSAGE_PAYLOAD" >> $LOG_FILE
echo "" >> $LOG_FILE

MESSAGE_RESPONSE=$(curl --silent --request POST \
  --url "$DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/conversations/$CONVERSATION_ID/messages" \
  --header "accept: application/json" \
  --header "authorization: Bearer $DUST_API_KEY" \
  --header "content-type: application/json" \
  --data "$MESSAGE_PAYLOAD")

echo "Message Response:" >> $LOG_FILE
echo "$MESSAGE_RESPONSE" >> $LOG_FILE
echo "" >> $LOG_FILE

# Extract message ID
MESSAGE_ID=$(echo $MESSAGE_RESPONSE | grep -o '"sId":"[^"]*"' | head -1 | cut -d'"' -f4)

# If the above method fails, try an alternative extraction method
if [ -z "$MESSAGE_ID" ]; then
  MESSAGE_ID=$(echo $MESSAGE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('message', {}).get('sId', ''))" 2>/dev/null)
fi

# If still empty, try to continue anyway with a debug message
if [ -z "$MESSAGE_ID" ]; then
  echo "Warning: Could not extract message ID, but continuing anyway" | tee -a $LOG_FILE
  echo "Full message response:" >> $LOG_FILE
  echo "$MESSAGE_RESPONSE" >> $LOG_FILE
fi

if [ -z "$MESSAGE_ID" ]; then
  echo "Warning: Failed to extract message ID from response, but continuing anyway" | tee -a $LOG_FILE
  echo "Will try to poll the conversation without a specific message ID" | tee -a $LOG_FILE
  # Don't exit, try to continue
fi

echo "Message ID: $MESSAGE_ID" | tee -a $LOG_FILE
echo "" >> $LOG_FILE

# Step 3: Poll for the agent's response
echo "Step 3: Polling for agent response..." | tee -a $LOG_FILE

MAX_ATTEMPTS=30
POLLING_INTERVAL=2
ATTEMPTS=0
AGENT_RESPONSE=""

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  
  echo "Polling attempt $ATTEMPTS/$MAX_ATTEMPTS..." | tee -a $LOG_FILE
  
  CONVERSATION_DATA=$(curl --silent --request GET \
    --url "$DUST_API_URL/w/$DUST_WORKSPACE_ID/assistant/conversations/$CONVERSATION_ID" \
    --header "accept: application/json" \
    --header "authorization: Bearer $DUST_API_KEY")
  
  # Save only the first polling attempt for debugging
  if [ $ATTEMPTS -eq 1 ]; then
    echo "Conversation Data (first polling):" >> $LOG_FILE
    echo "$CONVERSATION_DATA" >> $LOG_FILE
    echo "" >> $LOG_FILE
  fi
  
  # Check if there's a completed assistant message
  COMPLETED_MESSAGE=$(echo "$CONVERSATION_DATA" | grep -o '"type":"assistant_message"[^}]*"status":"completed"')
  
  if [ ! -z "$COMPLETED_MESSAGE" ]; then
    echo "Found completed agent response on attempt $ATTEMPTS" | tee -a $LOG_FILE
    
    # Extract the content of the assistant message
    # This is a simplified extraction and might need adjustment based on the actual response format
    AGENT_RESPONSE=$(echo "$CONVERSATION_DATA" | grep -o '"content":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo "Agent Response Content:" >> $LOG_FILE
    echo "$CONVERSATION_DATA" >> $LOG_FILE
    break
  fi
  
  sleep $POLLING_INTERVAL
done

if [ -z "$AGENT_RESPONSE" ]; then
  echo "Error: Timed out waiting for agent response after $MAX_ATTEMPTS attempts" | tee -a $LOG_FILE
  echo "Last conversation data:" >> $LOG_FILE
  echo "$CONVERSATION_DATA" >> $LOG_FILE
else
  echo "" >> $LOG_FILE
  echo "Final Agent Response:" | tee -a $LOG_FILE
  echo "$AGENT_RESPONSE" | tee -a $LOG_FILE
fi

echo "" >> $LOG_FILE
echo "Test completed. Results saved to $LOG_FILE"
echo "Run 'cat $LOG_FILE' to view the full results"
