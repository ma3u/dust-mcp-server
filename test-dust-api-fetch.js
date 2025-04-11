// Test script for direct Dust API interaction using fetch
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Get environment variables
const DUST_API_KEY = process.env.DUST_API_KEY;
const DUST_API_URL = process.env.DUST_API_URL;
const DUST_WORKSPACE_ID = process.env.DUST_WORKSPACE_ID;
const DUST_AGENT_ID = (process.env.DUST_AGENT_IDs || '').split(',')[0].trim();

// Normalize the base URL
const baseUrl = DUST_API_URL.endsWith('/') ? DUST_API_URL.slice(0, -1) : DUST_API_URL;

async function testDustAPI() {
  console.log('Testing Dust API with the following configuration:');
  console.log(`API URL: ${baseUrl}`);
  console.log(`Workspace ID: ${DUST_WORKSPACE_ID}`);
  console.log(`Agent ID: ${DUST_AGENT_ID}`);
  console.log('API Key: ' + (DUST_API_KEY ? DUST_API_KEY.substring(0, 5) + '...' : 'Not set'));
  
  try {
    // Step 1: Create a new conversation
    console.log('\n1. Creating a new conversation...');
    const createConversationUrl = `${baseUrl}/w/${DUST_WORKSPACE_ID}/assistant/conversations`;
    
    const createOptions = {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Bearer ${DUST_API_KEY}`
      }
    };
    
    console.log('Request URL:', createConversationUrl);
    console.log('Request options:', JSON.stringify(createOptions, null, 2));
    
    const createResponse = await fetch(createConversationUrl, createOptions);
    const createData = await createResponse.json();
    
    console.log('Create conversation response status:', createResponse.status);
    console.log('Create conversation response data:', JSON.stringify(createData, null, 2));
    
    if (!createData?.conversation?.sId) {
      throw new Error('Failed to get conversation ID from response');
    }
    
    const conversationSId = createData.conversation.sId;
    console.log(`Created new conversation with ID: ${conversationSId}`);
    
    // Step 2: Send a message to the conversation
    console.log('\n2. Sending a message to the conversation...');
    const messageUrl = `${baseUrl}/w/${DUST_WORKSPACE_ID}/assistant/conversations/${conversationSId}/messages`;
    
    const messagePayload = {
      assistant: DUST_AGENT_ID,
      content: 'Give me a summary',
      mentions: [], // Required by the API
      context: {
        // Required user context fields
        username: process.env.DUST_USERNAME || "Anonymous User",
        timezone: process.env.DUST_TIMEZONE || "UTC",
        email: process.env.DUST_EMAIL || "",
        fullname: process.env.DUST_FULLNAME || ""
      }
    };
    
    const messageOptions = {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Bearer ${DUST_API_KEY}`
      },
      body: JSON.stringify(messagePayload)
    };
    
    console.log('Message URL:', messageUrl);
    console.log('Message payload:', JSON.stringify(messagePayload, null, 2));
    
    const messageResponse = await fetch(messageUrl, messageOptions);
    const messageData = await messageResponse.json();
    
    console.log('Message response status:', messageResponse.status);
    console.log('Message response data:', JSON.stringify(messageData, null, 2));
    
    if (!messageData?.message?.sId) {
      throw new Error('Failed to get message ID from response');
    }
    
    const messageSId = messageData.message.sId;
    console.log(`Message sent with ID: ${messageSId}`);
    
    // Step 3: Poll the conversation to get the agent's response
    console.log('\n3. Polling for agent response...');
    const conversationUrl = `${baseUrl}/w/${DUST_WORKSPACE_ID}/assistant/conversations/${conversationSId}`;
    
    const conversationOptions = {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${DUST_API_KEY}`
      }
    };
    
    let agentResponse = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!agentResponse && attempts < maxAttempts) {
      attempts++;
      
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      
      // Wait between polling attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the conversation with its messages
      const conversationResponse = await fetch(conversationUrl, conversationOptions);
      const conversationData = await conversationResponse.json();
      
      console.log(`Conversation response status: ${conversationResponse.status}`);
      
      // Check if there are messages in the conversation
      if (conversationData?.conversation?.content && 
          Array.isArray(conversationData.conversation.content) && 
          conversationData.conversation.content.length >= 2) {
        
        console.log(`Found ${conversationData.conversation.content.length} messages in conversation`);
        
        // The first message is the user's, the second is the agent's response
        const agentMessageVersions = conversationData.conversation.content[1];
        
        if (agentMessageVersions && agentMessageVersions.length > 0) {
          console.log(`Found ${agentMessageVersions.length} versions of agent message`);
          
          // Get the latest version of the agent's message
          const latestAgentMessage = agentMessageVersions[agentMessageVersions.length - 1];
          console.log(`Latest agent message status: ${latestAgentMessage.status}`);
          
          if (latestAgentMessage.status === "completed") {
            agentResponse = latestAgentMessage;
            console.log(`Found agent response after ${attempts} attempts`);
          }
        }
      }
    }
    
    if (!agentResponse) {
      throw new Error(`Timed out waiting for agent response after ${maxAttempts} attempts`);
    }
    
    console.log('\n4. Agent response:');
    console.log(JSON.stringify(agentResponse, null, 2));
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('\nError testing Dust API:');
    console.error(error);
  }
}

testDustAPI();
