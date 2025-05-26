import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAgentTools } from './agents/agentTools.js';
import { getLogger } from './utils/logger.js';
import { toolRegistry } from './tools/toolRegistry.js';
import { mcpLogger } from './utils/mcpUtils.js';
import { app, httpServer } from './app.js';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

// Initialize logger
const logger = getLogger({ logFilePrefix: 'server' });

// Environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Map to store session information
const sessions: Record<string, { createdAt: number }> = {};

// Create and configure MCP server once
const createMcpServer = () => {
  const mcpServer = new McpServer({
    name: 'dust-mcp-server',
    version: '1.0.0',
    capabilities: ['tools'],
  });

  // Register MCP tools with the SDK
  registerAgentTools(mcpServer);

  // Initialize tool registry
  toolRegistry.initialize();

  // Log server initialization
  mcpLogger.info('MCP server initialized with tool registry');

  return mcpServer;
};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
  });
});

// MCP API endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const sessionId = randomUUID();
    sessions[sessionId] = { createdAt: Date.now() };

    mcpLogger.info('New MCP session initialized', {
      sessionId,
      transport: 'http',
      remoteAddress: req.socket.remoteAddress,
    });

    // Create and initialize a new MCP server
    createMcpServer();

    res.status(200).json({
      jsonrpc: '2.0',
      result: { sessionId },
    });
  } catch (error) {
    mcpLogger.error('Error handling MCP request', { error });
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
      },
    });
  }
});

// Start the server
const startServer = async () => {
  try {
    // Start HTTP server
    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
        resolve();
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = () => {
  logger.info('Shutting down server...');

  // Close HTTP server
  httpServer.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err });
      process.exit(1);
    }

    logger.info('Server stopped');
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Force shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start the server if this file is being run directly
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  // Handle shutdown signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Start the server
  startServer().catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });
}

export { startServer, gracefulShutdown };
