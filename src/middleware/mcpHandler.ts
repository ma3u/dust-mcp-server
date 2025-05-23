import { IncomingMessage, ServerResponse } from 'http';
import { getLogger } from '../utils/logger.js';
import { 
  McpRequest, 
  McpResponse, 
  validateMcpRequest, 
  createErrorResponse,
  createSession,
  updateSessionActivity,
  endSession,
  mcpLogger
} from '../utils/mcpUtils.js';
import { toolRegistry } from '../tools/toolRegistry.js';

const logger = getLogger({ logFilePrefix: 'mcp-handler' });

/**
 * Handle MCP requests over HTTP
 */
export async function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return sendResponse(res, 405, {
      jsonrpc: '2.0',
      error: { code: -32601, message: 'Method not allowed' },
      id: null
    });
  }

  try {
    // Parse request body
    const body = await parseRequestBody(req);
    const response = await handleMcpRequest(body);
    sendResponse(res, 200, response);
  } catch (error) {
    logger.error('Request handling failed', { error });
    sendResponse(res, 500, {
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'Internal error',
        data: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      id: null
    });
  }
}

/**
 * Handle MCP requests over STDIO
 */
export async function handleStdioRequest(data: string): Promise<string> {
  try {
    const request = JSON.parse(data) as McpRequest;
    const response = await handleMcpRequest(request);
    return JSON.stringify(response);
  } catch (error) {
    mcpLogger.error('STDIO request handling failed', { error });
    return JSON.stringify({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'Internal error',
        data: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      id: null
    });
  }
}

/**
 * Parse request body from HTTP request
 */
async function parseRequestBody(req: IncomingMessage): Promise<McpRequest> {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    
    req.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Handle MCP request
 */
async function handleMcpRequest(request: unknown): Promise<McpResponse> {
  // Validate request structure
  const validation = validateMcpRequest(request);
  if (!validation.valid) {
    return createErrorResponse(null, -32600, validation.error!);
  }
  
  const mcpRequest = request as McpRequest;
  const requestId = mcpRequest.id || null;
  
  try {
    // Handle JSON-RPC methods
    switch (mcpRequest.method) {
      case 'initialize':
        return handleInitialize(mcpRequest);
        
      case 'tools/execute':
        return handleToolExecution(mcpRequest);
        
      case 'session/create':
        return handleCreateSession(mcpRequest);
        
      case 'session/end':
        return handleEndSession(mcpRequest);
        
      default:
        return createErrorResponse(
          requestId,
          -32601,
          `Method '${mcpRequest.method}' not found`
        );
    }
  } catch (error) {
    mcpLogger.error('Request processing failed', { 
      error: error instanceof Error ? error.message : String(error),
      requestId 
    });
    
    return createErrorResponse(
      requestId,
      -32603,
      'Internal error',
      process.env.NODE_ENV === 'development' ? 
        { error: error instanceof Error ? error.message : String(error) } : 
        undefined
    );
  }
}

/**
 * Handle initialize method
 */
function handleInitialize(request: McpRequest): McpResponse {
  return {
    jsonrpc: '2.0',
    id: request.id || null,
    result: {
      capabilities: {
        tools: true,
        sessions: true,
        streaming: true
      },
      serverInfo: {
        name: 'dust-mcp-server',
        version: process.env.npm_package_version || '0.1.0'
      }
    }
  };
}

/**
 * Handle tool execution
 */
async function handleToolExecution(request: McpRequest): Promise<McpResponse> {
  if (!request.params) {
    return createErrorResponse(
      request.id || null,
      -32602,
      'Missing parameters for tools/execute'
    );
  }
  
  const { tool, params, sessionId } = request.params as {
    tool: string;
    params: unknown;
    sessionId?: string;
  };
  
  if (!tool) {
    return createErrorResponse(
      request.id || null,
      -32602,
      'Missing required parameter: tool'
    );
  }
  
  // Update session activity if session ID is provided
  if (sessionId) {
    updateSessionActivity(sessionId);
  }
  
  // Execute the tool
  return toolRegistry.execute(tool, params, sessionId);
}

/**
 * Handle session creation
 */
function handleCreateSession(request: McpRequest): McpResponse {
  const metadata = (request.params as { metadata?: Record<string, unknown> })?.metadata;
  const sessionId = createSession(metadata);
  
  return {
    jsonrpc: '2.0',
    id: request.id || null,
    result: { sessionId }
  };
}

/**
 * Handle session termination
 */
function handleEndSession(request: McpRequest): McpResponse {
  const sessionId = (request.params as { sessionId: string })?.sessionId;
  
  if (!sessionId) {
    return createErrorResponse(
      request.id || null,
      -32602,
      'Missing required parameter: sessionId'
    );
  }
  
  const success = endSession(sessionId);
  
  return {
    jsonrpc: '2.0',
    id: request.id || null,
    result: { success }
  };
}

/**
 * Send HTTP response
 */
function sendResponse(
  res: ServerResponse,
  statusCode: number,
  data: unknown
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

