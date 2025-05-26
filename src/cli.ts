#!/usr/bin/env node

// Simple debug logging
console.error('=== Starting Dust MCP Server in CLI/STDIO mode ===');
console.error('Node.js version:', process.version);
console.error('Current working directory:', process.cwd());

// Import required modules
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAgentTools } from './agents/agentTools.js';
import logger from './utils/logger.js';

// Debug environment variables
console.error('Environment:');
console.error('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.error(
  '- DUST_API_KEY:',
  process.env.DUST_API_KEY
    ? '***' + process.env.DUST_API_KEY.slice(-4)
    : 'not set'
);
console.error(
  '- DUST_WORKSPACE_ID:',
  process.env.DUST_WORKSPACE_ID || 'not set'
);
console.error('- DUST_AGENT_ID:', process.env.DUST_AGENT_ID || 'not set');
console.error('- LOGS_DIR:', process.env.LOGS_DIR || 'not set');

// Track if server is already started
let serverStarted = false;

async function startServer() {
  if (serverStarted) {
    console.error('Server is already running');
    return;
  }

  serverStarted = true;

  try {
    console.error('Creating MCP server instance...');
    const server = new McpServer({
      name: 'dust-mcp-server',
      version: '1.0.0',
      capabilities: ['tools'],
    });

    console.error('Registering tools...');
    try {
      registerAgentTools(server);
    } catch (toolError) {
      console.error('Error registering tools:', toolError);
      // Continue even if tool registration fails
    }

    console.error('Creating STDIO transport...');
    const transport = new StdioServerTransport();

    console.error('Connecting to MCP server...');
    await server.connect(transport);

    console.error('MCP server is running in CLI/STDIO mode');
    logger.info('MCP server is running in CLI/STDIO mode');

    // Keep the process alive
    // This is a simple way to keep the process running
    // The MCP server will handle the actual communication
    await new Promise(() => {
      // This promise never resolves, keeping the process alive
    });
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGTERM', () => {
  console.error('Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
