// Test script for MCP tools
import { Client } from "@modelcontextprotocol/sdk/dist/cjs/client/index.js";
import { StreamableHttpTransport } from "@modelcontextprotocol/sdk/dist/cjs/client/streamableHttp.js";
import fs from "fs";
import path from "path";

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
  fs.appendFileSync(path.join(LOG_DIR, `test-mcp-${new Date().toISOString().split('T')[0]}.log`), logMessage + '\n');
  
  // Also output to console
  console.log(logMessage);
}

// Test MCP tools
async function testMcpTools() {
  try {
    logger('INFO', 'Starting MCP tools test...');
    
    // Create MCP client
    const client = new Client({
      name: "Dust MCP Test Client",
      version: "1.0.0"
    });
    
    // Create HTTP transport and connect to local MCP server
    const transport = new StreamableHttpTransport({
      url: "http://localhost:3000"
    });
    
    // Connect client to transport
    await client.connect(transport);
    
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
    
    // Test dust_agent_query tool
    logger('INFO', 'Testing dust_agent_query tool...');
    try {
      const queryResponse = await client.callTool({
        name: "dust_agent_query",
        params: {
          query: "Give me a summary of the Dust API"
        }
      });
      
      logger('INFO', 'dust_agent_query response:', queryResponse);
    } catch (error) {
      logger('ERROR', 'Error testing dust_agent_query:', error);
    }
    
    logger('INFO', 'MCP tools test completed');
  } catch (error) {
    logger('ERROR', 'Error testing MCP tools:', error);
  }
}

// Run the test
testMcpTools();
