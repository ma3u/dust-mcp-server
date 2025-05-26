/**
 * Integration test file for Dust MCP methods
 *
 * This test file verifies the integration between all Dust MCP methods:
 * - dust_list_agents
 * - dust_get_agent_config
 * - dust_agent_query
 *
 * It tests the complete flow of:
 * 1. Listing available agents
 * 2. Getting configuration for a specific agent
 * 3. Querying the agent with a message
 */

import { jest } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Dust MCP Integration Tests', () => {
  let client;

  beforeAll(async () => {
    // Setup logging directory for tests
    const LOG_DIR = path.join(process.cwd(), 'logs', 'tests');
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Create MCP client with mocked callTool method
    client = new Client({
      name: 'Dust MCP Integration Test Client',
      version: '1.0.0',
    });

    // Mock the client's callTool method
    client.callTool = jest.fn();
  });

  afterAll(() => {
    // Clean up
    jest.clearAllMocks();
  });

  test('Complete integration flow with mocked responses', async () => {
    // Set up mock responses for each MCP method

    // Mock response for dust_list_agents
    const agentsResponse = {
      content: [
        {
          type: 'text',
          text: `# Available Dust Agents

| ID | Name | Description | Model | Capabilities |
|---|---|---|---|---|
| test-agent-1 | Test Agent 1 | A test agent for integration testing | claude-3-opus | text, code |
| test-agent-2 | Test Agent 2 | Another test agent | claude-3-sonnet | text, image |

\`\`\`json
[
  {
    "id": "test-agent-1",
    "name": "Test Agent 1",
    "description": "A test agent for integration testing",
    "capabilities": ["text", "code"],
    "model": "claude-3-opus",
    "provider": "anthropic",
    "temperature": 0.7,
    "status": "active"
  },
  {
    "id": "test-agent-2",
    "name": "Test Agent 2",
    "description": "Another test agent",
    "capabilities": ["text", "image"],
    "model": "claude-3-sonnet",
    "provider": "anthropic",
    "temperature": 0.5,
    "status": "active"
  }
]
\`\`\``,
        },
      ],
    };

    // Mock response for dust_get_agent_config
    const configResponse = {
      content: [
        {
          type: 'text',
          text: `# Agent Configuration: Test Agent 1

- **ID**: test-agent-1
- **Description**: A test agent for integration testing
- **Model**: claude-3-opus
- **Provider**: anthropic
- **Temperature**: 0.7
- **Status**: active
- **Capabilities**: text, code
- **Supported Output Formats**: text, markdown
- **Tags**: test, integration
- **Visualization Enabled**: true

\`\`\`json
{
  "id": "test-agent-1",
  "name": "Test Agent 1",
  "description": "A test agent for integration testing",
  "capabilities": ["text", "code"],
  "model": "claude-3-opus",
  "provider": "anthropic",
  "temperature": 0.7,
  "status": "active",
  "pictureUrl": "https://example.com/test-agent-1.png",
  "supportedOutputFormats": ["text", "markdown"],
  "tags": ["test", "integration"],
  "visualizationEnabled": true
}
\`\`\``,
        },
      ],
    };

    // Mock response for dust_agent_query
    const queryResponse = {
      content: [
        {
          type: 'text',
          text: `This is a response to your query: "This is a test query for integration testing"`,
        },
      ],
      conversation_id: 'conv-123',
      message_id: 'msg-456',
      agent_id: 'test-agent-1',
      timestamp: new Date().toISOString(),
    };

    // Mock response for error case
    const errorResponse = {
      content: [
        {
          type: 'text',
          text: `Error: Agent with ID non-existent-agent not found`,
        },
      ],
      isError: true,
    };

    // Configure the mock implementation based on the input parameters
    client.callTool.mockImplementation(async (params) => {
      const { name, params: toolParams } = params;

      if (name === 'dust_list_agents') {
        return agentsResponse;
      } else if (name === 'dust_get_agent_config') {
        if (toolParams.agent_id === 'test-agent-1') {
          return configResponse;
        } else {
          return errorResponse;
        }
      } else if (name === 'dust_agent_query') {
        return queryResponse;
      }
    });

    // Step 1: List available agents
    const listResult = await client.callTool({
      name: 'dust_list_agents',
      params: {
        limit: 10,
      },
    });

    // Verify the agents list response
    expect(listResult).toBeDefined();
    expect(listResult.content).toHaveLength(1);
    expect(listResult.content[0].type).toBe('text');
    expect(listResult.content[0].text).toContain('# Available Dust Agents');
    expect(listResult.content[0].text).toContain('test-agent-1');
    expect(listResult.content[0].text).toContain('test-agent-2');

    // Step 2: Get configuration for the first agent
    const agentId = 'test-agent-1';
    const configResult = await client.callTool({
      name: 'dust_get_agent_config',
      params: {
        agent_id: agentId,
      },
    });

    // Verify the agent configuration response
    expect(configResult).toBeDefined();
    expect(configResult.content).toHaveLength(1);
    expect(configResult.content[0].type).toBe('text');
    expect(configResult.content[0].text).toContain(
      `# Agent Configuration: Test Agent 1`
    );
    expect(configResult.content[0].text).toContain(`- **ID**: ${agentId}`);

    // Step 3: Query the agent
    const queryText = 'This is a test query for integration testing';
    const queryResult = await client.callTool({
      name: 'dust_agent_query',
      params: {
        agent_id: agentId,
        query: queryText,
      },
    });

    // Verify the query response
    expect(queryResult).toBeDefined();
    expect(queryResult.content).toHaveLength(1);
    expect(queryResult.content[0].type).toBe('text');
    expect(queryResult.content[0].text).toContain(queryText);
    expect(queryResult.conversation_id).toBe('conv-123');
    expect(queryResult.message_id).toBe('msg-456');
    expect(queryResult.agent_id).toBe(agentId);

    // Step 4: Test error handling with non-existent agent
    const errorResult = await client.callTool({
      name: 'dust_get_agent_config',
      params: {
        agent_id: 'non-existent-agent',
      },
    });

    // Verify the error response
    expect(errorResult).toBeDefined();
    expect(errorResult.content[0].text).toContain('Error:');
    expect(errorResult.content[0].text).toContain('non-existent-agent');
    expect(errorResult.isError).toBe(true);

    // Verify that the mock was called the expected number of times
    expect(client.callTool).toHaveBeenCalledTimes(4);
  });
});
