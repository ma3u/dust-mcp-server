import express from 'express';
import { createServer } from 'http';
import { Server } from '@modelcontextprotocol/sdk';
import { registerAgentTools } from './agents/agentTools';
import agentRoutes from './api/routes/agentRoutes';
import { logger } from './utils/logger';

// Environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', agentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create MCP server
const mcpServer = new Server({
  name: 'dust-mcp-server',
  version: '1.0.0',
  capabilities: ['tools'],
});

// Register MCP tools
registerAgentTools(mcpServer);

// Handle MCP protocol over HTTP/SSE
app.post('/mcp', async (req, res) => {
  try {
    const result = await mcpServer.handleRequest(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Failed to handle MCP request', { error });
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message,
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

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async () => {
  logger.info('Shutting down server...');
  
  try {
    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    // Close any other resources here
    
    logger.info('Server stopped');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Unhandled error during server startup', { error });
    process.exit(1);
  });
}

export { app, startServer, gracefulShutdown };
