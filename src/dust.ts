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
    
    const response = await axios.get(`${DUST_API_URL}/agents/${agentId}`, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Content-Type": "application/json"
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
    
    // Generate conversation ID if not provided
    const sId = conversationId || uuidv4();
    
    // Prepare request payload
    const payload = {
      query,
      context,
      conversationId: sId
    };
    
    // Make API request to Dust
    const response = await axios.post(`${DUST_API_URL}/agents/${agentId}/run`, payload, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    if (response.status === 200 && response.data) {
      return {
        result: response.data.result,
        conversationId: sId,
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