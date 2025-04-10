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
export async function queryDustAgent(agentId: string, query: string, context: any = {}, conversationId?: string): Promise<any> {
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
      console.log(`[MOCK] Generating mock response for agent ${agentId}`);
      
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
    
    throw error;
  }
}

// Function to list available Dust agents
export async function listDustAgents(limit: number = 10): Promise<AgentConfig[]> {
  try {
    if (!DUST_API_KEY) {
      throw new Error("DUST_API_KEY is not set in environment variables");
    }
    
    const response = await axios.get(`${DUST_API_URL}/agents?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${DUST_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    if (response.status === 200 && response.data && Array.isArray(response.data.agents)) {
      const agents = response.data.agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name || "Unknown Agent",
        description: agent.description || "",
        capabilities: agent.capabilities || [],
        timestamp: Date.now()
      }));
      
      // Update cache for each agent
      agents.forEach((agent: AgentConfig) => {
        agentConfigCache.set(agent.id, agent);
      });
      
      return agents;
    }
    
    return [];
  } catch (error) {
    console.error("Error listing Dust agents:", error);
    
    // For development, return mock agents if API call fails
    if (process.env.NODE_ENV === "development") {
      const mockAgents = [
        {
          id: "health-analysis",
          name: "Health Analysis Agent",
          description: "Analyzes health data and provides insights",
          capabilities: ["health-analysis", "data-processing"],
          timestamp: Date.now()
        },
        {
          id: "nutrition-advisor",
          name: "Nutrition Advisor Agent",
          description: "Provides nutrition advice based on diet logs",
          capabilities: ["nutrition-analysis", "recommendation-engine"],
          timestamp: Date.now()
        },
        {
          id: "medical-research",
          name: "Medical Research Agent",
          description: "Searches and summarizes medical research papers",
          capabilities: ["research", "summarization"],
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
