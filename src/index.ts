import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';
import express from 'express';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { getLogger, LogLevel } from './utils/logger.js';

// Import tools
import fileUpload from './tools/fileUpload.js';
import documentProcessor from './tools/documentProcessor.js';
import dustAgent from './tools/dustAgent.js';

// Authentication components will be implemented in Milestone 2
// import { apiKeyAuth } from './auth/apiKey.js';
// import { jwtAuth } from './auth/jwt.js';
// import { sessionManager } from './auth/session.js';

// Load environment variables
dotenv.config();

// Create a simple JSON logger for MCP protocol
interface McpLogger {
  log: (level: string, message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
  warn: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
}

const mcpLogger: McpLogger = {
  warn: (message: string, data?: any) => mcpLogger.log('warn', message, data),
  log: (level: string, message: string, data: any = {}) => {
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data,
    });
    process.stderr.write(`${logEntry}\n`);
  },
  info: (message: string, data?: any) => {
    mcpLogger.log('INFO', message, data);
  },
  error: (message: string, error?: any) => {
    const errorData =
      error instanceof Error
        ? { error: { message: error.message, stack: error.stack } }
        : error
          ? { error }
          : {};
    mcpLogger.log('ERROR', message, errorData);
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      mcpLogger.log('DEBUG', message, data);
    }
  },
};

// Log environment variables
mcpLogger.info('Environment variables', {
  NODE_ENV: process.env.NODE_ENV,
  DUST_API_KEY: process.env.DUST_API_KEY
    ? '***' + process.env.DUST_API_KEY.slice(-4)
    : 'not set',
  DUST_WORKSPACE_ID: process.env.DUST_WORKSPACE_ID || 'not set',
  DUST_AGENT_ID: process.env.DUST_AGENT_ID || 'not set',
  LOGS_DIR: process.env.LOGS_DIR || 'not set',
});

// Replace console methods to ensure JSON output
const originalConsole = { ...console };

console.log = (...args) => {
  mcpLogger.info(
    args[0],
    args.length > 1 ? { data: args.slice(1) } : undefined
  );
};

console.error = (...args) => {
  mcpLogger.error(
    args[0],
    args.length > 1 ? { data: args.slice(1) } : undefined
  );
};

console.debug = (...args) => {
  mcpLogger.debug(
    args[0],
    args.length > 1 ? { data: args.slice(1) } : undefined
  );
};

// Configure logger with environment-specific settings
const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
const isProduction = process.env.NODE_ENV === 'production';

// Initialize logger with configuration
const logger = getLogger({
  logToFile: !isProduction, // Only log to file in non-production
  logToConsole: !isProduction, // Only log to console in non-production
  logDir: logsDir,
  level: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
});

// Ensure logs directory exists
try {
  await fs.mkdir(logsDir, { recursive: true });
} catch (error) {
  // Logger will handle fallback directory
}

