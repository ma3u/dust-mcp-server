/**
 * Debug utilities for MCP protocol implementation
 */
import logger from './utils/logger.js';

/**
 * Enhanced version of isInitializeRequest that provides detailed logging
 * for debugging purposes.
 */
export function debugIsInitializeRequest(body: any): boolean {
  // Log the complete incoming request body for debugging
  logger.debug('Received JSON-RPC request body:', { body: JSON.stringify(body) });
  
  // Basic shape check
  const hasJsonRpc = typeof body?.jsonrpc === 'string' && body.jsonrpc === '2.0';
  const hasMethod = typeof body?.method === 'string';
  const isInitMethod = body?.method === 'initialize';
  const hasId = body?.id !== undefined;
  const hasParams = typeof body?.params === 'object' && body?.params !== null;
  const hasClient = typeof body?.params?.client === 'object' && body?.params?.client !== null;
  
  // Log detailed validation results
  logger.debug('Request validation:', {
    hasJsonRpc,
    hasMethod,
    isInitMethod,
    hasId,
    hasParams,
    hasClient,
    method: body?.method,
  });
  
  // Check if it's an initialize request
  const isInit = hasJsonRpc && isInitMethod && hasId && hasParams && hasClient;
  
  logger.debug(`isInitializeRequest result: ${isInit}`);
  return isInit;
}

/**
 * Log the MCP request before handling
 */
export function logMcpRequest(req: any) {
  logger.info('MCP request received', {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      'mcp-session-id': req.headers['mcp-session-id'] || '(none)',
    },
    body: req.body ? JSON.stringify(req.body).substring(0, 500) : '(no body)',
  });
}
