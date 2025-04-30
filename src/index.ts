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
const server = new McpServer({
  name: "dust-mcp-server",
  version: "1.0.0"
});

// Initialize all tools
fileUpload(server);
documentProcessor(server);
dustAgent(server);

// Create directories
await ensureDirectories();

// Determine transport mode from environment or command line args
const useHttpTransport = process.env.USE_HTTP_TRANSPORT === 'true' || 
                         process.argv.includes('--http');

// Authentication will be implemented in Milestone 2
const useAuthentication = false; // Disabled until Milestone 2 is implemented

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
