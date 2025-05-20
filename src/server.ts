import express from 'express';
import { createServer } from 'http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { debugIsInitializeRequest, logMcpRequest } from './debug-mcp-utils.js';
import { registerAgentTools } from './agents/agentTools.js';
import agentRoutes from './api/routes/agentRoutes.js';
import logger from './utils/logger.js';

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

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Create and configure MCP server once
const createMcpServer = () => {
  const mcpServer = new McpServer({
    name: 'dust-mcp-server',
    version: '1.0.0',
    capabilities: ['tools'],
  });

  // Register MCP tools
  registerAgentTools(mcpServer);
  return mcpServer;
};

// Handle MCP protocol over HTTP/SSE
// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  try {
    // Log the incoming request for debugging
    logMcpRequest(req);
    
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      logger.info(`Using existing session: ${sessionId}`);
      transport = transports[sessionId];
    } else if (!sessionId) {
      // Use our enhanced debugging version of isInitializeRequest
      const isInit = debugIsInitializeRequest(req.body);
      
      if (isInit) {
        // New initialization request
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID
            transports[sessionId] = transport;
            logger.info(`New MCP session initialized: ${sessionId}`);
          }
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            logger.info(`MCP session closed: ${transport.sessionId}`);
          }
        };
        
        // Create and connect to a new MCP server
        const server = createMcpServer();
        await server.connect(transport);
      } else {
        // Invalid request - not an initialization request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: Not a valid initialization request',
          },
          id: null,
        });
        return;
      }
    } else {
      // Invalid request - has session ID but not found
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: Invalid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('Failed to handle MCP request', { error });
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : String(error)
      },
      id: null
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

// Start the server if this file is being run directly
// Using ES modules pattern instead of require.main === module
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  startServer().catch((error) => {
    logger.error('Unhandled error during server startup', { error });
    process.exit(1);
  });
}

export { app, startServer, gracefulShutdown };
