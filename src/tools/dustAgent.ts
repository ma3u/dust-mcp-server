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
  // Function to get the default agent ID from environment
  function getDefaultAgentId(): string | null {
    const agentIdsString = process.env.DUST_AGENT_IDs;
    if (!agentIdsString) {
      return null;
    }
    
    // Parse the comma-separated list and get the first agent ID
    const agentIds = agentIdsString.split(',').map(id => id.trim());
    if (agentIds.length === 0) {
      return null;
    }
    
    return agentIds[0];
  }

  server.tool(
    "query_dust_agent",
    "Query a specific Dust agent with a prompt and optional context",
    {
      agentId: z.string({
        description: "ID of the Dust agent to query (optional, will use the first agent from DUST_AGENT_IDs if not provided)"
      }).optional(),
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
      }).optional(),
      echo: z.boolean({
        description: "If true, echo back the query instead of getting a real response from the agent (for testing)"
      }).optional()
    },
    async (params) => {
      try {
        // Check if we should echo the query instead of getting a real response
        if (params.echo) {
          process.stderr.write(`Echo mode enabled, returning query: ${params.query}\n`);
          
          // Format the echo response for MCP - ensure it matches the expected MCP response type
          // This must be valid JSON for the MCP protocol
          return {
            content: [{
              type: "text" as const,
              text: `ECHO: ${params.query}`
            }],
            _meta: {
              echo: true,
              query: params.query,
              timestamp: new Date().toISOString()
            }
          };
        }
        
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
        
        // Get the agent ID to use (either provided or default from environment)
        const agentId = params.agentId || getDefaultAgentId();
        
        // Check if we have a valid agent ID
        if (!agentId) {
          throw new Error("No agent ID provided and no default agent ID found in DUST_AGENT_IDs environment variable");
        }
        
        // Log the parameters we're sending to the Dust agent
        process.stderr.write(`Querying Dust agent with the following parameters:\n`);
        process.stderr.write(`  Agent ID: ${agentId}\n`);
        process.stderr.write(`  Query: ${params.query}\n`);
        process.stderr.write(`  Context: ${JSON.stringify(context, null, 2)}\n`);
        process.stderr.write(`  Conversation ID: ${params.conversationId || 'new conversation'}\n`);
        
        // Query the Dust agent using our service
        const response = await queryDustAgent(
          agentId,
          params.query,
          context,
          params.conversationId
        );
        
        // Log response for debugging (to stderr to avoid interfering with MCP response)
        process.stderr.write(`Dust agent response: ${JSON.stringify(response, null, 2)}\n`);
        
        // Check if response.result exists
        if (!response.result) {
          process.stderr.write(`Warning: response.result is undefined or null\n`);
          process.stderr.write(`Full response object: ${JSON.stringify(response)}\n`);
        }
        
        // Get the text to display
        const responseText = typeof response.result === "string" 
          ? response.result 
          : (response.result ? JSON.stringify(response.result, null, 2) : "");
        
        // Safely log the response text with null checks
        const safeResponseText = responseText || "";
        process.stderr.write(`Formatted response text: ${safeResponseText.length > 100 ? safeResponseText.substring(0, 100) + '...' : safeResponseText}\n`);
        
        // Format the response for MCP - ensure it matches the expected MCP response type
        const mcpResponse = {
          content: [{
            type: "text" as const,  // Use const assertion to ensure correct type
            text: responseText || "No response from agent. Please check the logs."
          }],
          // Move metadata into _meta to match MCP expected format
          _meta: {
            agentId: agentId, // Use the resolved agent ID
            query: params.query,
            documentIds: params.documentIds,
            conversationId: response.conversationId,
            timestamp: response.timestamp
          }
        };
        
        process.stderr.write(`MCP response content: ${JSON.stringify(mcpResponse.content)}\n`);
        
        return mcpResponse;
      } catch (error) {
        // Enhanced error logging
        process.stderr.write(`Error querying Dust agent: ${error instanceof Error ? error.message : String(error)}\n`);
        
        if (error instanceof Error && error.stack) {
          process.stderr.write(`Error stack trace: ${error.stack}\n`);
        }
        
        // Log additional error details if available
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as any;
          if (axiosError.response) {
            process.stderr.write(`Error response status: ${axiosError.response.status}\n`);
            process.stderr.write(`Error response data: ${JSON.stringify(axiosError.response.data)}\n`);
          }
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Return a properly formatted error response instead of throwing
        return {
          content: [{
            type: "text" as const,
            text: `Failed to query Dust agent: ${errorMessage}`
          }],
          isError: true,
          _meta: {
            error: errorMessage,
            query: params.query,
            agentId: params.agentId || getDefaultAgentId() || "unknown"
          }
        };
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
      focusArea: z.enum(["summary", "details", "overview", "trends"], {
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
        if (params.focusArea === "summary") {
          query = "Analyze documents and provide a concise summary";
        } else if (params.focusArea === "details") {
          query = "Analyze documents and extract detailed information";
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
            focusArea: params.focusArea || "overview",
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
        const agents = await listDustAgents(undefined, params.limit || 10);
        
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
