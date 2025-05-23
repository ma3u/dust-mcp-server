import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAgentTools } from './agents/agentTools.js';
import logger from './utils/logger.js';

async function startStdioServer() {
  try {
    logger.info('Starting MCP server with STDIO transport for Claude Desktop');
    
    // Create and configure MCP server
    const mcpServer = new McpServer({
      name: 'dust-mcp-server',
      version: '1.0.0',
      capabilities: ['tools'],
    });

    // Register MCP tools
    registerAgentTools(mcpServer);

    // Create and connect STDIO transport
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);

    logger.info('MCP server is ready for Claude Desktop via STDIO');
    
    // Handle process termination
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM. Shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT. Shutting down gracefully...');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start STDIO server:', error);
    process.exit(1);
  }
}

// Start the server
startStdioServer().catch(error => {
  logger.error('Unhandled error in STDIO server:', error);
  process.exit(1);
});
