import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Import the Dust service functions
import { queryDustAgent, getAgentConfig, listDustAgents } from "../services/dustService.js";

// Load environment variables
dotenv.config();

// Path to processed documents
const PROCESSED_DIR = path.join(process.cwd(), 'processed');

// Type for agent information
type AgentInfo = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  [key: string]: unknown;
};

// Type for document context
type DocumentContext = {
  documentId: string;
  originalName: string;
  fileType: string;
  structuredData: unknown;
  extractedText: string;
  [key: string]: unknown;
};

// Define types for MCP responses
type MCPContent =
  | { type: 'text'; text: string; [key: string]: unknown }
  | { type: 'image'; data: string; mimeType: string; [key: string]: unknown }
  | { type: 'audio'; data: string; mimeType: string; [key: string]: unknown }
  | { type: 'resource'; resource: { text: string; uri: string; mimeType?: string; [key: string]: unknown }; [key: string]: unknown };

// Type for the parameters expected by the query_dust_agent tool
type DustAgentParams = {
  agentId?: string;
  query: string;
  documentIds?: string[];
  context?: Record<string, unknown>;
  conversationId?: string;
  echo?: boolean;
};

// MCPResponse must match the CallToolResult type from MCP SDK
interface MCPResponse {
  [key: string]: unknown;
  content: MCPContent[];
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

// Type for the response from the Dust agent
type DustAgentResponse = {
  result: unknown;
  conversationId?: string;
  timestamp?: string;
  [key: string]: unknown;
};



// Helper function to create a text response
function createTextResponse(text: string, meta: Record<string, unknown> = {}): MCPResponse {
  return {
    content: [{
      type: 'text',
      text
    }],
    _meta: meta
  };
}

// Helper function to create an error response
function createErrorResponse(error: Error | string, meta: Record<string, unknown> = {}): MCPResponse {
  const errorMessage = typeof error === 'string' ? error : error.message;
  return {
    content: [{
      type: 'text',
      text: `Error: ${errorMessage}`
    }],
    isError: true,
    _meta: {
      ...meta,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }
  };
}

// Type guard to check if an object has a specific property
function hasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

const dustAgentTool = (server: McpServer) => {
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

  // Define the schema for the query_dust_agent tool
  const queryDustAgentSchema = {
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
  };

  // Register the query_dust_agent tool with proper type annotations
  server.tool(
    "query_dust_agent",
    "Query a specific Dust agent with a prompt and optional context",
    queryDustAgentSchema,
    async (params: DustAgentParams, extra) => {
      // Get the agent ID to use (either provided or default from environment)
      // Do this early so it's available in error handling
      const agentId = params.agentId || getDefaultAgentId();
      
      try {
        // Check if we should echo the query instead of getting a real response
        if (params.echo) {
          // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`Echo mode enabled, returning query: ${params.query}\n`);
          
          // Format the echo response for MCP
          return createTextResponse(`ECHO: ${params.query}`, {
            echo: true,
            query: params.query,
            agentId: agentId || 'unknown',
            timestamp: new Date().toISOString()
          });
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
        
        // Check if we have a valid agent ID
        if (!agentId) {
          throw new Error("No agent ID provided and no default agent ID found in DUST_AGENT_IDs environment variable");
        }
        
        // Log the parameters we're sending to the Dust agent
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`Querying Dust agent with the following parameters:\n`);
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`  Agent ID: ${agentId}\n`);
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`  Query: ${params.query}\n`);
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`  Context: ${JSON.stringify(context, null, 2)}\n`);
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`  Conversation ID: ${params.conversationId || 'new conversation'}\n`);
        
        // Query the Dust agent using our service
        const response: DustAgentResponse = await queryDustAgent(
          agentId || '',
          params.query,
          context,
          params.conversationId
        ) as DustAgentResponse;
        
