const axios = require('axios');
require('dotenv').config();

async function testDustAPI() {
  const DUST_API_KEY = process.env.DUST_API_KEY;
  const DUST_WORKSPACE_ID = process.env.DUST_WORKSPACE_ID;
  const DUST_API_URL = process.env.DUST_API_URL || 'https://dust.tt/api/v1';
  
  if (!DUST_API_KEY) {
    console.error("DUST_API_KEY is not set in environment variables");
    return;
  }
  
  if (!DUST_WORKSPACE_ID) {
    console.error("DUST_WORKSPACE_ID is not set in environment variables");
    return;
  }
  
  // Remove trailing slash if present
  const baseUrl = DUST_API_URL.endsWith('/') ? DUST_API_URL.slice(0, -1) : DUST_API_URL;
  
  // Test the agent configurations endpoint
  const agentConfigUrl = `${baseUrl}/w/${DUST_WORKSPACE_ID}/assistant/agent_configurations`;
  console.log(`Testing agent configurations API: ${agentConfigUrl}`);
  
  try {
    const response = await axios.get(agentConfigUrl, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data && Array.isArray(response.data.configurations)) {
      console.log(`Found ${response.data.configurations.length} agent configurations`);
      response.data.configurations.forEach(config => {
        console.log(`- ${config.id}: ${config.name || 'Unnamed'}`);
      });
    } else {
      console.log('No agent configurations found in the response');
      console.log('Full response structure:', Object.keys(response.data));
    }
  } catch (error) {
    console.error('Error testing Dust API:', error.message);
    if (error.response) {
      console.error(`API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
  }
}

testDustAPI().catch(console.error);
