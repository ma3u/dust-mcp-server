// Simple test script for Dust MCP client
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHttpTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import fs from 'fs';
import path from 'path';

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

// Test Dust MCP client
async function testDustClient() {
  try {
    logger('INFO', 'Starting Dust MCP client test...');
    
    // Create MCP client
    const client = new Client({
      name: "Dust MCP Test Client",
      version: "1.0.0"
    });
    
    // Create HTTP transport and connect to local MCP server
    const transport = new StreamableHttpTransport({
      url: "http://localhost:3000"
    });
    
    logger('INFO', 'Connecting to MCP server...');
    
    // Connect client to transport
    await client.connect(transport);
    
    logger('INFO', 'Connected to MCP server');
    
    // Test dust_list_agents tool
    logger('INFO', 'Testing dust_list_agents tool...');
    try {
      const agentsResponse = await client.callTool({
        name: "dust_list_agents",
        params: {
          limit: 5
        }
      });
      
      logger('INFO', 'dust_list_agents response:', agentsResponse);
    } catch (error) {
      logger('ERROR', 'Error testing dust_list_agents:', error);
    }
    
    logger('INFO', 'Dust MCP client test completed');
  } catch (error) {
    logger('ERROR', 'Error testing Dust MCP client:', error);
  }
}

// Run the test
testDustClient();
