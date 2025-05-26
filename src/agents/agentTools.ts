import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk';
import { agentService } from '../services/agentService.js';
import logger from '../utils/logger.js';

/**
 * Tool to list all available agents
 */
export const listAgentsTool: Tool = {
  name: 'list_agents',
  description: 'List all available DUST agents',
  parameters: z.object({}),
  handler: async () => {
    try {
      const agents = await agentService.getAgents();
      return { agents };
    } catch (error) {
      logger.error('Failed to list agents', { error });
      throw new Error('Failed to list agents');
    }
  },
};

/**
 * Tool to get details about a specific agent
 */
export const getAgentTool: Tool = {
  name: 'get_agent',
  description: 'Get details about a specific DUST agent',
  parameters: z.object({
    agentId: z.string().describe('ID of the agent to retrieve'),
  }),
  handler: async ({ agentId }) => {
    try {
      const agent = await agentService.getAgent(agentId);
      return { agent };
    } catch (error) {
      logger.error(`Failed to get agent ${agentId}`, { error });
      throw new Error(`Failed to get agent: ${error.message}`);
    }
  },
};

/**
 * Tool to create a new session with an agent
 */
export const createSessionTool: Tool = {
  name: 'create_session',
  description: 'Create a new session with a DUST agent',
  parameters: z.object({
    agentId: z.string().describe('ID of the agent to create a session with'),
    context: z
      .record(z.unknown())
      .optional()
      .describe('Initial session context'),
  }),
  handler: async ({ agentId, context = {} }) => {
    try {
      const session = await agentService.createSession(agentId, context);
      return { session };
    } catch (error) {
      logger.error(`Failed to create session for agent ${agentId}`, { error });
      throw new Error(`Failed to create session: ${error.message}`);
    }
  },
};

/**
 * Tool to send a message to an agent
 */
export const sendMessageTool: Tool = {
  name: 'send_message',
  description: 'Send a message to a DUST agent in an existing session',
  parameters: z.object({
    sessionId: z.string().describe('ID of the session'),
    message: z.string().describe('Message to send to the agent'),
    files: z
      .array(
        z.object({
          name: z.string(),
          content: z.string().describe('Base64 encoded file content'),
        })
      )
      .optional()
      .describe('Optional files to include with the message'),
  }),
  handler: async ({ sessionId, message, files = [] }) => {
    try {
      const processedFiles = files.map((file) => ({
        name: file.name,
        content: Buffer.from(file.content, 'base64'),
      }));

      const result = await agentService.sendMessage(
        sessionId,
        message,
        processedFiles
      );
      return result;
    } catch (error) {
      logger.error(`Failed to send message in session ${sessionId}`, { error });
      throw new Error(`Failed to send message: ${error.message}`);
    }
  },
};

/**
 * Tool to end a session
 */
export const endSessionTool: Tool = {
  name: 'end_session',
  description: 'End an existing session with a DUST agent',
  parameters: z.object({
    sessionId: z.string().describe('ID of the session to end'),
  }),
  handler: async ({ sessionId }) => {
    try {
      await agentService.endSession(sessionId);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to end session ${sessionId}`, { error });
      throw new Error(`Failed to end session: ${error.message}`);
    }
  },
};

// Track registered tools to prevent duplicates
const registeredTools = new Set<string>();

/**
 * Register all agent tools with the MCP server
 */
export function registerAgentTools(server: any) {
  const tools = [
    listAgentsTool,
    getAgentTool,
    createSessionTool,
    sendMessageTool,
    endSessionTool,
  ];

  tools.forEach((tool) => {
    if (!registeredTools.has(tool.name)) {
      server.tool(tool);
      registeredTools.add(tool.name);
      logger.debug(`Registered tool: ${tool.name}`);
    } else {
      logger.debug(`Tool already registered, skipping: ${tool.name}`);
    }
  });

  logger.info(`Registered ${registeredTools.size} agent tools`);
}

export const agentTools = {
  listAgentsTool,
  getAgentTool,
  createSessionTool,
  sendMessageTool,
  endSessionTool,
  registerAgentTools,
};
