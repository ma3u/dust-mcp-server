import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { getLogger, LogLevel } from './logger.js';

// MCP Protocol Types
export type McpResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type McpRequest = {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
};

// Session Management
const activeSessions = new Map<
  string,
  {
    createdAt: Date;
    lastActivity: Date;
    metadata?: Record<string, unknown>;
  }
>();

// Session cleanup interval (15 minutes)
const SESSION_CLEANUP_INTERVAL = 15 * 60 * 1000;

// Initialize session cleanup
setInterval(cleanupOrphanedSessions, SESSION_CLEANUP_INTERVAL);

// Logger instance
const mcpLogger = getLogger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  logToConsole: process.env.NODE_ENV !== 'production',
  logFilePrefix: 'mcp-server',
});

/**
 * Create a new session
 */
export function createSession(metadata?: Record<string, unknown>): string {
  const sessionId = uuidv7();
  const now = new Date();

  activeSessions.set(sessionId, {
    createdAt: now,
    lastActivity: now,
    metadata,
  });

  mcpLogger.info('Session created', { sessionId });
  logToDecisionLog({
    type: 'session_created',
    sessionId,
    timestamp: now.toISOString(),
    metadata,
  });

  return sessionId;
}

/**
 * Update session activity
 */
export function updateSessionActivity(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.lastActivity = new Date();
  return true;
}

/**
 * End a session
 */
export function endSession(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  activeSessions.delete(sessionId);

  mcpLogger.info('Session ended', { sessionId });
  logToDecisionLog({
    type: 'session_ended',
    sessionId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - session.createdAt.getTime(),
  });

  return true;
}

/**
 * Clean up orphaned sessions (older than 1 hour)
 */
function cleanupOrphanedSessions(): void {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  let cleaned = 0;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      activeSessions.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    mcpLogger.info(`Cleaned up ${cleaned} orphaned sessions`);
  }
}

/**
 * Create an MCP response
 */
export function createResponse(
  id: string | number | null,
  result?: unknown,
  error?: { code: number; message: string; data?: unknown }
): McpResponse {
  const response: McpResponse = { jsonrpc: '2.0', id };

  if (error) {
    response.error = error;
  } else {
    response.result = result ?? null;
  }

  return response;
}

/**
 * Create an MCP error response
 */
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): McpResponse {
  return createResponse(id, undefined, { code, message, data });
}

/**
 * Validate MCP request
 */
export function validateMcpRequest(request: unknown): {
  valid: boolean;
  error?: string;
} {
  const requestSchema = z.object({
    jsonrpc: z.literal('2.0'),
    method: z.string(),
    params: z.record(z.unknown()).optional(),
    id: z.union([z.string(), z.number(), z.null()]).optional(),
  });

  try {
    requestSchema.parse(request);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: `Invalid request: ${error.errors.map((e) => e.message).join(', ')}`,
      };
    }
    return { valid: false, error: 'Unknown validation error' };
  }
}

/**
 * Log to decision log
 */
function logToDecisionLog(entry: Record<string, unknown>): void {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // In a real implementation, this would write to memory-bank/decisionLog.md
    mcpLogger.debug('Decision log entry', logEntry);
  } catch (error) {
    mcpLogger.error('Failed to write to decision log', { error });
  }
}

/**
 * Log to system patterns
 */
export function logSystemPattern(
  pattern: string,
  data: Record<string, unknown>
): void {
  try {
    // In a real implementation, this would write to memory-bank/systemPatterns.md
    mcpLogger.debug('System pattern', { pattern, ...data });
  } catch (error) {
    mcpLogger.error('Failed to log system pattern', { error });
  }
}

export { mcpLogger };
