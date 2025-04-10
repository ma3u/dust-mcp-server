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
 */

import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Dust API configuration
const DUST_API_URL = process.env.DUST_API_URL || "https://dust.tt/api/v1";
const DUST_API_KEY = process.env.DUST_API_KEY;

// Simple cache for agent configurations (TTL: 5 mins)
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  model?: string;
  provider?: string;
  timestamp: number;
}

const agentConfigCache: Map<string, AgentConfig> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to get agent configuration (with caching)
export async function getAgentConfig(agentId: string): Promise<AgentConfig | null> {
  // Check cache first
  const cachedConfig = agentConfigCache.get(agentId);
  if (cachedConfig && (Date.now() - cachedConfig.timestamp) < CACHE_TTL) {
    return cachedConfig;
  }
  
  // If not in cache or expired, fetch from API
  try {
    if (!DUST_API_KEY) {
      throw new Error("DUST_API_KEY is not set in environment variables");
    }
    
    // Get workspace ID from environment
    const workspaceId = process.env.DUST_WORKSPACE_ID;
    if (!workspaceId) {
      throw new Error("DUST_WORKSPACE_ID is not set in environment variables");
    }
    
    // Construct the correct API URL with workspace ID
    // Format should be: https://dust.tt/api/v1/w/{workspaceId}/assistant/{agentId}
    const apiUrl = `${DUST_API_URL}/w/${workspaceId}/assistant/${agentId}`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    if (response.status === 200 && response.data) {
      const config: AgentConfig = {
        id: response.data.sId || response.data.id || agentId,
        name: response.data.name || "Unknown Agent",
        description: response.data.description || "",
        capabilities: response.data.actions?.map((action: any) => action.name) || [],
        model: response.data.model?.modelId || "",
        provider: response.data.model?.providerId || "",
        timestamp: Date.now()
      };
      
      // Update cache
      agentConfigCache.set(agentId, config);
      return config;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching agent config for ${agentId}:`, error);
    
    // For development, return a mock config if API call fails
    if (process.env.NODE_ENV === "development") {
      const mockConfig: AgentConfig = {
        id: agentId,
        name: `Agent ${agentId}`,
        description: "Mock agent configuration for development",
        capabilities: ["web_search", "browse"],
        model: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        timestamp: Date.now()
      };
      
      agentConfigCache.set(agentId, mockConfig);
      return mockConfig;
    }
    
    return null;
  }
}

// Function to get the default agent ID from environment
function getDefaultAgentId(): string {
  const agentIdsString = process.env.DUST_AGENT_IDs;
  if (!agentIdsString) {
    throw new Error("DUST_AGENT_IDs is not set in environment variables");
  }
  
  // Parse the comma-separated list and get the first agent ID
  const agentIds = agentIdsString.split(',').map(id => id.trim());
  if (agentIds.length === 0) {
    throw new Error("No agent IDs found in DUST_AGENT_IDs environment variable");
  }
  
  return agentIds[0];
}

/**
 * Query a Dust agent with a message and optional context
 * 
 * This implementation aligns with the Dust SDK's createConversation and postUserMessage methods
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
      throw new Error("DUST_API_KEY is not set in environment variables");
    }
    
    // Get workspace ID from environment
    const workspaceId = process.env.DUST_WORKSPACE_ID;
    if (!workspaceId) {
      throw new Error("DUST_WORKSPACE_ID is not set in environment variables");
    }
    
    // For development, return mock response
    if (process.env.NODE_ENV === "development") {
      // Simulate different responses based on query type
      let mockResult;
      if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('summarize')) {
        mockResult = {
          result: "Based on the provided documents, this is a summary of the key information...",
          conversationId: uuidv4(),
          agentId,
          timestamp: new Date().toISOString()
        };
      } else {
        mockResult = {
          result: "General analysis of your query: " + query,
          conversationId: uuidv4(),
          agentId,
          timestamp: new Date().toISOString()
        };
      }
      return mockResult;
    }
    
    // Normalize the base URL
    const baseUrl = DUST_API_URL.endsWith('/') ? DUST_API_URL.slice(0, -1) : DUST_API_URL;
    
    // Step 1: Create or get a conversation
    let conversationSId: string;
    
    if (conversationId) {
      // Use existing conversation
      conversationSId = conversationId;
    } else {
      // Create a new conversation following SDK pattern
      const createConversationUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations`;
      
      try {
        const createResponse = await axios.post(createConversationUrl, {
          // Optional title can be provided here
          // title: "New conversation",
          // Optional visibility setting
          // visibility: "unlisted",
          // We can include the first message directly when creating the conversation
          message: {
            assistant: agentId,
            content: query,
            mentions: [],
            context: {
              username: process.env.DUST_USERNAME || "Anonymous User",
              timezone: process.env.DUST_TIMEZONE || "UTC",
              email: process.env.DUST_EMAIL || "",
              fullname: process.env.DUST_FULLNAME || "",
              ...context
            }
          },
          // Set to true to wait for the agent's response
          blocking: true
        }, {
          headers: {
            Authorization: `Bearer ${DUST_API_KEY}`,
            "Content-Type": "application/json"
          },
          validateStatus: () => true // Accept all status codes to handle errors properly
        });
        
        // Handle error responses
        if (createResponse.status !== 200) {
          const errorMessage = createResponse.data?.error?.message || 
            `API error: ${createResponse.status}`;
          throw new Error(errorMessage);
        }
        
        if (!createResponse.data?.conversation?.sId) {
          throw new Error(`Failed to get conversation ID from response: ${JSON.stringify(createResponse.data)}`);
        }
        
        conversationSId = createResponse.data.conversation.sId;
        
        // If blocking was true, we already have the agent's response
        if (createResponse.data.conversation.content && 
            createResponse.data.conversation.content.length >= 2) {
          // The first message is the user's, the second is the agent's response
          const agentMessageVersion = createResponse.data.conversation.content[1];
          const agentMessage = agentMessageVersion[agentMessageVersion.length - 1];
          
          return {
            result: agentMessage.content,
            conversationId: conversationSId,
            messageId: agentMessage.sId,
            agentId,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error: any) {
        if (error.response) {
          throw new Error(`Failed to create conversation: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
          throw error;
        }
      }
    }
    
    // Step 2: If we didn't get a response yet, send a message to the conversation
    const messageUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations/${conversationSId}/messages`;
    
    // Prepare message payload according to SDK and API documentation
    const messagePayload = {
      assistant: agentId,  // ID of the assistant to use
      content: query,      // Content of the message
      mentions: [],        // Required field according to API
      context: {
        // Required user context fields
        username: process.env.DUST_USERNAME || "Anonymous User",
        timezone: process.env.DUST_TIMEZONE || "UTC",
        email: process.env.DUST_EMAIL || "",
        fullname: process.env.DUST_FULLNAME || "",
        // Add any additional context provided
        ...context
      }
    };
    
    // Send the message
    const messageResponse = await axios.post(messageUrl, messagePayload, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Content-Type": "application/json"
      },
      validateStatus: () => true // Accept all status codes to handle errors properly
    });
    
    // Handle error responses
    if (messageResponse.status !== 200) {
      const errorMessage = messageResponse.data?.error?.message || 
        `API error: ${messageResponse.status}`;
      throw new Error(errorMessage);
    }
    
    // Process and return the response
    if (messageResponse.data && messageResponse.data.message) {
      // Extract the relevant information from the response
      const result = {
        result: messageResponse.data.message.content || "No content in response",
        conversationId: conversationSId,
        messageId: messageResponse.data.message.sId,
        agentId,
        timestamp: new Date().toISOString()
      };
      
      return result;
    } else {
      throw new Error(`Unexpected response format: ${JSON.stringify(messageResponse.data)}`);
    }
  } catch (error) {
    console.error(`Error querying Dust agent ${agentId}:`, error);
    
    // For development, return mock response if API call fails
    if (process.env.NODE_ENV === "development") {
      // Simulate different responses based on query type
      let mockResult;
      if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('summarize')) {
        mockResult = {
          summary: "Based on the provided documents, this is a summary of the key information...",
          recommendations: [
            "Recommendation 1",
            "Recommendation 2",
            "Recommendation 3"
          ]
        };
      } else if (query.toLowerCase().includes('trend') || query.toLowerCase().includes('compare')) {
        mockResult = {
          trends: {
            metric1: "Trend analysis for metric 1",
            metric2: "Trend analysis for metric 2"
          },
          analysis: "Overall trend analysis..."
        };
      } else {
        mockResult = {
          analysis: "General analysis of the provided information...",
          insights: [
            "Insight 1",
            "Insight 2",
            "Insight 3"
          ],
          recommendations: "General recommendations based on the analysis."
        };
      }
      
      return {
        result: mockResult,
        conversationId: conversationId || uuidv4(),
        agentId,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
    
    // Return error information instead of throwing
    return {
      error: true,
      message: error instanceof Error ? error.message : String(error),
      conversationId: conversationId,
      agentId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * List available Dust agents in the workspace
 * 
 * This implementation aligns with the Dust SDK's getAgentConfigurations method
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
      throw new Error("DUST_API_KEY is not set in environment variables");
    }
    
    // Get workspace ID from environment
    const workspaceId = process.env.DUST_WORKSPACE_ID;
    if (!workspaceId) {
      throw new Error("DUST_WORKSPACE_ID is not set in environment variables");
    }
    
    // Generate query parameters if needed
    const params = new URLSearchParams();
    if (view) {
      params.append("view", view);
    }
    if (limit > 0) {
      params.append("limit", limit.toString());
    }
    
    // Construct the API URL with workspace ID
    const baseUrl = DUST_API_URL.endsWith('/') ? DUST_API_URL.slice(0, -1) : DUST_API_URL;
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const apiUrl = `${baseUrl}/w/${workspaceId}/assistant/agent_configurations${queryString}`;
    
    // Log the API URL for debugging
    process.stderr.write(`Requesting agent configurations from: ${apiUrl}\n`);
    
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      validateStatus: () => true // Accept all status codes to handle errors properly
    });
    
    // Log response for debugging (to stderr to avoid interfering with MCP response)
    if (process.env.NODE_ENV === "development") {
      process.stderr.write(`Agent configurations response status: ${response.status}\n`);
      process.stderr.write(`Response data: ${JSON.stringify(response.data, null, 2).substring(0, 500)}...\n`);
    }
    
    // Handle error responses
    if (response.status !== 200) {
      const errorMessage = response.data?.error?.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    // Parse and process the response
    if (response.data && response.data.agentConfigurations && Array.isArray(response.data.agentConfigurations)) {
      const agents = response.data.agentConfigurations.map((agent: any) => ({
        id: agent.sId || agent.id, // Use sId as the primary identifier
        name: agent.name || "Unknown Agent",
        description: agent.description || "",
        capabilities: agent.actions?.map((action: any) => action.name) || [],
        model: agent.model?.modelId || "",
        provider: agent.model?.providerId || "",
        timestamp: Date.now()
      }));
      
      // Update cache for each agent
      agents.forEach((agent: AgentConfig) => {
        agentConfigCache.set(agent.id, agent);
      });
      
      process.stderr.write(`Found ${agents.length} agents\n`);
      return agents;
    } else {
      process.stderr.write(`Unexpected response format: ${JSON.stringify(response.data).substring(0, 200)}...\n`);
      throw new Error("Unexpected response format from Dust API");
    }
  } catch (error: any) {
    // Log error details
    process.stderr.write(`Error listing Dust agents: ${error.message}\n`);
    if (error.response) {
      process.stderr.write(`API error: ${error.response.status} - ${JSON.stringify(error.response.data)}\n`);
    }
    
    // For development, return mock agents if API call fails
    if (process.env.NODE_ENV === "development") {
      const mockAgents = [
        {
          id: "helper",
          name: "Help",
          description: "Help on how to use Dust",
          capabilities: ["search_dust_docs", "web_search", "browse"],
          model: "claude-3-5-sonnet-20241022",
          provider: "anthropic",
          timestamp: Date.now()
        },
        {
          id: "gpt-4",
          name: "GPT-4",
          description: "OpenAI's GPT 4o model (128k context).",
          capabilities: ["web_search", "browse"],
          model: "gpt-4o",
          provider: "openai",
          timestamp: Date.now()
        },
        {
          id: "claude",
          name: "Claude",
          description: "Anthropic's Claude 3.5 Sonnet model.",
          capabilities: ["web_search", "browse"],
          model: "claude-3-5-sonnet-20241022",
          provider: "anthropic",
          timestamp: Date.now()
        }
      ];
      
      // Update cache for mock agents
      mockAgents.forEach(agent => {
        agentConfigCache.set(agent.id, agent);
      });
      
      return mockAgents;
    }
    
    return [];
  }
}
