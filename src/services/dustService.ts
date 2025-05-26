/**
 * Dust Service Module
 *
 * This module implements direct API integration with Dust.tt using axios instead of an SDK.
 *
 * Decision rationale:
 * - Greater flexibility and control over request/response handling
 * - Minimizes external dependencies
 * - Simpler implementation for our current requirements
 * - Easier to maintain and update as the API evolves
 * - Future-proof architecture that can be replaced with SDK if needed
 *
 * The service implements caching for agent configurations to improve performance
 * and reduce redundant API calls.
 *
 * Last updated: 2025-05-04
 * - Fixed API endpoint URLs to match official documentation
 * - Corrected conversation ID extraction logic
 * - Improved error handling and logging
 * - Added support for the latest models and capabilities
 * - Enhanced response parsing for better reliability
 *
 * API Documentation References:
 * - https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-agent-configurations-sid
 * - https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-agent-configurations-search
 * - https://docs.dust.tt/reference/post_api-v1-w-wid-assistant-conversations
 * - https://docs.dust.tt/reference/post_api-v1-w-wid-assistant-conversations-cid-messages
 * - https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-conversations-cid
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Setup logger using environment variable or default to project logs directory
const LOG_DIR = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(
  LOG_DIR,
  `app-${new Date().toISOString().split('T')[0]}.log`
);

// Ensure log directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    console.log(`Created logs directory: ${LOG_DIR}`);
  }
} catch (error) {
  console.error(`Failed to create logs directory at ${LOG_DIR}:`, error);
  // Fallback to a safe location
  const fallbackDir = path.join(process.cwd(), 'logs');
  if (LOG_DIR !== fallbackDir) {
    console.log(`Falling back to: ${fallbackDir}`);
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
}

// Logger function to replace console.log
function logger(level: string, message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;

  // Write to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');

  // Also output to stderr for debugging (doesn't interfere with STDIO transport)
  if (level === 'ERROR') {
    process.stderr.write(logMessage + '\n');
  }
}

// Load environment variables
dotenv.config();

// Dust API configuration
const DUST_API_URL = process.env.DUST_API_URL || 'https://dust.tt/api/v1';
const DUST_API_KEY = process.env.DUST_API_KEY;

// Simple cache for agent configurations (TTL: 5 mins)
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  model?: string;
  provider?: string;
  temperature?: number;
  instructions?: string;
  status?: string;
  pictureUrl?: string;
  supportedOutputFormats?: string[];
  tags?: string[];
  visualizationEnabled?: boolean;
  timestamp: number;
}

const agentConfigCache: Map<string, AgentConfig> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Helper function to get agent configuration (with caching)
 *
 * @param agentId ID of the agent to retrieve
 * @returns Promise resolving to the agent configuration or null if not found
 */
export async function getAgentConfig(
  agentId: string
): Promise<AgentConfig | null> {
  // Check cache first
  const cachedConfig = agentConfigCache.get(agentId);
  if (cachedConfig && Date.now() - cachedConfig.timestamp < CACHE_TTL) {
    logger('INFO', `Using cached agent configuration for ${agentId}`);
    return cachedConfig;
  }

  // If not in cache or expired, fetch from API
  try {
    if (!DUST_API_KEY) {
      throw new Error('DUST_API_KEY is not set in environment variables');
    }

    // Get workspace ID from environment
    const workspaceId = process.env.DUST_WORKSPACE_ID;
    if (!workspaceId) {
      throw new Error('DUST_WORKSPACE_ID is not set in environment variables');
    }

    // Use the correct agent configuration endpoint based on official docs
    // https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-agent-configurations-sid
    const apiUrl = `${DUST_API_URL}/w/${workspaceId}/assistant/agent_configurations/${agentId}`;

    logger('INFO', `Fetching agent configuration from ${apiUrl}`);

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200 && response.data) {
      // Process the agent data from the response
      const agentData = response.data.agentConfiguration || response.data;

      const config: AgentConfig = {
        id: agentData.sId || agentData.id || agentId,
        name: agentData.name || 'Unknown Agent',
        description: agentData.description || '',
        capabilities:
          agentData.actions?.map((action: any) => action.name) || [],
        model: agentData.model?.modelId || '',
        provider: agentData.model?.providerId || '',
        temperature: agentData.model?.temperature,
        instructions: agentData.instructions,
        status: agentData.status,
        pictureUrl: agentData.pictureUrl,
        supportedOutputFormats: agentData.supportedOutputFormats || [],
        tags: agentData.tags || [],
        visualizationEnabled: agentData.visualizationEnabled,
        timestamp: Date.now(),
      };

      // Update cache
      agentConfigCache.set(agentId, config);
      logger('INFO', `Updated cache for agent ${agentId}`);
      return config;
    }

    logger(
      'WARN',
      `Failed to get valid agent configuration for ${agentId}`,
      response.data
    );
    return null;
  } catch (error: any) {
    logger('ERROR', `Error fetching agent config for ${agentId}:`, error);

    // For development, return a mock config if API call fails
    if (process.env.NODE_ENV === 'development') {
      logger(
        'INFO',
        `Using mock configuration for ${agentId} in development mode`
      );
      const mockConfig: AgentConfig = {
        id: agentId,
        name: `Agent ${agentId}`,
        description: 'Mock agent configuration for development',
        capabilities: [
          'web_search',
          'browse',
          'image_generation',
          'extract_data',
        ],
        model: 'gpt-4o',
        provider: 'openai',
        temperature: 0.7,
        instructions: 'You are a helpful assistant.',
        status: 'active',
        pictureUrl: 'https://dust.tt/static/spiritavatar/Spirit_Indigo_3.jpg',
        supportedOutputFormats: ['text', 'json'],
        tags: [],
        visualizationEnabled: false,
        timestamp: Date.now(),
      };

      agentConfigCache.set(agentId, mockConfig);
      return mockConfig;
    }

    return null;
  }
}