        // Log response for debugging (to stderr to avoid interfering with MCP response)
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`Dust agent response: ${JSON.stringify(response, null, 2)}\n`);
        
        // Check if response.result exists
        if (!response.result) {
          // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`Warning: response.result is undefined or null\n`);
          // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`Full response object: ${JSON.stringify(response)}\n`);
        }
        
        // Get the text to display
        const responseText = response.result 
          ? (typeof response.result === "string" 
              ? response.result 
              : JSON.stringify(response.result, null, 2))
          : "No response received from the agent";
        
        // Safely log the response text with null checks
        const safeResponseText = responseText || "";
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`Formatted response text: ${safeResponseText.length > 100 ? safeResponseText.substring(0, 100) + '...' : safeResponseText}\n`);
        
        // Format the response for MCP
        const mcpResponse: MCPResponse = createTextResponse(
          responseText,
          {
            agentId: agentId,
            query: params.query,
            documentIds: params.documentIds,
            conversationId: response.conversationId,
            timestamp: response.timestamp || new Date().toISOString()
          }
        );
        
        // Ensure the response matches the expected MCP format
        if (!mcpResponse.content || !Array.isArray(mcpResponse.content) || mcpResponse.content.length === 0) {
          throw new Error("Failed to format response: Invalid content format");
        }
        
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`MCP response content: ${JSON.stringify(mcpResponse.content)}\n`);
        
        return mcpResponse;
      } catch (error) {
        // Enhanced error logging
        const errorMessage = error instanceof Error ? error.message : String(error);
        // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`Error querying Dust agent: ${errorMessage}\n`);
        
        if (error instanceof Error && error.stack) {
          // [MCP POLICY] STDIO logging is disabled. This log is ignored.
// process.stderr.write(`Stack trace: ${error.stack}\n`);
        }
        
        // Format error response for MCP
        const errorObj = error instanceof Error ? error : new Error(String(error));
        return createErrorResponse(errorObj, {
          stack: errorObj.stack,
          query: params.query,
          agentId: agentId,
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Schema for querying multiple agents with proper type definitions
  const queryMultipleAgentsSchema = z.object({
    agentIds: z.array(z.string(), {
      description: "Array of agent IDs to query"
    }),
    query: z.string({
      description: "The query to send to the agents"
    }),
    documentIds: z.array(z.string(), {
      description: "Optional array of document IDs to include as context"
    }).optional(),
    context: z.record(z.any(), {
      description: "Optional additional context to include with the query"
    }).optional().default({}),
    conversationId: z.string({
      description: "Optional conversation ID for continuing a previous conversation"
    }).optional(),
    echo: z.boolean({
      description: "If true, echo back the query instead of getting real responses"
    }).optional().default(false)
  });

  // Register the tool for querying multiple agents
  server.tool(
    'query_multiple_agents',
    'Query multiple Dust agents with the same prompt and context',
    queryMultipleAgentsSchema.shape,
    async (params) => {
      type QueryMultipleAgentsParams = z.infer<typeof queryMultipleAgentsSchema>;
      const typedParams = params as QueryMultipleAgentsParams;
      // Determine which agents to query
      let agentIds = params.agentIds && params.agentIds.length > 0 
        ? params.agentIds 
        : (await listDustAgents()).map(agent => agent.id);

      // Prepare context (including documents if provided)
      const context = params.context || {};
      
      if (params.documentIds?.length) {
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
        
        Object.assign(context, {
          documents: documentContexts.map(doc => ({
            id: doc.documentId,
            name: doc.originalName,
            type: doc.fileType,
            data: doc.structuredData,
            text: doc.extractedText
          }))
        });
      }

      // Query each agent in parallel
      const results = await Promise.all(
        agentIds.map(async (agentId) => {
          try {
            // Optionally echo
            if (params.echo) {
              return {
                agentId,
                content: [{ type: "text" as const, text: `ECHO: ${params.query}` }],
                _meta: { echo: true, query: params.query, agentId, timestamp: new Date().toISOString() }
              };
            }
            
            const response = await queryDustAgent(
              agentId,
              params.query,
              context,
              params.conversationId
            );
            
            return {
              agentId,
              ...response
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              agentId,
              content: [{ type: "text" as const, text: `Error querying agent ${agentId}: ${errorMessage}` }],
              isError: true,
              _meta: { error: errorMessage, agentId, timestamp: new Date().toISOString() }
            };
          }
        })
      );
      
      return {
        content: [{
          type: "text",
          text: `Queried ${results.length} agents. ${results.filter(r => r?.isError).length} had errors.`
        }],
        results,
        _meta: {
          totalAgents: results.length,
          successfulQueries: results.filter(r => !r?.isError).length,
          failedQueries: results.filter(r => r?.isError).length,
          timestamp: new Date().toISOString()
        }
      };
    }
  );

  // Define the schema for getting agent information
    const getAgentInfoSchema = {
      agentId: z.string({
        description: "ID of the Dust agent to get information about"
      })
    };

  // Define the schema for listing available agents
  const listAgentsSchema = {
    limit: z.number({
      description: 'Maximum number of agents to return',
    }).optional().default(10),
    offset: z.number({
      description: 'Number of agents to skip',
    }).optional().default(0),
    filter: z.object({
      capabilities: z.array(z.string(), {
        description: 'Filter agents by capabilities'
      }).optional()
    }).optional()
  };

  // Type for agent info parameters
  type GetAgentInfoParams = {
    agentId: string;
  };

  // Type for list agents parameters
  type ListAgentsParams = {
    limit?: number;
    offset?: number;
    filter?: {
      capabilities?: string[];
    };
  };

  // Register the tool for listing available agents
  server.tool(
    'list_dust_agents',
    'List all available Dust agents',
    listAgentsSchema,
    async (params: ListAgentsParams) => {
      try {
        // Get list of agents with pagination
        const agents = await listDustAgents();
        
        if (!agents || agents.length === 0) {
          return createTextResponse("No Dust agents found. Please check your API key and configuration.");
        }
        
        // Apply pagination
        const start = Math.min(params.offset || 0, agents.length);
        const end = Math.min(start + (params.limit || 10), agents.length);
        let filteredAgents = agents.slice(start, end);
        
        // Apply filters if provided
        if (params.filter?.capabilities?.length) {
          const requiredCaps = new Set(params.filter.capabilities);
          filteredAgents = filteredAgents.filter(agent =>
            agent.capabilities.some((cap: string) => requiredCaps.has(cap))
          );
        }
        
        if (filteredAgents.length === 0) {
          return createTextResponse("No agents match the specified filters.");
        }
        
        // Format the response
        const agentsList = filteredAgents.map(agent => 
          `- ${agent.name} (ID: ${agent.id})\n  Description: ${agent.description}\n  Capabilities: ${agent.capabilities.join(", ")}`
        ).join("\n\n");
        
        return createTextResponse(
          `Found ${filteredAgents.length} agents (showing ${start + 1}-${Math.min(start + filteredAgents.length, agents.length)} of ${agents.length}):\n\n${agentsList}`,
          { 
            total: agents.length, 
            filtered: filteredAgents.length,
            limit: params.limit, 
            offset: params.offset,
            timestamp: new Date().toISOString()
          }
        );
      } catch (error) {
        return createErrorResponse(
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'list_dust_agents' }
        );
      }
    }
  );

  // Register the tool for getting agent information
  server.tool(
    "get_dust_agent_info",
    "Get information about a specific Dust agent",
    getAgentInfoSchema,
    async (params: GetAgentInfoParams) => {
      try {
        const agent = await getAgentConfig(params.agentId);
        if (!agent) {
          return createErrorResponse(`Agent with ID ${params.agentId} not found`, { agentId: params.agentId });
        }
        
        return createTextResponse(
          `Agent: ${agent.name}\nID: ${agent.id}\nDescription: ${agent.description}\nCapabilities: ${agent.capabilities.join(", ")}`,
          { agentId: agent.id }
        );
      } catch (error) {
        return createErrorResponse(error as Error, { agentId: params.agentId });
      }
    }
  );
};

export default dustAgentTool;
