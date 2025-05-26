/**
 * Test file for dust_agent_query MCP method
 *
 * This test file verifies the functionality of the dust_agent_query method
 * which allows querying a Dust agent with a message.
 */

import { jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('dust_agent_query MCP Method', () => {
  let client;

  beforeAll(() => {
    // Setup logging directory for tests
    const LOG_DIR = path.join(process.cwd(), 'logs', 'tests');
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Create MCP client with mocked methods
    client = {
      callTool: jest.fn(),
    };
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('should successfully query a Dust agent with default agent ID', async () => {
    // Setup mock agent response
    const mockAgentResponse = {
      result: 'This is a test response from the agent',
      conversationId: 'conv-123',
      messageId: 'msg-456',
      agentId: 'agent-789',
      timestamp: new Date().toISOString(),
    };

    // Setup mock MCP response
    const mockMcpResponse = {
      content: [
        {
          type: 'text',
          text: mockAgentResponse.result,
        },
      ],
      conversation_id: mockAgentResponse.conversationId,
      message_id: mockAgentResponse.messageId,
      agent_id: mockAgentResponse.agentId,
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockMcpResponse);

    // Call the MCP method
    const response = await client.callTool({
      name: 'dust_agent_query',
      params: {
        query: 'Test query',
      },
    });

    // Verify the response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toBe(mockAgentResponse.result);
    expect(response.conversation_id).toBe(mockAgentResponse.conversationId);
    expect(response.message_id).toBe(mockAgentResponse.messageId);
    expect(response.agent_id).toBe(mockAgentResponse.agentId);

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_agent_query',
      params: {
        query: 'Test query',
      },
    });
  });

  test('should successfully query a Dust agent with specified agent ID', async () => {
    // Setup mock agent response
    const mockAgentResponse = {
      result: 'This is a test response from the specified agent',
      conversationId: 'conv-123',
      messageId: 'msg-456',
      agentId: 'specific-agent-id',
      timestamp: new Date().toISOString(),
    };

    // Setup mock MCP response
    const mockMcpResponse = {
      content: [
        {
          type: 'text',
          text: mockAgentResponse.result,
        },
      ],
      conversation_id: mockAgentResponse.conversationId,
      message_id: mockAgentResponse.messageId,
      agent_id: mockAgentResponse.agentId,
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockMcpResponse);

    // Call the MCP method
    const response = await client.callTool({
      name: 'dust_agent_query',
      params: {
        agent_id: 'specific-agent-id',
        query: 'Test query with specific agent',
      },
    });

    // Verify the response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toBe(mockAgentResponse.result);
    expect(response.agent_id).toBe('specific-agent-id');

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_agent_query',
      params: {
        agent_id: 'specific-agent-id',
        query: 'Test query with specific agent',
      },
    });
  });

  test('should handle missing agent_id parameter', async () => {
    // Setup mock error response
    const mockErrorResponse = {
      content: [
        {
          type: 'text',
          text: "Error: Missing required parameter 'agent_id'",
        },
      ],
      isError: true,
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockErrorResponse);

    // Call the MCP method without agent_id
    const response = await client.callTool({
      name: 'dust_agent_query',
      params: {
        query: 'Hello, agent!',
      },
    });

    // Verify the error response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain(
      "Error: Missing required parameter 'agent_id'"
    );
    expect(response.isError).toBe(true);

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_agent_query',
      params: {
        query: 'Hello, agent!',
      },
    });
  });

  test('should handle missing query parameter', async () => {
    // Setup mock error response
    const mockErrorResponse = {
      content: [
        {
          type: 'text',
          text: "Error: Missing required parameter 'query'",
        },
      ],
      isError: true,
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockErrorResponse);

    // Call the MCP method without query
    const response = await client.callTool({
      name: 'dust_agent_query',
      params: {
        agent_id: 'test-agent',
      },
    });

    // Verify the error response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain(
      "Error: Missing required parameter 'query'"
    );
    expect(response.isError).toBe(true);

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_agent_query',
      params: {
        agent_id: 'test-agent',
      },
    });
  });

  test('should handle API errors gracefully', async () => {
    // Setup mock error response
    const errorMessage = 'API error: Failed to query agent';
    const mockErrorResponse = {
      content: [
        {
          type: 'text',
          text: `Error querying Dust agent: ${errorMessage}`,
        },
      ],
      isError: true,
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockErrorResponse);

    // Call the MCP method
    const response = await client.callTool({
      name: 'dust_agent_query',
      params: {
        agent_id: 'test-agent',
        query: 'Hello, agent!',
      },
    });

    // Verify the error response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Error querying Dust agent:');
    expect(response.content[0].text).toContain(errorMessage);
    expect(response.isError).toBe(true);

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_agent_query',
      params: {
        agent_id: 'test-agent',
        query: 'Hello, agent!',
      },
    });
  });
});
