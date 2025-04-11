// Test script for the echo parameter in query_dust_agent
import { queryDustAgent } from './build/services/dustService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEcho() {
  try {
    console.log('Testing echo functionality...');
    
    // Get the default agent ID from environment
    const agentIdsString = process.env.DUST_AGENT_IDs;
    if (!agentIdsString) {
      console.error('DUST_AGENT_IDs is not set in environment variables');
      return;
    }
    
    // Parse the comma-separated list and get the first agent ID
    const agentIds = agentIdsString.split(',').map(id => id.trim());
    if (agentIds.length === 0) {
      console.error('No agent IDs found in DUST_AGENT_IDs environment variable');
      return;
    }
    
    const agentId = agentIds[0];
    const query = 'Give me a summary';
    
    console.log(`Using agent ID: ${agentId}`);
    console.log(`Query: ${query}`);
    
    // Call the queryDustAgent function directly
    const response = await queryDustAgent(agentId, query, {}, undefined);
    
    console.log('Response:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing echo functionality:', error);
  }
}

testEcho().catch(console.error);
