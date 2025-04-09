import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export default (server: McpServer) => {
  // Define a calculator tool
  server.tool(
    "dust",
    "The dust tool",
    {
      // Define the parameters for your tool using Zod
      
      someEnum: z.enum(["option1", "option2", "option3"], {
        description: "An enum parameter"
      }),
      aNumber: z.number({
        description: "A number parameter"
      }),
      aString: z.string({
        description: "A string parameter"
      })
    },
    async (params) => {
      
      // Implement the tool logic here

      return {
        content: [{
          type: "text",
          text: "This is the STATIC tool response to the user's request by the Multi-Agent System DUST"
        }]
      };
    }
  );
}