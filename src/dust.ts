import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Load environment variables
dotenv.config();

// Dust API configuration
const DUST_API_URL = process.env.DUST_API_URL || "https://dust.tt/api/v1";
const DUST_API_KEY = process.env.DUST_API_KEY;

// Simple cache for agent configurations (TTL: 5 mins)
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  timestamp: number;
}

const agentConfigCache: Map<string, AgentConfig> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to get agent configuration (with caching)
async function getAgentConfig(agentId: string): Promise<AgentConfig | null> {
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
    
    // Use the correct API endpoint format based on debug results
    const response = await axios.get(`${DUST_API_URL}/w/${workspaceId}/assistant/agent_configurations/${agentId}`, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    
    if (response.status === 200 && response.data) {
      const config: AgentConfig = {
        id: response.data.id || agentId,
        name: response.data.name || "Unknown Agent",
        description: response.data.description || "",
        capabilities: response.data.capabilities || [],
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
        capabilities: ["text-processing", "data-analysis"],
        timestamp: Date.now()
      };
      
      agentConfigCache.set(agentId, mockConfig);
      return mockConfig;
    }
    
    return null;
  }
}

// Function to query a Dust agent
async function queryDustAgent(agentId: string, query: string, context: any = {}, conversationId?: string): Promise<any> {
  try {
    if (!DUST_API_KEY) {
      throw new Error("DUST_API_KEY is not set in environment variables");
    }
    
    // Get agent configuration to validate agent exists
    const agentConfig = await getAgentConfig(agentId);
    if (!agentConfig) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Get workspace ID from environment
    const workspaceId = process.env.DUST_WORKSPACE_ID;
    if (!workspaceId) {
      throw new Error("DUST_WORKSPACE_ID is not set in environment variables");
    }
    
    // Step 1: Create a new conversation if not provided
    let conversationSId = conversationId;
    
    if (!conversationSId) {
      console.log("Creating new conversation...");
      const createConversationUrl = `${DUST_API_URL}/w/${workspaceId}/assistant/conversations`;
      
      try {
        // Simple POST request with empty body
        const createResponse = await axios.post(createConversationUrl, {}, {
          headers: {
            'Authorization': `Bearer ${DUST_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        // Extract the conversation ID
        if (!createResponse.data?.conversation?.sId) {
          throw new Error(`Failed to get conversation ID from response: ${JSON.stringify(createResponse.data)}`);
        }
        
        conversationSId = createResponse.data.conversation.sId;
        console.log(`Created new conversation with ID: ${conversationSId}`);
      } catch (error: any) {
        if (error.response) {
          throw new Error(`Failed to create conversation: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
          throw error;
        }
      }
    }
    
    // Step 2: Send a message to the conversation
    // Prepare message payload with required context field
    const messagePayload = {
      assistant: agentId,
      content: query,
      mentions: [], // Required by the API
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
    const messageUrl = `${DUST_API_URL}/w/${workspaceId}/assistant/conversations/${conversationSId}/messages`;
    const response = await axios.post(messageUrl, messagePayload, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    // Step 3: Wait for the agent's response
    if (response.status === 200 && response.data) {
      // Get the message ID
      const messageSId = response.data.message?.sId;
      if (!messageSId) {
        throw new Error(`Failed to get message ID from response: ${JSON.stringify(response.data)}`);
      }
      
      // Poll the conversation to get the agent's response
      const conversationUrl = `${DUST_API_URL}/w/${workspaceId}/assistant/conversations/${conversationSId}`;
      
      let agentResponse = null;
      let attempts = 0;
      const maxAttempts = 30; // 1 minute with 2-second intervals
      const pollingInterval = 2000; // 2 seconds between polling attempts
      
      console.log(`Polling for agent response...`);
      
      while (!agentResponse && attempts < maxAttempts) {
        attempts++;
        
        // Wait between polling attempts
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        
        try {
          // Get the conversation with its messages
          const conversationResponse = await axios.get(conversationUrl, {
            headers: {
              'Authorization': `Bearer ${DUST_API_KEY}`,
              'Accept': 'application/json'
            }
          });
          
          // Check if there are messages in the conversation
          if (conversationResponse.data?.conversation?.content) {
            // Look for the assistant's response message
            for (let i = 0; i < conversationResponse.data.conversation.content.length; i++) {
              const messageVersions = conversationResponse.data.conversation.content[i];
              
              if (messageVersions && messageVersions.length > 0) {
                // Get the latest version of the message
                const latestMessage = messageVersions[messageVersions.length - 1];
                
                // Check if this is an assistant message
                if (latestMessage.type === "assistant_message") {
                  // Check if the message is completed
                  if (latestMessage.status === "completed" || latestMessage.status === "complete") {
                    agentResponse = latestMessage;
                    console.log(`Found completed agent response after ${attempts} attempts`);
                    break;
                  }
                }
              }
            }
          }
        } catch (pollingError) {
          console.error(`Error during polling attempt ${attempts}:`, pollingError);
          // Continue polling despite errors
        }
      }
      
      if (!agentResponse) {
        throw new Error(`Timed out waiting for agent response after ${maxAttempts} attempts`);
      }
      
      return {
        result: agentResponse.content || "No content in response",
        conversationId: conversationSId,
        messageId: messageSId,
        agentId,
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error(`Unexpected response from Dust API: ${response.status}`);
  } catch (error) {
    console.error(`Error querying Dust agent ${agentId}:`, error);
    
    // For development, return mock response if API call fails
    if (process.env.NODE_ENV === "development") {
      return {
        result: {
          content: `[MOCK] Response from agent ${agentId} for query: ${query}`,
          type: "text"
        },
        conversationId: conversationId || uuidv4(),
        agentId,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
    
    throw error;
  }
}

export default (server: McpServer) => {
  // Register the single agent query tool
  server.tool(
    "dust_agent_query",
    "Query a specific Dust agent with a prompt and optional context",
    {
      agentId: z.string({
        description: "ID of the Dust agent to query"
      }),
      query: z.string({
        description: "The prompt or question to send to the agent"
      }),
      context: z.record(z.any(), {
        description: "Optional context data to provide to the agent"
      }).optional(),
      conversationId: z.string({
        description: "Optional conversation ID for continuing an existing conversation"
      }).optional()
    },
    async (params) => {
      try {
        // Query the Dust agent
        const response = await queryDustAgent(
          params.agentId,
          params.query,
          params.context || {},
          params.conversationId
        );
        
        // Format the response for MCP
        return {
          content: [{
            type: "text",
            text: typeof response.result === "string" 
              ? response.result 
              : JSON.stringify(response.result, null, 2)
          }],
          metadata: {
            agentId: params.agentId,
            query: params.query,
            conversationId: response.conversationId,
            timestamp: response.timestamp
          }
        };
      } catch (error) {
        console.error("Error in dust_agent_query tool:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to query Dust agent: ${errorMessage}`);
      }
    }
  );
  
  // Register a tool to get agent information
  server.tool(
    "dust_agent_info",
    "Get information about a specific Dust agent",
    {
      agentId: z.string({
        description: "ID of the Dust agent to get information about"
      })
    },
    async (params) => {
      try {
        // Get agent configuration
        const agentConfig = await getAgentConfig(params.agentId);
        
        if (!agentConfig) {
          throw new Error(`Agent with ID ${params.agentId} not found`);
        }
        
        // Format the response for MCP
        return {
          content: [{
            type: "text",
            text: `Agent Information:\n\nID: ${agentConfig.id}\nName: ${agentConfig.name}\nDescription: ${agentConfig.description}\nCapabilities: ${agentConfig.capabilities.join(", ")}`
          }],
          metadata: {
            agent: agentConfig
          }
        };
      } catch (error) {
        console.error("Error in dust_agent_info tool:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get agent information: ${errorMessage}`);
      }
    }
  );
}