import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dust from "./dust.js";

// Initialize server
const server = new McpServer({
  name: ".",
  version: "1.0.0"
});

// === Start server with stdio transport ===
// Initialize the dust component
dust(server);

const transport = new StdioServerTransport();
await server.connect(transport);
