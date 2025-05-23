import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { promises as fs } from 'fs';
import express from 'express';
import logger, { LogLevel } from './utils/logger.js';

// Import tools
import fileUpload from "./tools/fileUpload.js";
import documentProcessor from "./tools/documentProcessor.js";
import dustAgent from "./tools/dustAgent.js";

// Authentication components will be implemented in Milestone 2
// import { apiKeyAuth } from './auth/apiKey.js';
// import { jwtAuth } from './auth/jwt.js';
// import { sessionManager } from './auth/session.js';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DUST_API_KEY:', process.env.DUST_API_KEY ? '***' + process.env.DUST_API_KEY.slice(-4) : 'not set');
console.log('DUST_WORKSPACE_ID:', process.env.DUST_WORKSPACE_ID || 'not set');
console.log('DUST_AGENT_ID:', process.env.DUST_AGENT_ID || 'not set');
console.log('LOGS_DIR:', process.env.LOGS_DIR || 'not set');
console.log('===========================');

// Configure logger based on environment
const logLevel = process.env.LOG_LEVEL || 'INFO';
logger.setLevel(LogLevel[logLevel as keyof typeof LogLevel] || LogLevel.INFO);

// Create directories if they don't exist
async function ensureDirectories() {
  const dirs = ['uploads', 'processed', 'logs'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
      logger.info(`Directory created: ${dir}`);
    } catch (error) {
      logger.error(`Error creating directory ${dir}:`, error);
    }
  }
}

// Initialize server
console.log('Initializing MCP server...');
const server = new McpServer({
  name: "dust-mcp-server",
  version: "1.0.0"
});
console.log('MCP server instance created');

// Initialize all tools
console.log('Initializing tools...');
try {
  fileUpload(server);
  documentProcessor(server);
  dustAgent(server);
  console.log('All tools initialized');
} catch (error) {
  console.error('Error initializing tools:', error);
  process.exit(1);
}

// Create directories
await ensureDirectories();

// Determine transport mode from environment or command line args
const useHttpTransport = process.env.USE_HTTP_TRANSPORT === 'true' || 
                         process.argv.includes('--http');

// Authentication will be implemented in Milestone 2
const useAuthentication = false; // Disabled until Milestone 2 is implemented

import { addClient, removeClient, broadcast } from './utils/sseBroadcaster.js';

if (useHttpTransport) {
  // Setup Express app for HTTP transport
  const app = express();
  const port = process.env.PORT || 3000;
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
    broadcast('health', { status: 'ok', uptime: process.uptime() }); // Example broadcast
  });

  // SSE endpoint
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    addClient(res);
    res.write('event: connected\ndata: {}\n\n');
    req.on('close', () => removeClient(res));
  });
  
  // API routes (authentication will be added in Milestone 2)
  const apiRouter = express.Router();
  logger.warn('Authentication not implemented yet (Milestone 2)');
  
  // Web routes (authentication will be added in Milestone 2)
  const webRouter = express.Router();
  logger.warn('Authentication not implemented yet (Milestone 2)');
  
  // Register routers
  app.use('/api', apiRouter);
  app.use('/web', webRouter);
  
  // Start HTTP server
  const httpServer = app.listen(port, () => {
    logger.info(`HTTP server listening on port ${port}`);
  });
  
  // Use STDIO transport for now (HTTP/SSE transport will be implemented in future versions)
  logger.info('Starting MCP server with STDIO transport (HTTP/SSE transport will be implemented in future versions)');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Session management will be implemented in Milestone 2
  // setInterval(() => {
  //   logger.info(`Active sessions: ${sessionManager.getSessionCount()}`);
  // }, 60000); // Log every minute
} else {
  // Use STDIO transport for Claude Desktop (no authentication needed)
  logger.info('Starting MCP server with STDIO transport (authentication not required)');
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
