// Test script for dust.ts functionality
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import registerDustTools from "./build/dust.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.log("Testing Dust API integration...");
  
  // Create a mock MCP server to register the tools
  const mockServer = {
    tool: (name, description, schema, handler) => {
      console.log(`Registered tool: ${name}`);
      // Store the handler for testing
      mockServer.tools[name] = handler;
    },
    tools: {}
  };
  
  // Register dust tools
  registerDustTools(mockServer);
  
  // Get the first agent ID from environment variable
  const agentIdsString = process.env.DUST_AGENT_IDs;
  if (!agentIdsString) {
    console.error("DUST_AGENT_IDs is not set in environment variables");
    process.exit(1);
  }
  
  const agentId = agentIdsString.split(',')[0].trim();
  console.log(`Using agent ID: ${agentId}`);
  
  try {
    // Test the dust_agent_query tool
    console.log("Querying Dust agent...");
    const response = await mockServer.tools.dust_agent_query({
      agentId,
      query: "Give me a summary",
      context: {
        username: process.env.DUST_USERNAME || "Test User",
        timezone: "UTC"
      }
    });
    
    console.log("Response from Dust agent:");
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Error testing Dust API:", error);
  }
}

main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