// Create directories if they don't exist
async function ensureDirectories() {
  try {
    // Get the project root directory (one level up from 'src')
    const baseDir = path.resolve(process.cwd());
    const logsDir = process.env.LOGS_DIR || path.join(baseDir, 'logs');

    // Log the base directory for debugging
    mcpLogger.debug('Base directory', { baseDir });

    // Ensure base directory exists and is writable
    try {
      await fs.access(baseDir, fs.constants.W_OK);
    } catch (error: any) {
      mcpLogger.error('Base directory is not writable', {
        path: baseDir,
        error: error.message,
        cwd: process.cwd(),
      });
      throw new Error(
        `Base directory ${baseDir} is not writable: ${error.message}`
      );
    }

    // Ensure logs directory exists and is writable
    try {
      await fs.mkdir(logsDir, { recursive: true, mode: 0o755 });
      await fs.access(logsDir, fs.constants.W_OK);
      mcpLogger.info('Logs directory verified', { path: logsDir });
    } catch (error: any) {
      mcpLogger.error('Failed to access logs directory', {
        path: logsDir,
        error: error.message,
      });
      throw new Error(
        `Logs directory ${logsDir} is not writable: ${error.message}`
      );
    }

    // Set LOGS_DIR in process.env early so other parts can use it
    process.env.LOGS_DIR = logsDir;

    // Define directories to create relative to baseDir
    const dirs = [
      path.join(baseDir, 'uploads'),
      path.join(baseDir, 'processed'),
    ];

    mcpLogger.info('Ensuring required directories exist');

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true, mode: 0o755 });
        mcpLogger.info('Directory ready', { path: dir });
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          mcpLogger.error('Failed to create directory', {
            path: dir,
            error: error.message,
            code: error.code,
          });
          throw error;
        }
        mcpLogger.debug('Directory already exists', { path: dir });
      }
    }

    mcpLogger.info('All directories ready');
    return true;
  } catch (error: any) {
    mcpLogger.error('Failed to create directories', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Initialize server
mcpLogger.info('Initializing MCP server...');
let server: McpServer;
try {
  server = new McpServer({
    name: 'dust-mcp-server',
    version: '1.0.0',
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
mcpLogger.info('Ensuring directories exist...');
try {
  await ensureDirectories();
  mcpLogger.info('Directories ready');
} catch (error: any) {
  mcpLogger.error('Failed to create directories', { error: error.message });
  process.exit(1);
}

// Determine transport mode from environment or command line args
const useHttpTransport =
  process.env.USE_HTTP_TRANSPORT === 'true' || process.argv.includes('--http');
mcpLogger.info(`Transport mode: ${useHttpTransport ? 'HTTP' : 'STDIO'}`);

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
    const healthData = { status: 'ok', uptime: process.uptime() };
    res.status(200).json(healthData);
    broadcast('health', healthData);
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
  mcpLogger.warn('Authentication not implemented yet (Milestone 2)');

  // Web routes (authentication will be added in Milestone 2)
  const webRouter = express.Router();
  mcpLogger.warn('Authentication not implemented yet (Milestone 2)');

  // Register routers
  app.use('/api', apiRouter);
  app.use('/web', webRouter);

  // Start HTTP server
  const httpServer = app.listen(port, () => {
    mcpLogger.info(`HTTP server listening on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    mcpLogger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      mcpLogger.info('HTTP server closed');
      process.exit(0);
    });
  });

  // Use HTTP transport for MCP
  mcpLogger.info('Starting MCP server with HTTP transport');

  // Create HTTP transport with required options
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      mcpLogger.info(`New MCP session initialized: ${sessionId}`);
    },
  });

  // Handle MCP protocol messages
  app.post('/mcp', (req, res) => {
    mcpLogger.info('Received MCP message', {
      method: req.method,
      path: req.path,
      headers: req.headers,
    });

    // Forward the request to the transport
    transport.handleRequest(req, res).catch((error) => {
      mcpLogger.error('Error handling MCP request', { error });
      res.status(500).json({ error: 'Internal server error' });
    });
  });

  // Handle SSE connections
  app.get('/mcp', (req, res) => {
    mcpLogger.info('New SSE connection', {
      method: req.method,
      path: req.path,
      headers: req.headers,
    });

    transport.handleRequest(req, res).catch((error) => {
      mcpLogger.error('Error handling SSE connection', { error });
      res.status(500).end();
    });
  });

  await server.connect(transport);
} else {
  // Use STDIO transport for Claude Desktop
  mcpLogger.info('Starting MCP server with STDIO transport');

  // Redirect all console output to mcpLogger in STDIO mode
  const originalConsole = { ...console };

  console.log = (...args) =>
    mcpLogger.info(args[0], args.length > 1 ? args[1] : undefined);
  console.error = (...args) =>
    mcpLogger.error(args[0], args.length > 1 ? args[1] : undefined);
  console.warn = (...args) =>
    mcpLogger.warn(args[0], args.length > 1 ? args[1] : undefined);
  console.debug = (...args) =>
    mcpLogger.debug(args[0], args.length > 1 ? args[1] : undefined);

  // Create and connect STDIO transport
  // The StdioServerTransport handles process.stdin/stdout by default
  const transport = new StdioServerTransport();

  // Handle process termination
  process.on('SIGTERM', () => {
    mcpLogger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    mcpLogger.info('SIGINT received, shutting down');
    process.exit(0);
  });

  await server.connect(transport);
}
