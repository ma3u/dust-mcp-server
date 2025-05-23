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

// Create a simple JSON logger for MCP protocol
const mcpLogger = {
  log: (level: string, message: string, data: any = {}) => {
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    });
    process.stderr.write(`${logEntry}\n`);
  },
  info: (message: string, data?: any) => {
    mcpLogger.log('INFO', message, data);
  },
  error: (message: string, error?: any) => {
    const errorData = error instanceof Error
      ? { error: { message: error.message, stack: error.stack } }
      : error ? { error } : {};
    mcpLogger.log('ERROR', message, errorData);
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      mcpLogger.log('DEBUG', message, data);
    }
  }
};

// Replace console methods to ensure JSON output
const originalConsole = { ...console };

console.log = (...args) => {
  mcpLogger.info(args[0], args.length > 1 ? { data: args.slice(1) } : undefined);
};

console.error = (...args) => {
  mcpLogger.error(args[0], args.length > 1 ? { data: args.slice(1) } : undefined);
};

console.debug = (...args) => {
  mcpLogger.debug(args[0], args.length > 1 ? { data: args.slice(1) } : undefined);
};

// Disable default logger file output
logger['config'] = {
  ...logger['config'],
  logToFile: false,
  logToConsole: false
};

// Create directories if they don't exist
async function ensureDirectories() {
  try {
    // Use __dirname to get the directory of the current module
    const baseDir = __dirname;
    const logsDir = process.env.LOGS_DIR || path.join(baseDir, '..', 'logs');
    
    // Ensure logs directory exists and is writable
    try {
      await fs.mkdir(logsDir, { recursive: true });
      await fs.access(logsDir, fs.constants.W_OK);
      mcpLogger.info('Logs directory verified', { path: logsDir });
    } catch (error: any) {
      mcpLogger.error('Failed to access logs directory', error);
      throw new Error(`Logs directory ${logsDir} is not writable: ${error.message}`);
    }
    
    // Set LOGS_DIR in process.env early so other parts can use it
    process.env.LOGS_DIR = logsDir;
    
    const dirs = [
      path.join(baseDir, '..', 'uploads'),
      path.join(baseDir, '..', 'processed')
    ];

    mcpLogger.info('Ensuring required directories exist');
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        mcpLogger.info('Directory ready', { path: dir });
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          mcpLogger.error('Failed to create directory', { 
            path: dir,
            error: error.message
          });
          throw error;
        }
        mcpLogger.debug('Directory already exists', { path: dir });
      }
    }
    
    mcpLogger.info('All directories ready');
    return true;
    
  } catch (error: any) {
    mcpLogger.error('Failed to create directories', error);
    throw error;
  }
}

// Initialize server
mcpLogger.info('Initializing MCP server...');
let server: McpServer;
try {
  server = new McpServer({
    name: "dust-mcp-server",
    version: "1.0.0"
  });
  mcpLogger.info('MCP server instance created');
} catch (error) {
  mcpLogger.error('Failed to create MCP server instance:', error);
  process.exit(1);
}

// Initialize all tools
mcpLogger.info('Initializing tools...');
try {
  fileUpload(server);
  mcpLogger.info('- fileUpload tool initialized');
  documentProcessor(server);
  mcpLogger.info('- documentProcessor tool initialized');
  dustAgent(server);
  mcpLogger.info('- dustAgent tool initialized');
  mcpLogger.info('All tools initialized successfully');
} catch (error) {
  mcpLogger.error('Error initializing tools:', error);
  process.exit(1);
}

// Create directories
console.log('Ensuring directories exist...');
try {
  await ensureDirectories();
  console.log('Directories ready');
} catch (error) {
  console.error('Failed to create directories:', error);
  process.exit(1);
}

// Determine transport mode from environment or command line args
const useHttpTransport = process.env.USE_HTTP_TRANSPORT === 'true' || 
                       process.argv.includes('--http');
console.log(`Transport mode: ${useHttpTransport ? 'HTTP' : 'STDIO'}`);

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
