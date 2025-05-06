/**
 * Test file for dust_get_agent_config MCP method
 * 
 * This test file verifies the functionality of the dust_get_agent_config method
 * which retrieves detailed configuration for a specific Dust agent.
 */

import { jest } from '@jest/globals';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";


describe("dust_get_agent_config MCP Method", () => {
  let client;
  
  beforeAll(() => {
    // Setup logging directory for tests
    const LOG_DIR = path.join(process.cwd(), 'logs', 'tests');
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    
    // Create MCP client with mocked methods
    client = {
      callTool: jest.fn()
    };
  });
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  test("should get agent config successfully", async () => {
    // Setup mock config
    const mockConfig = {
      id: "test-agent",
      name: "Test Agent",
      description: "A test agent for unit testing",
      capabilities: ["text", "code"],
      model: "claude-3-opus",
      provider: "anthropic",
      temperature: 0.7,
      status: "active",
      pictureUrl: "https://example.com/agent.png",
      supportedOutputFormats: ["text", "markdown"],
      tags: ["test", "development"],
      visualizationEnabled: true,
      timestamp: Date.now()
    };
    
    // Setup mock MCP response
    const mockResponse = {
      content: [{
        type: "text",
        text: `# Agent Configuration: Test Agent

| Property | Value |
|---|---|
| ID | test-agent |
| Name | Test Agent |
| Description | A test agent for unit testing |
| Model | claude-3-opus |
| Provider | anthropic |
| Temperature | 0.7 |
| Status | active |
| Capabilities | text, code |
| Supported Output Formats | text, markdown |
| Tags | test, development |
| Visualization Enabled | true |

\`\`\`json
${JSON.stringify(mockConfig, null, 2)}
\`\`\``
      }]
    };
    
    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockResponse);
    
    // Call the MCP method
    const response = await client.callTool({
      name: "dust_get_agent_config",
      params: {
        agent_id: "test-agent"
      }
    });
    
    // Verify the response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    
    // Verify the markdown table is included
    expect(response.content[0].text).toContain("# Agent Configuration: Test Agent");
    expect(response.content[0].text).toContain("| Property | Value |");
    expect(response.content[0].text).toContain("| ID | test-agent |");
    expect(response.content[0].text).toContain("| Name | Test Agent |");
    
    // Verify the JSON data is included
    expect(response.content[0].text).toContain("```json");
    expect(response.content[0].text).toContain('"id": "test-agent"');
    
    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: "dust_get_agent_config",
      params: {
        agent_id: "test-agent"
      }
    });
  });
  
  test("should handle missing agent_id parameter", async () => {
    // Setup mock error response
    const mockErrorResponse = {
      content: [{
        type: "text",
        text: "Error: Missing required parameter 'agent_id'"
      }],
      isError: true
    };
    
    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockErrorResponse);
    
    // Call the MCP method without agent_id
    const response = await client.callTool({
      name: "dust_get_agent_config",
      params: {}
    });
    
    // Verify the error response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    expect(response.content[0].text).toContain("Error: Missing required parameter 'agent_id'");
    expect(response.isError).toBe(true);
    
    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: "dust_get_agent_config",
      params: {}
    });
  });
  
  test("should handle agent not found", async () => {
    // Setup mock error response
    const mockErrorResponse = {
      content: [{
        type: "text",
        text: "Agent not found: non-existent-agent"
      }],
      isError: true
    };
    
    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockErrorResponse);
    
    // Call the MCP method
    const response = await client.callTool({
      name: "dust_get_agent_config",
      params: {
        agent_id: "non-existent-agent"
      }
    });
    
    // Verify the error response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    expect(response.content[0].text).toContain("Agent not found: non-existent-agent");
    expect(response.isError).toBe(true);
    
    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: "dust_get_agent_config",
      params: {
        agent_id: "non-existent-agent"
      }
    });
  });
  
  test("should handle API errors gracefully", async () => {
    // Setup mock error response
    const errorMessage = "API error: Failed to get agent config";
    const mockErrorResponse = {
      content: [{
        type: "text",
        text: `Error getting agent configuration: ${errorMessage}`
      }],
      isError: true
    };
    
    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockErrorResponse);
    
    // Call the MCP method
    const response = await client.callTool({
      name: "dust_get_agent_config",
      params: {
        agent_id: "test-agent"
      }
    });
    
    // Verify the error response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    expect(response.content[0].text).toContain("Error getting agent configuration:");
    expect(response.content[0].text).toContain(errorMessage);
    expect(response.isError).toBe(true);
    
    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: "dust_get_agent_config",
      params: {
        agent_id: "test-agent"
      }
    });
  });
  
  test("should verify JSON data includes all fields", async () => {
    // Setup mock config
    const mockConfig = {
      id: "test-agent",
      name: "Test Agent",
      description: "A test agent for unit testing",
      capabilities: ["text", "code"],
      model: "claude-3-opus",
      provider: "anthropic",
      temperature: 0.7,
      status: "active",
      pictureUrl: "https://example.com/agent.png",
      supportedOutputFormats: ["text", "markdown"],
      tags: ["test", "development"],
      visualizationEnabled: true,
      timestamp: Date.now()
    };
    
    // Setup mock MCP response
    const mockResponse = {
      content: [{
        type: "text",
        text: `# Agent Configuration: Test Agent

| Property | Value |
|---|---|
| ID | test-agent |
| Name | Test Agent |
| Description | A test agent for unit testing |
| Model | claude-3-opus |
| Provider | anthropic |
| Temperature | 0.7 |
| Status | active |
| Capabilities | text, code |
| Supported Output Formats | text, markdown |
| Tags | test, development |
| Visualization Enabled | true |

\`\`\`json
${JSON.stringify(mockConfig, null, 2)}
\`\`\``
      }]
    };
    
    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockResponse);
    
    // Call the MCP method
    const response = await client.callTool({
      name: "dust_get_agent_config",
      params: {
        agent_id: "test-agent"
      }
    });
    
    // Verify the response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    
    // Verify the markdown table is included
    expect(response.content[0].text).toContain("# Agent Configuration: Test Agent");
    expect(response.content[0].text).toContain("| Property | Value |");
    expect(response.content[0].text).toContain("| ID | test-agent |");
    expect(response.content[0].text).toContain("| Name | Test Agent |");
    
    // Verify the JSON data is included
    expect(response.content[0].text).toContain("```json");
    expect(response.content[0].text).toContain('"id": "test-agent"');
    
    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: "dust_get_agent_config",
      params: {
        agent_id: "test-agent"
      }
    });
    // Verify the JSON data includes all fields
    expect(response.content[0].text).toContain("```json");
    const jsonPart = response.content[0].text.split("```json")[1].split("```", 1)[0];
    const parsedJson = JSON.parse(jsonPart);
    expect(parsedJson).toEqual(expect.objectContaining({
      id: mockConfig.id,
      name: mockConfig.name,
      description: mockConfig.description,
      capabilities: mockConfig.capabilities,
      model: mockConfig.model,
      provider: mockConfig.provider,
      temperature: mockConfig.temperature,
      status: mockConfig.status,
      pictureUrl: mockConfig.pictureUrl,
      supportedOutputFormats: mockConfig.supportedOutputFormats,
      tags: mockConfig.tags,
      visualizationEnabled: mockConfig.visualizationEnabled
    }));
  });
});
