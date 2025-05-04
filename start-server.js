import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dustTools from "./build/dust.js";
import fs from "fs";
import path from "path";

// Setup logging directory
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logger function that doesn't interfere with STDIO
function logger(level, message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  
  // Write to log file
  fs.appendFileSync(path.join(LOG_DIR, `server-${new Date().toISOString().split('T')[0]}.log`), logMessage + '\n');
  
  // Also output to stderr for debugging (doesn't interfere with STDIO transport)
  if (level === 'ERROR') {
    process.stderr.write(logMessage + '\n');
  }
}

// Create and start the MCP server
async function startServer() {
  try {
    logger('INFO', 'Starting Dust MCP Server...');
    
    // Create a new MCP server
    const server = new McpServer({
      name: "Dust MCP Server",
      description: "MCP server for interacting with Dust agents",
      version: "1.0.0"
    });
    
    // Register the Dust tools
    dustTools(server);
    
    // The MCP server automatically starts listening when created
    // Just log that we're ready
    logger('INFO', 'Dust MCP Server started successfully');
    process.stderr.write('Dust MCP Server started successfully. Waiting for connections...\n');
  } catch (error) {
    logger('ERROR', 'Failed to start Dust MCP Server', error);
    process.stderr.write(`Failed to start Dust MCP Server: ${error}\n`);
  }
}

// Run the server
startServer();
