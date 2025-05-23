import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { queryDustAgent, getAgentConfig, listDustAgents, AgentConfig } from "./services/dustService.js";

// Load environment variables
dotenv.config();

// Setup logging directory
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logger function that doesn't interfere with STDIO
function logger(level: string, message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  
  // Write to log file
  fs.appendFileSync(path.join(LOG_DIR, `mcp-${new Date().toISOString().split('T')[0]}.log`), logMessage + '\n');
  
  // [MCP POLICY] STDIO logging is disabled. Only log to file.
}

export default (server: McpServer) => {
  // Register the single agent query tool
  server.tool(
    "dust_agent_query",
    {
      description: "Query a Dust agent with a message",
      parameters: z.object({
        agent_id: z.string().optional().describe("ID of the agent to query (optional, will use default if not provided)"),
        query: z.string().describe("Message to send to the agent"),
        conversation_id: z.string().optional().describe("Optional conversation ID to continue an existing conversation"),
        context: z.record(z.any()).optional().describe("Optional context for the agent")
      })
    },
    async ({ agent_id, query, conversation_id, context }) => {
      logger('INFO', 'Received dust_agent_query request', { agent_id, query_length: query.length, conversation_id });
      
      try {
        // Use the imported queryDustAgent function from the service
        const result = await queryDustAgent(
          agent_id || null,
          query,
          context || {},
          conversation_id
        );
        
        logger('INFO', 'Successfully queried Dust agent', { 
          agent_id: result.agentId,
          conversation_id: result.conversationId,
          message_id: result.messageId
        });
        
        // Format response according to MCP SDK requirements
        return {
          content: [
            {
              type: "text",
              text: result.result
            }
          ],
          // Include metadata in the response
          conversation_id: result.conversationId,
          message_id: result.messageId,
          agent_id: result.agentId,
          timestamp: result.timestamp
        };
      } catch (error: any) {
        logger('ERROR', 'Error in dust_agent_query', error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
  );
  
  // Register the list agents tool
  server.tool(
    "dust_list_agents",
    {
      description: "List available Dust agents",
      parameters: z.object({
        view: z.string().optional().describe("Optional view type for filtering agents"),
        limit: z.number().optional().describe("Maximum number of agents to return")
      })
    },
    async ({ view, limit }) => {
      logger('INFO', 'Received dust_list_agents request', { view, limit });
      
      try {
        // Use the imported listDustAgents function from the service
        const agents = await listDustAgents(view, limit);
        
        logger('INFO', `Successfully listed ${agents.length} Dust agents`);
        
        // Format the agent list as a markdown table for better readability
        let agentTable = "# Available Dust Agents\n\n";
        agentTable += "| ID | Name | Description | Model | Capabilities |\n";
        agentTable += "|---|---|---|---|---|\n";
        
        agents.forEach(agent => {
          const capabilities = agent.capabilities.join(", ");
          agentTable += `| ${agent.id} | ${agent.name} | ${agent.description} | ${agent.model || 'N/A'} | ${capabilities} |\n`;
        });
        
        // Also include the raw data as JSON for programmatic access
        const agentData = JSON.stringify(agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          capabilities: agent.capabilities,
          model: agent.model,
          provider: agent.provider,
          temperature: agent.temperature,
          status: agent.status,
          pictureUrl: agent.pictureUrl,
          supportedOutputFormats: agent.supportedOutputFormats,
          tags: agent.tags,
          visualizationEnabled: agent.visualizationEnabled
        })), null, 2);
        
        return {
          content: [
            {
              type: "text",
              text: agentTable + "\n\n```json\n" + agentData + "\n```"
            }
          ]
        };
      } catch (error: any) {
        logger('ERROR', 'Error in dust_list_agents', error);
        return {
          content: [
            {
              type: "text",
              text: `Error listing Dust agents: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
  );
  
  // Register the get agent config tool
  server.tool(
    "dust_get_agent_config",
    {
      description: "Get configuration for a specific Dust agent",
      parameters: z.object({
        agent_id: z.string().describe("ID of the agent to get configuration for")
      })
    },
    async ({ agent_id }) => {
      logger('INFO', 'Received dust_get_agent_config request', { agent_id });
      
      try {
        // Use the imported getAgentConfig function from the service
        const config = await getAgentConfig(agent_id);
        
        if (!config) {
          throw new Error(`Agent with ID ${agent_id} not found`);
        }
        
        logger('INFO', `Successfully retrieved configuration for agent ${agent_id}`);
        
        const agentConfig = {
          id: config.id,
          name: config.name,
          description: config.description,
          capabilities: config.capabilities,
          model: config.model,
          provider: config.provider,
          temperature: config.temperature,
          status: config.status,
          pictureUrl: config.pictureUrl,
          supportedOutputFormats: config.supportedOutputFormats || [],
          tags: config.tags || [],
          visualizationEnabled: config.visualizationEnabled
        };
        
        // Format the agent configuration as markdown for better readability
        let configText = `# Agent Configuration: ${config.name}\n\n`;
        configText += `- **ID**: ${config.id}\n`;
        configText += `- **Description**: ${config.description}\n`;
        configText += `- **Model**: ${config.model || 'N/A'}\n`;
        configText += `- **Provider**: ${config.provider || 'N/A'}\n`;
        configText += `- **Temperature**: ${config.temperature !== undefined ? config.temperature : 'N/A'}\n`;
        configText += `- **Status**: ${config.status || 'N/A'}\n\n`;
        
        configText += `## Capabilities\n\n`;
        if (config.capabilities.length > 0) {
          config.capabilities.forEach(capability => {
            configText += `- ${capability}\n`;
          });
        } else {
          configText += `- No capabilities listed\n`;
        }
        
        configText += `\n## Supported Output Formats\n\n`;
        if (config.supportedOutputFormats && config.supportedOutputFormats.length > 0) {
          config.supportedOutputFormats.forEach(format => {
            configText += `- ${format}\n`;
          });
        } else {
          configText += `- No output formats listed\n`;
        }
        
        // Include the raw JSON data for programmatic access
        configText += `\n\n\`\`\`json\n${JSON.stringify(agentConfig, null, 2)}\n\`\`\``;
        
        return {
          content: [
            {
              type: "text",
              text: configText
            }
          ]
        };
      } catch (error: any) {
        logger('ERROR', 'Error in dust_get_agent_config', error);
        return {
          content: [
            {
              type: "text",
              text: `Error: Failed to get agent configuration: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
  );
};
