// Direct test script for Dust MCP server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import dustTools from "./build/dust.js";

// Load environment variables
dotenv.config();

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
  fs.appendFileSync(path.join(LOG_DIR, `test-direct-${new Date().toISOString().split('T')[0]}.log`), logMessage + '\n');
  
  // Also output to console
  console.log(logMessage);
}

// Test Dust tools directly
async function testDustTools() {
  try {
    logger('INFO', 'Starting direct Dust tools test...');
    
    // Create a new MCP server
    const server = new McpServer({
      name: "Dust MCP Test Server",
      version: "1.0.0"
    });
    
    // Register the Dust tools
    dustTools(server);
    
    // Get all registered tools
    const tools = server.getTools();
    
    logger('INFO', 'Available tools:', tools.map(tool => tool.name));
    
    // Test dust_list_agents tool directly
    if (tools.find(tool => tool.name === 'dust_list_agents')) {
      logger('INFO', 'Testing dust_list_agents tool directly...');
      
      try {
        // Get the tool handler
        const listAgentsTool = tools.find(tool => tool.name === 'dust_list_agents');
        
        // Call the tool handler directly
        const result = await listAgentsTool.handler({ limit: 5 });
        
        logger('INFO', 'dust_list_agents result:', result);
      } catch (error) {
        logger('ERROR', 'Error testing dust_list_agents directly:', error);
      }
    } else {
      logger('ERROR', 'dust_list_agents tool not found');
    }
    
    logger('INFO', 'Direct Dust tools test completed');
  } catch (error) {
    logger('ERROR', 'Error testing Dust tools directly:', error);
  }
}

// Run the test
testDustTools();
