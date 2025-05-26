import { z } from 'zod';
import { getLogger } from '../utils/logger.js';
import { createErrorResponse, McpResponse } from '../utils/mcpUtils.js';

const logger = getLogger({ logFilePrefix: 'tool-registry' });

type ToolHandler<T> = (params: T, sessionId?: string) => Promise<unknown>;

interface ToolDefinition<T> {
  name: string;
  description: string;
  parameters: z.ZodSchema<T>;
  handler: ToolHandler<T>;
  requiresAuth?: boolean;
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition<unknown>> = new Map();
  private initialized = false;

  /**
   * Register a new tool
   */
  register<T>(definition: ToolDefinition<T>): void {
    if (this.tools.has(definition.name)) {
      throw new Error(
        `Tool with name '${definition.name}' is already registered`
      );
    }

    this.tools.set(definition.name, definition as ToolDefinition<unknown>);
    logger.info(`Registered tool: ${definition.name}`);
  }

  /**
   * Execute a tool
   */
  async execute(
    toolName: string,
    params: unknown,
    sessionId?: string
  ): Promise<McpResponse> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return createErrorResponse(null, 404, `Tool '${toolName}' not found`);
    }

    // Validate input parameters
    const validation = tool.parameters.safeParse(params);
    if (!validation.success) {
      return createErrorResponse(null, 400, 'Invalid parameters', {
        errors: validation.error.errors,
      });
    }

    try {
      // Execute the tool handler
      const result = await tool.handler(validation.data, sessionId);

      // Log successful execution
      logger.debug('Tool executed successfully', {
        tool: toolName,
        sessionId,
      });

      return {
        jsonrpc: '2.0',
        id: null,
        result,
      };
    } catch (error) {
      logger.error('Tool execution failed', {
        tool: toolName,
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });

      return createErrorResponse(null, 500, 'Tool execution failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get OpenAPI schema for all registered tools
   */
  getOpenAPISchema() {
    const schemas: Record<string, unknown> = {};

    for (const [name, tool] of this.tools.entries()) {
      schemas[name] = {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters._def,
        requiresAuth: tool.requiresAuth ?? false,
      };
    }

    return schemas;
  }

  /**
   * Initialize built-in tools
   */
  initialize() {
    if (this.initialized) return;

    // Register built-in tools here
    this.register({
      name: 'list_tools',
      description: 'List all available tools',
      parameters: z.object({}),
      handler: async () => {
        return Array.from(this.tools.values()).map((tool) => ({
          name: tool.name,
          description: tool.description,
          requiresAuth: tool.requiresAuth,
        }));
      },
    });

    this.initialized = true;
    logger.info('Tool registry initialized');
  }
}

// Export a singleton instance
export const toolRegistry = new ToolRegistry();

// Helper function to create tool definitions
export function defineTool<T>(
  name: string,
  description: string,
  parameters: z.ZodSchema<T>,
  handler: ToolHandler<T>,
  options: { requiresAuth?: boolean } = {}
): ToolDefinition<T> {
  return {
    name,
    description,
    parameters,
    handler,
    requiresAuth: options.requiresAuth,
  };
}
