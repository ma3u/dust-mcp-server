// Debug script to test Dust API directly
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create debug logs directory if it doesn't exist
const debugLogsDir = path.join(process.cwd(), 'logs', 'debug');
if (!fs.existsSync(debugLogsDir)) {
  fs.mkdirSync(debugLogsDir, { recursive: true });
}

// Create a debug log file
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFile = path.join(debugLogsDir, `dust-api-debug-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log function
const log = (message) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  logStream.write(formattedMessage);
  console.log(formattedMessage);
};

// Test Dust API directly
async function testDustAPI() {
  try {
    // Log configuration
    log('Dust API Configuration:');
    log(`API URL: ${process.env.DUST_API_URL}`);
    log(`Workspace ID: ${process.env.DUST_WORKSPACE_ID}`);
    log(`API Key: ${process.env.DUST_API_KEY ? '***REDACTED***' : 'Not Set'}`);
    
    // Validate configuration
    if (!process.env.DUST_API_KEY) {
      throw new Error('DUST_API_KEY is not set in environment variables');
    }
    
    if (!process.env.DUST_WORKSPACE_ID) {
      throw new Error('DUST_WORKSPACE_ID is not set in environment variables');
    }
    
    const baseUrl = process.env.DUST_API_URL || 'https://dust.tt/api/v1';
    const workspaceId = process.env.DUST_WORKSPACE_ID;
    const apiKey = process.env.DUST_API_KEY;
    
    // Step 1: Test API connection by listing agents
    log('Testing API connection by listing agents...');
    const listAgentsUrl = `${baseUrl}/w/${workspaceId}/assistant/agents`;
    
    try {
      const listResponse = await axios.get(listAgentsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      
      log(`List agents response status: ${listResponse.status}`);
      log(`List agents response data: ${JSON.stringify(listResponse.data, null, 2)}`);
      
      // If we got a successful response, try to query an agent
      if (listResponse.status === 200) {
        // Step 2: Create a conversation
        log('Creating a conversation...');
        const createConversationUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations`;
        
        const createResponse = await axios.post(createConversationUrl, {}, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        log(`Create conversation response status: ${createResponse.status}`);
        log(`Create conversation response data: ${JSON.stringify(createResponse.data, null, 2)}`);
        
        if (createResponse.data?.conversation?.sId) {
          const conversationSId = createResponse.data.conversation.sId;
          log(`Created conversation with ID: ${conversationSId}`);
          
          // Step 3: Send a message to the conversation
          const agentId = 'helper'; // Use the helper agent
          const messageUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations/${conversationSId}/messages`;
          
          log(`Sending message to agent ${agentId}...`);
          const messagePayload = {
            assistant: agentId,
            content: 'Give me a summary',
            mentions: [],
            context: {
              username: process.env.DUST_USERNAME || 'Anonymous User',
              timezone: 'UTC',
              email: process.env.DUST_EMAIL || '',
              fullname: process.env.DUST_FULLNAME || ''
            }
          };
          
          const messageResponse = await axios.post(messageUrl, messagePayload, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          log(`Message response status: ${messageResponse.status}`);
          log(`Message response data: ${JSON.stringify(messageResponse.data, null, 2)}`);
          
          // Step 4: Poll for the agent's response
          const conversationUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations/${conversationSId}`;
          let agentResponse = null;
          let attempts = 0;
          const maxAttempts = 10;
          
          log('Polling for agent response...');
          
          while (!agentResponse && attempts < maxAttempts) {
            attempts++;
            log(`Polling attempt ${attempts}/${maxAttempts}...`);
            
            // Wait between polling attempts
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const conversationResponse = await axios.get(conversationUrl, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
              }
            });
            
            log(`Polling response status: ${conversationResponse.status}`);
            
            if (conversationResponse.data?.conversation?.content) {
              log(`Found ${conversationResponse.data.conversation.content.length} message groups in conversation`);
              
              // Look for the assistant's response message
              for (let i = 0; i < conversationResponse.data.conversation.content.length; i++) {
                const messageVersions = conversationResponse.data.conversation.content[i];
                
                if (messageVersions && messageVersions.length > 0) {
                  // Get the latest version of the message
                  const latestMessage = messageVersions[messageVersions.length - 1];
                  
                  // Check if this is an assistant message
                  if (latestMessage.type === "assistant_message") {
                    log(`Found assistant message with status: ${latestMessage.status}`);
                    
                    // Check if the message is completed
                    if (latestMessage.status === "completed" || latestMessage.status === "complete") {
                      agentResponse = latestMessage;
                      log(`Found completed agent response: ${JSON.stringify(agentResponse, null, 2)}`);
                      break;
                    }
                  }
                }
              }
            }
          }
          
          if (!agentResponse) {
            log(`Timed out waiting for agent response after ${maxAttempts} attempts`);
          }
        }
      }
    } catch (error) {
      log(`Error testing API connection: ${error.message}`);
      if (error.response) {
        log(`Error response status: ${error.response.status}`);
        log(`Error response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  } catch (error) {
    log(`Error: ${error.message}`);
  } finally {
    logStream.end();
    console.log(`Debug log written to: ${logFile}`);
  }
}

// Run the test
testDustAPI();
