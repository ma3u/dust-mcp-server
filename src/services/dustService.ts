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
 * This implementation follows the exact Dust API structure as demonstrated in the curl command:
 * curl --request POST \
 *      --url https://dust.tt/api/v1/w/{workspaceId}/assistant/conversations \
 *      --header 'accept: application/json' \
 *      --header 'authorization: Bearer {apiKey}' \
 *      --header 'content-type: application/json'
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
      const conversationId = uuidv4();
      
      if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('summarize')) {
        mockResult = {
          result: `# Summary

Based on the available information, here's a comprehensive summary:

## Key Points

1. The Dust MCP Server provides integration with Dust AI agents
2. It supports file uploads, document processing, and agent querying
3. The implementation uses direct API calls rather than the Dust SDK
4. The server includes caching mechanisms for agent configurations

## Current Status

The server is operational and can list available agents. Document processing and agent querying functionality are implemented but may need further refinement.

Would you like more specific information about any particular aspect of the system?`,
          conversationId: conversationId,
          agentId,
          timestamp: new Date().toISOString()
        };
      } else if (query.toLowerCase().includes('help') || query.toLowerCase().includes('capabilities')) {
        mockResult = {
          result: `# Dust MCP Server Capabilities

This MCP server provides the following capabilities:

## Agent Interaction
- Query Dust agents with natural language prompts
- List available agents and their capabilities
- Maintain conversation context across multiple interactions

## Document Handling
- Upload documents for processing
- Extract structured data from documents
- Include document content as context for agent queries

## Integration
- Connect with Dust AI through API integration
- Support for various document types and formats
- Extensible architecture for additional features

How can I assist you with using these capabilities?`,
          conversationId: conversationId,
          agentId,
          timestamp: new Date().toISOString()
        };
      } else {
        mockResult = {
          result: `I've analyzed your query: "${query}"

Based on my understanding, you're asking about ${query.split(' ').slice(0, 3).join(' ')}...

To provide a helpful response, I'd need more specific information about what you're looking for. Could you please provide more details or context about your question?

In the meantime, here are some general points that might be relevant:

1. The Dust MCP Server provides integration with various AI agents
2. You can upload and process documents for analysis
3. Conversations maintain context across multiple interactions

Please let me know if you'd like information on a specific topic.`,
          conversationId: conversationId,
          agentId,
          timestamp: new Date().toISOString()
        };
      }
      return mockResult;
    }
    
    // Normalize the base URL
    const baseUrl = DUST_API_URL.endsWith('/') ? DUST_API_URL.slice(0, -1) : DUST_API_URL;
    
    // For debugging purposes
    process.stderr.write(`Querying Dust agent ${agentId} with query: ${query}\n`);
    process.stderr.write(`Using API URL: ${baseUrl}/w/${workspaceId}\n`);
    
    // Step 1: Create a new conversation exactly as shown in the curl command
    let conversationSId: string;
    
    if (conversationId) {
      // Use existing conversation
      conversationSId = conversationId;
      process.stderr.write(`Using existing conversation with ID: ${conversationSId}\n`);
    } else {
      // Create a new conversation with minimal payload - exactly matching the curl command
      const createConversationUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations`;
      
      try {
        // Simple POST request with empty body - just like the curl command
        const createResponse = await axios.post(createConversationUrl, {}, {
          headers: {
            'Authorization': `Bearer ${DUST_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        process.stderr.write(`Create conversation response: ${JSON.stringify(createResponse.data)}\n`);
        
        // Extract the conversation ID - should be in sId field
        if (!createResponse.data?.conversation?.sId) {
          throw new Error(`Failed to get conversation ID from response: ${JSON.stringify(createResponse.data)}`);
        }
        
        conversationSId = createResponse.data.conversation.sId;
        process.stderr.write(`Created new conversation with ID: ${conversationSId}\n`);
      } catch (error: any) {
        if (error.response) {
          process.stderr.write(`Error response: ${JSON.stringify(error.response.data)}\n`);
          throw new Error(`Failed to create conversation: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
          throw error;
        }
      }
    }
    
    // Step 2: Send a message to the conversation
    try {
      // URL for sending a message to the conversation
      const messageUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations/${conversationSId}/messages`;
      
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
      
      process.stderr.write(`Sending message to conversation ${conversationSId} with payload: ${JSON.stringify(messagePayload)}\n`);
      
      // Send the message
      const messageResponse = await axios.post(messageUrl, messagePayload, {
        headers: {
          'Authorization': `Bearer ${DUST_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      process.stderr.write(`Message response: ${JSON.stringify(messageResponse.data)}\n`);
      
      // Check if we got a message ID back
      if (!messageResponse.data?.message?.sId) {
        throw new Error(`Failed to get message ID from response: ${JSON.stringify(messageResponse.data)}`);
      }
      
      const messageSId = messageResponse.data.message.sId;
      
      // Step 3: Wait for the agent's response
      // Poll the conversation to get the agent's response
      const conversationUrl = `${baseUrl}/w/${workspaceId}/assistant/conversations/${conversationSId}`;
      
      let agentResponse = null;
      let attempts = 0;
      const maxAttempts = 60; // Increase max attempts to allow for longer processing time
      const pollingInterval = 2000; // 2 seconds between polling attempts
      
      process.stderr.write(`Starting to poll for agent response at ${new Date().toISOString()}\n`);
      
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
          
          process.stderr.write(`Polling attempt ${attempts}: ${conversationResponse.status}\n`);
          
          // Log the full conversation data for debugging (first few attempts)
          if (attempts <= 3 || attempts % 10 === 0) {
            process.stderr.write(`Conversation data: ${JSON.stringify(conversationResponse.data, null, 2)}\n`);
          }
          
          // Check if there are messages in the conversation
          if (conversationResponse.data?.conversation?.content) {
            process.stderr.write(`Found ${conversationResponse.data.conversation.content.length} message groups in conversation\n`);
            
            // Look for the assistant's response message
            // It might not be at index 1 if there are multiple messages, so we need to check all messages
            for (let i = 0; i < conversationResponse.data.conversation.content.length; i++) {
              const messageVersions = conversationResponse.data.conversation.content[i];
              
              if (messageVersions && messageVersions.length > 0) {
                // Get the latest version of the message
                const latestMessage = messageVersions[messageVersions.length - 1];
                
                // Check if this is an assistant message
                if (latestMessage.type === "assistant_message") {
                  process.stderr.write(`Found assistant message with status: ${latestMessage.status}\n`);
                  
                  // Check if the message is completed
                  if (latestMessage.status === "completed" || latestMessage.status === "complete") {
                    agentResponse = latestMessage;
                    process.stderr.write(`Found completed agent response after ${attempts} attempts\n`);
                    break;
                  }
                }
              }
            }
          }
          
          if (!agentResponse) {
            process.stderr.write(`Waiting for agent response... (attempt ${attempts}/${maxAttempts})\n`);
          }
        } catch (pollingError) {
          process.stderr.write(`Error during polling attempt ${attempts}: ${pollingError}\n`);
          if (pollingError.response) {
            process.stderr.write(`Polling error response: ${JSON.stringify(pollingError.response.data)}\n`);
          }
          // Continue polling despite errors
        }
      }
      
      if (!agentResponse) {
        throw new Error(`Timed out waiting for agent response after ${maxAttempts} attempts`);
      }
      
      // If we found an agent response, return it
      if (agentResponse) {
        process.stderr.write(`Successfully received agent response: ${JSON.stringify(agentResponse, null, 2)}\n`);
        return {
          result: agentResponse.content || "No content in response",
          conversationId: conversationSId,
          messageId: messageSId,
          agentId,
          timestamp: new Date().toISOString()
        };
      }
      
      // If we timed out waiting for a response, return a fallback response
      process.stderr.write(`Timed out waiting for agent response after ${maxAttempts} attempts\n`);
      return {
        result: "The agent is taking longer than expected to respond. Please try again later.",
        conversationId: conversationSId,
        messageId: messageSId,
        agentId,
        timestamp: new Date().toISOString(),
        timedOut: true
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Failed to get agent response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error querying Dust agent ${agentId}:`, error);
    
    // For development, return mock response if API call fails
    if (process.env.NODE_ENV === "development") {
      const mockConversationId = conversationId || uuidv4();
      
      // Simulate different responses based on query type
      let mockResponse;
      if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('summarize')) {
        mockResponse = `# Error Recovery: Summary

I encountered an issue connecting to the Dust API, but I can still provide a summary based on available information:

## Project Overview

The Dust MCP Server is designed to integrate with Dust AI's capabilities through a Model Context Protocol (MCP) interface. It allows for:

1. Document processing and analysis
2. Agent-based interactions
3. Conversation management
4. Structured data extraction

## Technical Implementation

The server uses TypeScript with Express and implements direct API calls to Dust rather than using the SDK. This approach provides greater flexibility but requires careful error handling.

*Note: This is a mock response generated due to API connection issues.*`;
      } else if (query.toLowerCase().includes('trend') || query.toLowerCase().includes('compare')) {
        mockResponse = `# Trend Analysis (Mock Response)

I'm currently unable to connect to the Dust API to perform a complete analysis, but I can provide some general information about trend analysis:

## Common Trend Indicators

- **Moving Averages**: Help smooth out data to identify underlying trends
- **Rate of Change**: Measures the speed at which values are increasing or decreasing
- **Comparative Analysis**: Examines relationships between different metrics over time

## Best Practices

1. Establish a baseline before analyzing trends
2. Consider seasonal variations and cyclical patterns
3. Look for correlation but remember it doesn't imply causation
4. Use appropriate time intervals for your analysis

*This is a mock response due to API connection issues.*`;
      } else {
        mockResponse = `# Response to Query: "${query}"

I apologize, but I'm currently experiencing difficulties connecting to the Dust API. Here's what I can tell you based on the available information:

## General Information

The Dust MCP Server provides an interface for interacting with Dust AI agents through a standardized protocol. Your query about "${query}" would typically be processed by one of these agents.

## Recommendations

1. Check your network connection and API configuration
2. Verify that your Dust API key and workspace ID are correctly set
3. Try again later as the service might be temporarily unavailable

## Next Steps

If you continue to experience issues, you might want to check the server logs for more detailed error information.

*This is a mock response generated due to API connection issues.*`;
      }
      
      return {
        result: mockResponse,
        conversationId: mockConversationId,
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
      const responseDataStr = response.data ? JSON.stringify(response.data, null, 2) : "";
      process.stderr.write(`Response data: ${responseDataStr.length > 500 ? responseDataStr.substring(0, 500) + '...' : responseDataStr}\n`);
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
      const responseDataStr = response.data ? JSON.stringify(response.data) : "";
      process.stderr.write(`Unexpected response format: ${responseDataStr.length > 200 ? responseDataStr.substring(0, 200) + '...' : responseDataStr}\n`);
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