/**
 * Function to get the default agent ID from environment
 *
 * @returns The first agent ID from the DUST_AGENT_IDs environment variable
 */
function getDefaultAgentId(): string {
  const agentIdsString = process.env.DUST_AGENT_IDs;
  if (!agentIdsString) {
    throw new Error('DUST_AGENT_IDs is not set in environment variables');
  }

  // Parse the comma-separated list and get the first agent ID
  const agentIds = agentIdsString.split(',').map((id) => id.trim());
  if (agentIds.length === 0) {
    throw new Error(
      'No agent IDs found in DUST_AGENT_IDs environment variable'
    );
  }

  return agentIds[0];
}

/**
 * Query a Dust agent with a message and optional context
 *
 * This implementation follows the Dust API documentation:
 * - https://docs.dust.tt/reference/post_api-v1-w-wid-assistant-conversations
 * - https://docs.dust.tt/reference/post_api-v1-w-wid-assistant-conversations-cid-messages
 * - https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-conversations-cid
 *
 * @param agentId ID of the agent to query (assistant ID)
 * @param query User message content
 * @param context Additional context for the conversation
 * @param conversationId Optional existing conversation ID
 * @returns Promise resolving to the agent's response
 */
export async function queryDustAgent(
  agentId: string | null,
  query: string,
  context: any = {},
  conversationId?: string
): Promise<any> {
  try {
    if (!DUST_API_KEY) {
      throw new Error('DUST_API_KEY is not set in environment variables');
    }

    // Get workspace ID from environment
    const workspaceId = process.env.DUST_WORKSPACE_ID;
    if (!workspaceId) {
      throw new Error('DUST_WORKSPACE_ID is not set in environment variables');
    }

    // Use the first agent ID from environment if not provided
    if (!agentId) {
      agentId = getDefaultAgentId();
      logger('INFO', `Using default agent ID: ${agentId}`);
    }

    // For development, return mock response
    if (process.env.NODE_ENV === 'development') {
      // Simulate different responses based on query type
      let mockResult;
      const mockConversationId = uuidv4();

      if (
        query.toLowerCase().includes('summary') ||
        query.toLowerCase().includes('summarize')
      ) {
        mockResult = {
          result: `# Summary\n\nBased on the available information, here's a comprehensive summary:\n\n## Key Points\n\n1. The Dust MCP Server provides integration with Dust AI agents\n2. It supports file uploads, document processing, and agent querying\n3. The implementation uses direct API calls rather than the Dust SDK\n4. The server includes caching mechanisms for agent configurations\n\n## Current Status\n\nThe server is operational and can list available agents. Document processing and agent querying functionality are implemented but may need further refinement.\n\nWould you like more specific information about any particular aspect of the system?`,
          conversationId: mockConversationId,
          agentId,
          timestamp: new Date().toISOString(),
        };
      } else if (
        query.toLowerCase().includes('help') ||
        query.toLowerCase().includes('capabilities')
      ) {
        mockResult = {
          result: `# Dust MCP Server Capabilities\n\nThis MCP server provides the following capabilities:\n\n## Agent Interaction\n- Query Dust agents with natural language prompts\n- List available agents and their capabilities\n- Maintain conversation context across multiple interactions\n\n## Document Handling\n- Upload documents for processing\n- Extract structured data from documents\n- Include document content as context for agent queries\n\n## Integration\n- Connect with Dust AI through API integration\n- Support for various document types and formats\n- Extensible architecture for additional features\n\nHow can I assist you with using these capabilities?`,
          conversationId: mockConversationId,
          agentId,
          timestamp: new Date().toISOString(),
        };
      } else {
        mockResult = {
          result: `I've analyzed your query: "${query}"\n\nBased on my understanding, you're asking about ${query.split(' ').slice(0, 3).join(' ')}...\n\nTo provide a helpful response, I'd need more specific information about what you're looking for. Could you please provide more details or context about your question?\n\nIn the meantime, here are some general points that might be relevant:\n\n1. The Dust MCP Server provides integration with various AI agents\n2. You can upload and process documents for analysis\n3. Conversations maintain context across multiple interactions\n\nPlease let me know if you'd like information on a specific topic.`,
          conversationId: mockConversationId,
          agentId,
          timestamp: new Date().toISOString(),
        };
      }
      return mockResult;
    }

    // Normalize the base URL
    const baseUrl = DUST_API_URL.endsWith('/')
      ? DUST_API_URL.slice(0, -1)
      : DUST_API_URL;

    // For debugging purposes
    logger(
      'INFO',
      `Querying Dust agent ${agentId} with query: ${query.substring(0, 100)}...`
    );
    logger('INFO', `Using API URL: ${baseUrl}/w/${workspaceId}`);

    // Step 1: Create a new conversation or use existing one
    let conversationSId: string;

    if (conversationId) {
      // Use existing conversation
      conversationSId = conversationId;
      logger('INFO', `Using existing conversation with ID: ${conversationSId}`);
    } else {
      // Create a new conversation according to API documentation
      // https://docs.dust.tt/reference/post_api-v1-w-wid-assistant-conversations
      const createConversationUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations`;

      try {
        logger(
          'INFO',
          `Creating new conversation at URL: ${createConversationUrl}`
        );

        // POST request with empty body as per API documentation
        const createResponse = await axios.post(
          createConversationUrl,
          {},
          {
            headers: {
              Authorization: `Bearer ${DUST_API_KEY}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        logger(
          'INFO',
          'Conversation creation response received',
          createResponse.data
        );

        // Extract the conversation ID from the response
        if (!createResponse.data?.conversation?.sId) {
          logger(
            'ERROR',
            'Failed to get conversation.sId from response',
            createResponse.data
          );

          // Try to extract the ID from other fields if available
          if (createResponse.data?.conversation?.id) {
            conversationSId = String(createResponse.data.conversation.id);
            logger(
              'WARN',
              `Using conversation.id as fallback: ${conversationSId}`
            );
          } else {
            throw new Error(
              `Failed to get conversation ID from response: ${JSON.stringify(createResponse.data)}`
            );
          }
        } else {
          // Use the correct conversation.sId field
          conversationSId = createResponse.data.conversation.sId;
          logger(
            'INFO',
            `Created new conversation with ID: ${conversationSId}`
          );
        }
      } catch (error: any) {
        if (error.response) {
          logger(
            'ERROR',
            `Failed to create conversation: ${error.response.status}`,
            error.response.data
          );
          throw new Error(
            `Failed to create conversation: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else {
          logger('ERROR', 'Failed to create conversation', error);
          throw error;
        }
      }
    }

    // Step 2: Send a message to the conversation
    // https://docs.dust.tt/reference/post_api-v1-w-wid-assistant-conversations-cid-messages
    try {
      // URL for sending a message to the conversation
      const messageUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations/${conversationSId}/messages`;
      logger('INFO', `Sending message to URL: ${messageUrl}`);

      // Prepare message payload with required fields
      const messagePayload = {
        assistant: agentId,
        content: query,
        mentions: [], // Required by the API
        context: {
          // Required user context fields
          username: process.env.DUST_USERNAME || 'Anonymous User',
          timezone: process.env.DUST_TIMEZONE || 'UTC',
          email: process.env.DUST_EMAIL || '',
          fullname: process.env.DUST_FULLNAME || '',
          // Add any additional context provided
          ...context,
        },
        // Add outputFormat if specified in context
        ...(context.outputFormat ? { outputFormat: context.outputFormat } : {}),
      };

      logger('INFO', 'Sending message with payload', {
        agentId,
        conversationId: conversationSId,
        contentLength: query.length,
      });

      // Send the message
      const messageResponse = await axios.post(messageUrl, messagePayload, {
        headers: {
          Authorization: `Bearer ${DUST_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      logger('INFO', 'Message response received', messageResponse.data);

      // Check if we got a message ID back
      if (!messageResponse.data?.message?.sId) {
        throw new Error(
          `Failed to get message ID from response: ${JSON.stringify(messageResponse.data)}`
        );
      }

      const messageSId = messageResponse.data.message.sId;

      // Step 3: Wait for the agent's response
      // Poll the conversation to get the agent's response
      const conversationUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations/${conversationSId}`;

      let agentResponse = null;
      let attempts = 0;
      const maxAttempts = 60; // Increase max attempts to allow for longer processing time
      const pollingInterval = 2000; // 2 seconds between polling attempts

      logger(
        'INFO',
        `Starting to poll for agent response at ${new Date().toISOString()}`
      );

      while (!agentResponse && attempts < maxAttempts) {
        attempts++;

        // Wait between polling attempts
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));

        try {
          // Get the conversation with its messages
          const conversationResponse = await axios.get(conversationUrl, {
            headers: {
              Authorization: `Bearer ${DUST_API_KEY}`,
              Accept: 'application/json',
            },
          });

          logger(
            'INFO',
            `Polling attempt ${attempts}: ${conversationResponse.status}`
          );

          // Check if there are messages in the conversation
          if (conversationResponse.data?.conversation?.content) {
            logger(
              'INFO',
              `Found ${conversationResponse.data.conversation.content.length} message groups in conversation`
            );

            // Look for the assistant's response message
            for (
              let i = 0;
              i < conversationResponse.data.conversation.content.length;
              i++
            ) {
              const messageVersions =
                conversationResponse.data.conversation.content[i];

              if (messageVersions && messageVersions.length > 0) {
                // Get the latest version of the message
                const latestMessage =
                  messageVersions[messageVersions.length - 1];

                // Check if this is an assistant message
                if (latestMessage.type === 'assistant_message') {
                  logger(
                    'INFO',
                    `Found assistant message with status: ${latestMessage.status}`
                  );

                  // Check if the message is completed
                  if (
                    latestMessage.status === 'completed' ||
                    latestMessage.status === 'complete'
                  ) {
                    agentResponse = latestMessage;
                    logger(
                      'INFO',
                      `Found completed agent response after ${attempts} attempts`
                    );
                    break;
                  }
                }
              }
            }
          }

          if (!agentResponse) {
            logger(
              'INFO',
              `Waiting for agent response... (attempt ${attempts}/${maxAttempts})`
            );
          }
        } catch (pollingError: any) {
          logger(
            'ERROR',
            `Error during polling attempt ${attempts}`,
            pollingError
          );
          if (pollingError.response) {
            logger(
              'ERROR',
              'Polling error response',
              pollingError.response.data
            );
          }
          // Continue polling despite errors
        }
      }

      if (!agentResponse) {
        logger(
          'ERROR',
          `Timed out waiting for agent response after ${maxAttempts} attempts`
        );
        throw new Error(
          `Timed out waiting for agent response after ${maxAttempts} attempts`
        );
      }

      // If we found an agent response, return it
      logger('INFO', 'Successfully received agent response', agentResponse);
      return {
        result: agentResponse.content || 'No content in response',
        conversationId: conversationSId,
        messageId: messageSId,
        agentId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger('ERROR', `Error querying Dust agent ${agentId}`, error);

      if (error.response) {
        throw new Error(
          `Failed to get agent response: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    logger('ERROR', `Error in queryDustAgent: ${error.message}`);
    throw error;
  }
}

/**
 * List available Dust agents in the workspace
 *
 * This implementation aligns with the Dust API documentation:
 * https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-agent-configurations-search
 *
 * @param view Optional view type for filtering agents
 * @param limit Maximum number of agents to return (default: 10)
 * @returns Promise resolving to an array of agent configurations
 */
export async function listDustAgents(
  view?: string,
  limit: number = 10
): Promise<AgentConfig[]> {
  try {
    if (!DUST_API_KEY) {
      throw new Error('DUST_API_KEY is not set in environment variables');
    }

    // Get workspace ID from environment
    const workspaceId = process.env.DUST_WORKSPACE_ID;
    if (!workspaceId) {
      throw new Error('DUST_WORKSPACE_ID is not set in environment variables');
    }

    // For development, return mock agents
    if (process.env.NODE_ENV === 'development') {
      logger('INFO', 'Using mock agent list in development mode');
      return [
        {
          id: 'mock-agent-1',
          name: 'General Assistant',
          description:
            'A general-purpose assistant that can help with a wide range of tasks.',
          capabilities: ['web_search', 'browse', 'extract_data'],
          model: 'gpt-4o',
          provider: 'openai',
          temperature: 0.7,
          status: 'active',
          pictureUrl: 'https://dust.tt/static/spiritavatar/Spirit_Indigo_3.jpg',
          supportedOutputFormats: ['text', 'json'],
          timestamp: Date.now(),
        },
        {
          id: 'mock-agent-2',
          name: 'Code Assistant',
          description:
            'A specialized assistant for programming and code-related tasks.',
          capabilities: ['code_generation', 'code_explanation', 'code_review'],
          model: 'claude-3-opus',
          provider: 'anthropic',
          temperature: 0.5,
          status: 'active',
          pictureUrl:
            'https://dust.tt/static/spiritavatar/Spirit_Emerald_2.jpg',
          supportedOutputFormats: ['text', 'json'],
          timestamp: Date.now(),
        },
        {
          id: 'mock-agent-3',
          name: 'Data Analyst',
          description:
            'An assistant specialized in data analysis and visualization.',
          capabilities: ['data_analysis', 'chart_generation', 'extract_data'],
          model: 'gpt-4-turbo',
          provider: 'openai',
          temperature: 0.3,
          status: 'active',
          pictureUrl: 'https://dust.tt/static/spiritavatar/Spirit_Amber_1.jpg',
          supportedOutputFormats: ['text', 'json'],
          timestamp: Date.now(),
        },
      ];
    }

    // Construct query parameters
    const params = new URLSearchParams();
    if (view) {
      params.append('view', view);
    }
    if (limit > 0) {
      params.append('limit', limit.toString());
    }

    // Construct the API URL with workspace ID
    const baseUrl = DUST_API_URL.endsWith('/')
      ? DUST_API_URL.slice(0, -1)
      : DUST_API_URL;
    const queryString = params.toString() ? `?${params.toString()}` : '';

    // Use the correct endpoint for listing agents based on official docs
    // https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-agent-configurations-search
    const apiUrl = `${baseUrl}/w/${workspaceId}/assistant/agent_configurations${queryString}`;

    logger('INFO', `Requesting agent configurations from: ${apiUrl}`);

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Accept all status codes to handle errors properly
    });

    // Check for successful response
    if (response.status !== 200) {
      logger(
        'ERROR',
        `Failed to get agent configurations: ${response.status}`,
        response.data
      );
      throw new Error(
        `Failed to get agent configurations: ${response.status} - ${JSON.stringify(response.data)}`
      );
    }

    // Extract agent configurations from response
    const agentConfigurations = response.data?.agentConfigurations || [];
    logger('INFO', `Found ${agentConfigurations.length} agent configurations`);

    // Map API response to our AgentConfig interface
    return agentConfigurations.map((agent: any) => {
      const config: AgentConfig = {
        id: agent.sId || agent.id,
        name: agent.name || 'Unknown Agent',
        description: agent.description || '',
        capabilities: agent.actions?.map((action: any) => action.name) || [],
        model: agent.model?.modelId || '',
        provider: agent.model?.providerId || '',
        temperature: agent.model?.temperature,
        instructions: agent.instructions,
        status: agent.status,
        pictureUrl: agent.pictureUrl,
        supportedOutputFormats: agent.supportedOutputFormats || [],
        tags: agent.tags || [],
        visualizationEnabled: agent.visualizationEnabled,
        timestamp: Date.now(),
      };

      // Update cache with this agent config
      agentConfigCache.set(config.id, config);

      return config;
    });
  } catch (error: any) {
    logger('ERROR', 'Error listing Dust agents:', error);

    // For development, return mock agents if API call fails
    if (process.env.NODE_ENV === 'development') {
      logger(
        'INFO',
        'Using mock agent list in development mode due to API error'
      );
      return [
        {
          id: 'mock-agent-1',
          name: 'General Assistant (Mock)',
          description:
            'A general-purpose assistant that can help with a wide range of tasks.',
          capabilities: ['web_search', 'browse', 'extract_data'],
          model: 'gpt-4o',
          provider: 'openai',
          temperature: 0.7,
          status: 'active',
          pictureUrl: 'https://dust.tt/static/spiritavatar/Spirit_Indigo_3.jpg',
          supportedOutputFormats: ['text', 'json'],
          timestamp: Date.now(),
        },
      ];
    }

    throw error;
  }
}
