// ES Module test script for Dust MCP tools
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Setup logging directory
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logger function
function logger(level, message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  
  // Write to log file
  fs.appendFileSync(path.join(LOG_DIR, `test-dust-${new Date().toISOString().split('T')[0]}.log`), logMessage + '\n');
  
  // Also output to console
  console.log(logMessage);
}

// Test Dust API directly
async function testDustAPI() {
  try {
    logger('INFO', 'Starting Dust API test...');
    
    // Load environment variables
    dotenv.config();
    
    const DUST_API_KEY = process.env.DUST_API_KEY;
    const DUST_WORKSPACE_ID = process.env.DUST_WORKSPACE_ID;
    const DUST_API_URL = process.env.DUST_API_URL || 'https://dust.tt/api/v1';
    
    if (!DUST_API_KEY || !DUST_WORKSPACE_ID) {
      logger('ERROR', 'Missing required environment variables: DUST_API_KEY, DUST_WORKSPACE_ID');
      return;
    }
    
    // Test listing agents
    logger('INFO', 'Testing listing agents...');
    try {
      const agentsResponse = await axios.get(
        `${DUST_API_URL}/w/${DUST_WORKSPACE_ID}/assistant/agent_configurations`,
        {
          headers: {
            'Authorization': `Bearer ${DUST_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger('INFO', 'Agents response:', {
        status: agentsResponse.status,
        count: agentsResponse.data?.agent_configurations?.length || 0
      });
      
      // Log first agent details
      if (agentsResponse.data?.agent_configurations?.length > 0) {
        const firstAgent = agentsResponse.data.agent_configurations[0];
        logger('INFO', 'First agent details:', {
          id: firstAgent.sId,
          name: firstAgent.name,
          description: firstAgent.description
        });
      }
    } catch (error) {
      logger('ERROR', 'Error listing agents:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    
    // Test creating a conversation
    logger('INFO', 'Testing conversation creation...');
    try {
      const createConversationResponse = await axios.post(
        `${DUST_API_URL}/w/${DUST_WORKSPACE_ID}/assistant/conversations`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${DUST_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const conversationId = createConversationResponse.data?.conversation?.sId;
      logger('INFO', 'Conversation created:', { conversationId });
      
      if (conversationId) {
        // Test sending a message
        logger('INFO', 'Testing sending a message...');
        try {
          const agentId = process.env.DUST_AGENT_IDs?.split(',')[0];
          
          if (!agentId) {
            logger('ERROR', 'No agent ID found in DUST_AGENT_IDs');
            return;
          }
          
          const messageResponse = await axios.post(
            `${DUST_API_URL}/w/${DUST_WORKSPACE_ID}/assistant/conversations/${conversationId}/messages`,
            {
              message: {
                role: 'user',
                content: {
                  type: 'text',
                  text: 'Give me a brief summary of the Dust API'
                },
                mentions: [],
                context: {},
                agentId
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${DUST_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const messageId = messageResponse.data?.message?.sId;
          logger('INFO', 'Message sent:', { messageId });
          
          // Poll for message status
          if (messageId) {
            logger('INFO', 'Polling for message status...');
            let isComplete = false;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!isComplete && attempts < maxAttempts) {
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              
              try {
                const statusResponse = await axios.get(
                  `${DUST_API_URL}/w/${DUST_WORKSPACE_ID}/assistant/conversations/${conversationId}/messages/${messageId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${DUST_API_KEY}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
                
                const status = statusResponse.data?.message?.status;
                logger('INFO', `Message status (attempt ${attempts}):`, { status });
                
                if (status === 'succeeded') {
                  isComplete = true;
                  logger('INFO', 'Message completed:', {
                    content: statusResponse.data?.message?.content
                  });
                } else if (status === 'failed') {
                  isComplete = true;
                  logger('ERROR', 'Message failed:', {
                    error: statusResponse.data?.message?.error
                  });
                }
              } catch (error) {
                logger('ERROR', 'Error checking message status:', {
                  message: error.message,
                  status: error.response?.status,
                  data: error.response?.data
                });
              }
            }
            
            if (!isComplete) {
              logger('ERROR', 'Message did not complete within the expected time');
            }
          }
        } catch (error) {
          logger('ERROR', 'Error sending message:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
        }
      }
    } catch (error) {
      logger('ERROR', 'Error creating conversation:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    
    logger('INFO', 'Dust API test completed');
  } catch (error) {
    logger('ERROR', 'Error testing Dust API:', error);
  }
}

// Run the test
testDustAPI();
