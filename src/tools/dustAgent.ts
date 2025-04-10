import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Import the Dust service functions
import { queryDustAgent, getAgentConfig, listDustAgents } from "../services/dustService.js";

// Load environment variables
dotenv.config();

// Path to processed documents
const PROCESSED_DIR = path.join(process.cwd(), 'processed');

export default (server: McpServer) => {
  // Define agent query tool
  server.tool(
    "query_dust_agent",
    "Query a specific Dust agent with a prompt and optional context",
    {
      agentId: z.string({
        description: "ID of the Dust agent to query"
      }),
      query: z.string({
        description: "The prompt or question to send to the agent"
      }),
      documentIds: z.array(z.string(), {
        description: "Optional IDs of processed documents to include as context"
      }).optional(),
      context: z.record(z.any(), {
        description: "Optional additional context data to provide to the agent"
      }).optional(),
      conversationId: z.string({
        description: "Optional conversation ID for continuing an existing conversation"
      }).optional()
    },
    async (params) => {
      try {
        // Initialize context object
        let context: any = params.context || {};
        
        // If document IDs are provided, load their data and add to context
        if (params.documentIds && params.documentIds.length > 0) {
          const documentContexts = await Promise.all(
            params.documentIds.map(async (docId) => {
              const processedPath = path.join(PROCESSED_DIR, `${docId}.json`);
              try {
                const processedContent = await fs.readFile(processedPath, 'utf8');
                return JSON.parse(processedContent);
              } catch (error) {
                console.error(`Error loading document ${docId}:`, error);
                throw new Error(`Document with ID ${docId} not found or not processed`);
              }
            })
          );
          
          // Add documents to context
          context.documents = documentContexts.map(doc => ({
            id: doc.documentId,
            name: doc.originalName,
            type: doc.fileType,
            data: doc.structuredData,
            text: doc.extractedText
          }));
        }
        
        // Query the Dust agent using our service
        const response = await queryDustAgent(
          params.agentId,
          params.query,
          context,
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
            documentIds: params.documentIds,
            conversationId: response.conversationId,
            timestamp: response.timestamp
          }
        };
      } catch (error) {
        console.error('Error querying Dust agent:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to query Dust agent: ${errorMessage}`);
      }
    }
  );
  
  // Add a tool to get information about a Dust agent
  server.tool(
    "get_dust_agent_info",
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
        console.error("Error in get_dust_agent_info tool:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get agent information: ${errorMessage}`);
      }
    }
  );

  // Define insights tool
  server.tool(
    "generate_insights",
    "Generate insights and recommendations based on processed documents",
    {
      documentIds: z.array(z.string(), {
        description: "IDs of processed documents to analyze"
      }),
      focusArea: z.enum(["nutrition", "lab_results", "overall_health", "trends"], {
        description: "Area to focus the analysis on"
      }).optional(),
      timeframe: z.enum(["recent", "all", "past_month", "past_year"], {
        description: "Timeframe to consider for the analysis"
      }).optional(),
      conversationId: z.string({
        description: "Optional conversation ID for continuing an existing analysis"
      }).optional()
    },
    async (params) => {
      try {
        // Load document data
        const documentData = await Promise.all(
          params.documentIds.map(async (docId) => {
            const processedPath = path.join(PROCESSED_DIR, `${docId}.json`);
            try {
              const processedContent = await fs.readFile(processedPath, 'utf8');
              return JSON.parse(processedContent);
            } catch (error) {
              console.error(`Error loading document ${docId}:`, error);
              throw new Error(`Document with ID ${docId} not found or not processed`);
            }
          })
        );
        
        // Prepare context for analysis
        const context = {
          documents: documentData.map(doc => ({
            id: doc.documentId,
            name: doc.originalName,
            type: doc.fileType,
            data: doc.structuredData,
            text: doc.extractedText
          })),
          focusArea: params.focusArea || "overall_health",
          timeframe: params.timeframe || "all"
        };
        
        // Generate query based on focus area
        let query = "Analyze data and provide insights";
        if (params.focusArea === "nutrition") {
          query = "Analyze nutrition logs and provide dietary insights and recommendations";
        } else if (params.focusArea === "lab_results") {
          query = "Analyze lab results and identify any concerning values or trends";
        } else if (params.focusArea === "trends") {
          query = "Identify trends in metrics over time and provide analysis";
        }
        
        // Query the Dust agent using our service
        const response = await queryDustAgent(
          "analysis", // Using a default agent ID for analysis
          query,
          context,
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
            documentIds: params.documentIds,
            focusArea: params.focusArea || "overall_health",
            timeframe: params.timeframe || "all",
            conversationId: response.conversationId,
            timestamp: response.timestamp
          }
        };
      } catch (error) {
        console.error('Error generating insights:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate insights: ${errorMessage}`);
      }
    }
  );
  
  // Add a tool to list available Dust agents
  server.tool(
    "list_dust_agents",
    "List available Dust agents with their capabilities",
    {
      limit: z.number({
        description: "Maximum number of agents to return"
      }).optional()
    },
    async (params) => {
      try {
        // Get list of agents
        const agents = await listDustAgents(params.limit || 10);
        
        if (!agents || agents.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No Dust agents found. Please check your API key and configuration."
            }]
          };
        }
        
        // Format the response for MCP
        const agentsList = agents.map(agent => 
          `- ${agent.name} (ID: ${agent.id})\n  Description: ${agent.description}\n  Capabilities: ${agent.capabilities.join(", ")}`
        ).join("\n\n");
        
        return {
          content: [{
            type: "text",
            text: `Available Dust Agents:\n\n${agentsList}`
          }],
          metadata: {
            count: agents.length,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error("Error listing Dust agents:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to list Dust agents: ${errorMessage}`);
      }
    }
  );
}
