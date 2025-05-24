import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { debugIsInitializeRequest, logMcpRequest } from './debug-mcp-utils.js';
import { registerAgentTools } from './agents/agentTools.js';
import { getLogger } from './utils/logger.js';
import { handleHttpRequest, handleStdioRequest } from './middleware/mcpHandler.js';
import { toolRegistry } from './tools/toolRegistry.js';
import { mcpLogger } from './utils/mcpUtils.js';
import { app, httpServer } from './app.js';
import { Request, Response, NextFunction } from 'express';

// Initialize logger
const logger = getLogger({ logFilePrefix: 'server' });

// Environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

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

// Handle MCP protocol over HTTP/SSE
// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// MCP API endpoint for HTTP/SSE
app.get('/mcp', handleSessionRequest);

// MCP API endpoint for session termination
app.delete('/mcp', handleSessionRequest);

// JSON-RPC over HTTP endpoint
app.post('/rpc', (req, res) => {
  handleHttpRequest(req as unknown as IncomingMessage, res);
});

// STDIO transport for MCP
if (process.stdin.isTTY) {
  process.stdin.setEncoding('utf-8');
  let buffer = '';
  
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    
    try {
      // Try to parse the buffer as JSON
      const request = JSON.parse(buffer);
      buffer = ''; // Clear buffer on successful parse
      
      // Handle the request
      const response = await handleStdioRequest(JSON.stringify(request));
      process.stdout.write(response + '\n');
    } catch (error) {
      // If JSON is incomplete, wait for more data
      if (error instanceof SyntaxError) {
        return;
      }
      
      // For other errors, send error response
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: process.env.NODE_ENV === 'development' ? String(error) : undefined
        },
        id: null
      };
      
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });
  
  process.on('SIGINT', () => process.exit(0));
}

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
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

// Export the server for testing
const server = {
  start: startServer,
  stop: gracefulShutdown,
  app,
  httpServer
};

if (isMainModule) {
  startServer().catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default server;
