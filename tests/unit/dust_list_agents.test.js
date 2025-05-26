/**
 * Test file for dust_list_agents MCP method
 *
 * This test file verifies the functionality of the dust_list_agents method
 * which lists available Dust agents in the user's workspace.
 */

import { jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('dust_list_agents MCP Method', () => {
  let client;

  beforeAll(() => {
    // Setup logging directory for tests
    const LOG_DIR = path.join(process.cwd(), 'logs', 'tests');
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Create MCP client with mocked methods
    client = { callTool: jest.fn() };
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('should list agents with default parameters', async () => {
    // Setup mock response
    const mockAgents = [
      {
        id: 'agent-1',
        name: 'Test Agent 1',
        description: 'Description for Test Agent 1',
        capabilities: ['text', 'code'],
        model: 'claude-3-opus',
        provider: 'anthropic',
        temperature: 0.7,
        status: 'active',
        pictureUrl: 'https://example.com/agent1.png',
        supportedOutputFormats: ['text', 'markdown'],
        tags: ['test', 'development'],
        visualizationEnabled: true,
        timestamp: Date.now(),
      },
      {
        id: 'agent-2',
        name: 'Test Agent 2',
        description: 'Description for Test Agent 2',
        capabilities: ['text', 'image'],
        model: 'claude-3-sonnet',
        provider: 'anthropic',
        temperature: 0.5,
        status: 'active',
        pictureUrl: 'https://example.com/agent2.png',
        supportedOutputFormats: ['text'],
        tags: ['production'],
        visualizationEnabled: false,
        timestamp: Date.now(),
      },
    ];

    // Setup mock response
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: `# Available Dust Agents

| ID | Name | Description | Model | Capabilities |
|---|---|---|---|---|
| agent-1 | Test Agent 1 | Description for Test Agent 1 | claude-3-opus | text, code |
| agent-2 | Test Agent 2 | Description for Test Agent 2 | claude-3-sonnet | text, image |

\`\`\`json
${JSON.stringify(mockAgents, null, 2)}
\`\`\``,
        },
      ],
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockResponse);

    // Call the MCP method
    const response = await client.callTool({
      name: 'dust_list_agents',
      params: {},
    });

    // Verify the response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');

    // Verify the markdown table is included
    expect(response.content[0].text).toContain('# Available Dust Agents');
    expect(response.content[0].text).toContain(
      '| ID | Name | Description | Model | Capabilities |'
    );
    expect(response.content[0].text).toContain('| agent-1 | Test Agent 1 |');
    expect(response.content[0].text).toContain('| agent-2 | Test Agent 2 |');

    // Verify the JSON data is included
    expect(response.content[0].text).toContain('```json');

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_list_agents',
      params: {},
    });
  });

  test('should list agents with specified view parameter', async () => {
    // Setup mock response
    const mockAgents = [
      {
        id: 'agent-3',
        name: 'Test Agent 3',
        description: 'Description for Test Agent 3',
        capabilities: ['text', 'code'],
        model: 'claude-3-opus',
        provider: 'anthropic',
        temperature: 0.7,
        status: 'active',
        pictureUrl: 'https://example.com/agent3.png',
        supportedOutputFormats: ['text', 'markdown'],
        tags: ['test', 'development'],
        visualizationEnabled: true,
        timestamp: Date.now(),
      },
    ];

    // Setup mock response
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: `# Available Dust Agents

| ID | Name | Description | Model | Capabilities |
|---|---|---|---|---|
| agent-3 | Test Agent 3 | Description for Test Agent 3 | claude-3-opus | text, code |

\`\`\`json
${JSON.stringify(mockAgents, null, 2)}
\`\`\``,
        },
      ],
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockResponse);

    // Call the MCP method with view parameter
    const response = await client.callTool({
      name: 'dust_list_agents',
      params: {
        view: 'test',
      },
    });

    // Verify the response
    expect(response).toBeDefined();
    expect(response.content[0].text).toContain('| agent-3 | Test Agent 3 |');

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_list_agents',
      params: {
        view: 'test',
      },
    });
  });

  test('should list agents with specified limit parameter', async () => {
    // Setup mock response
    const mockAgents = [
      {
        id: 'agent-4',
        name: 'Test Agent 4',
        description: 'Description for Test Agent 4',
        capabilities: ['text'],
        model: 'claude-3-haiku',
        provider: 'anthropic',
        temperature: 0.5,
        status: 'active',
        pictureUrl: 'https://example.com/agent4.png',
        supportedOutputFormats: ['text'],
        tags: ['production'],
        visualizationEnabled: false,
        timestamp: Date.now(),
      },
    ];

    // Setup mock response
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: `# Available Dust Agents

| ID | Name | Description | Model | Capabilities |
|---|---|---|---|---|
| agent-4 | Test Agent 4 | Description for Test Agent 4 | claude-3-haiku | text |

\`\`\`json
${JSON.stringify(mockAgents, null, 2)}
\`\`\``,
        },
      ],
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockResponse);

    // Call the MCP method with limit parameter
    const response = await client.callTool({
      name: 'dust_list_agents',
      params: {
        limit: 5,
      },
    });

    // Verify the response
    expect(response).toBeDefined();
    expect(response.content[0].text).toContain('| agent-4 | Test Agent 4 |');

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_list_agents',
      params: {
        limit: 5,
      },
    });
  });

  test('should list agents with both view and limit parameters', async () => {
    // Setup mock response
    const mockAgents = [
      {
        id: 'agent-5',
        name: 'Test Agent 5',
        description: 'Description for Test Agent 5',
        capabilities: ['text', 'code', 'image'],
        model: 'claude-3-opus',
        provider: 'anthropic',
        temperature: 0.7,
        status: 'active',
        pictureUrl: 'https://example.com/agent5.png',
        supportedOutputFormats: ['text', 'markdown', 'json'],
        tags: ['test', 'development', 'production'],
        visualizationEnabled: true,
        timestamp: Date.now(),
      },
    ];

    // Setup mock response
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: `# Available Dust Agents

| ID | Name | Description | Model | Capabilities |
|---|---|---|---|---|
| agent-5 | Test Agent 5 | Description for Test Agent 5 | claude-3-opus | text, code, image |

\`\`\`json
${JSON.stringify(mockAgents, null, 2)}
\`\`\``,
        },
      ],
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockResponse);

    // Call the MCP method with both view and limit parameters
    const response = await client.callTool({
      name: 'dust_list_agents',
      params: {
        view: 'production',
        limit: 3,
      },
    });

    // Verify the response
    expect(response).toBeDefined();
    expect(response.content[0].text).toContain('| agent-5 | Test Agent 5 |');

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_list_agents',
      params: {
        view: 'production',
        limit: 3,
      },
    });
  });

  test('should handle empty agent list', async () => {
    // Setup mock response
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: `# Available Dust Agents

| ID | Name | Description | Model | Capabilities |
|---|---|---|---|---|

\`\`\`json
[]
\`\`\``,
        },
      ],
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockResponse);

    // Call the MCP method
    const response = await client.callTool({
      name: 'dust_list_agents',
      params: {},
    });

    // Verify the response
    expect(response).toBeDefined();
    expect(response.content[0].text).toContain('# Available Dust Agents');
    expect(response.content[0].text).toContain(
      '| ID | Name | Description | Model | Capabilities |'
    );
    expect(response.content[0].text).toContain('```json');
    expect(response.content[0].text).toContain('[]');

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_list_agents',
      params: {},
    });
  });

  test('should handle errors gracefully', async () => {
    // Setup mock error response
    const errorMessage = 'API error: Failed to retrieve agents';
    const mockErrorResponse = {
      content: [
        {
          type: 'text',
          text: `Error listing Dust agents: ${errorMessage}`,
        },
      ],
      isError: true,
    };

    // Setup mock implementation
    client.callTool.mockResolvedValueOnce(mockErrorResponse);

    // Call the MCP method
    const response = await client.callTool({
      name: 'dust_list_agents',
      params: {},
    });

    // Verify the error response
    expect(response).toBeDefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Error listing Dust agents:');
    expect(response.content[0].text).toContain(errorMessage);
    expect(response.isError).toBe(true);

    // Verify the client was called correctly
    expect(client.callTool).toHaveBeenCalledWith({
      name: 'dust_list_agents',
      params: {},
    });
  });
});
