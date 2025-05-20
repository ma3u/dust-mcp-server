import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setupDustTools } from '../../src/dust';

// Define types for the mock server and handlers
type ToolHandler = (...args: any[]) => Promise<any>;
type MockServer = {
  tool: jest.Mock<unknown, [string, any, ToolHandler]>;
};

// Mock the Dust service
jest.mock('../../src/services/dustService', () => ({
  queryDustAgent: jest.fn(),
  listDustAgents: jest.fn(),
  getAgentConfig: jest.fn(),
}));

import { queryDustAgent, listDustAgents, getAgentConfig } from '../../src/services/dustService';

describe('Dust MCP Tools', () => {
  let mockServer: McpServer;
  let mockTool: jest.Mock;
  
  const mockAgents = [
    {
      id: 'agent1',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      model: 'test-model',
      provider: 'test-provider',
      temperature: 0.7,
      status: 'active',
      pictureUrl: 'http://example.com/agent.jpg',
      supportedOutputFormats: ['text'],
      tags: ['test'],
      visualizationEnabled: true
    }
  ];

  beforeEach(() => {
    // Create a mock MCP server
    mockTool = jest.fn();
    mockServer = {
      tool: mockTool
    } as unknown as McpServer;
    
    // Setup the Dust tools
    setupDustTools(mockServer);
  });

  it('should register dust_list_agents tool', () => {
    // Verify the tool was registered
    expect(mockTool).toHaveBeenCalledWith(
      'dust_list_agents',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register dust_get_agent_config tool', () => {
    // Verify the tool was registered
    expect(mockTool).toHaveBeenCalledWith(
      'dust_get_agent_config',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register dust_agent_query tool', () => {
    // Verify the tool was registered
    expect(mockTool).toHaveBeenCalledWith(
      'dust_agent_query',
      expect.any(Object),
      expect.any(Function)
    );
  });

  describe('dust_list_agents tool', () => {
    let listAgentsHandler: any;
    
    beforeEach(() => {
      // Get the handler for the list agents tool
      const call = mockTool.mock.calls.find(([name]: [string]) => name === 'dust_list_agents');
      listAgentsHandler = call[2];
    });

    it('should return a list of agents', async () => {
      // Mock the listDustAgents function
      (listDustAgents as jest.Mock).mockResolvedValue(mockAgents);

      // Call the handler
      const response = await listAgentsHandler({});
      
      // Verify the response
      expect(response.content[0].text).toContain('Available Dust Agents');
      expect(response.content[0].text).toContain('Test Agent');
      expect(listDustAgents).toHaveBeenCalled();
    });
  });

  describe('dust_get_agent_config tool', () => {
    let getAgentConfigHandler: any;
    
    beforeEach(() => {
      // Get the handler for the get agent config tool
      const call = mockTool.mock.calls.find(([name]: [string]) => name === 'dust_get_agent_config');
      getAgentConfigHandler = call[2];
    });

    it('should return agent configuration', async () => {
      // Mock the getAgentConfig function
      (getAgentConfig as jest.Mock).mockResolvedValue(mockAgents[0]);

      // Call the handler
      const response = await getAgentConfigHandler({ agent_id: 'agent1' });
      
      // Verify the response
      expect(response.content[0].text).toContain('Agent Configuration');
      expect(response.content[0].text).toContain('Test Agent');
      expect(getAgentConfig).toHaveBeenCalledWith('agent1');
    });
  });

  describe('dust_agent_query tool', () => {
    let agentQueryHandler: any;
    
    beforeEach(() => {
      // Get the handler for the agent query tool
      const call = mockTool.mock.calls.find((call) => call[0] === 'dust_agent_query');
      agentQueryHandler = call?.[2];
      expect(agentQueryHandler).toBeDefined();
    });

    it('should query an agent and return a response', async () => {
      // Mock the queryDustAgent function
      (queryDustAgent as jest.Mock).mockResolvedValue({
        agentId: 'agent1',
        conversationId: 'conv1',
        messageId: 'msg1',
        result: 'Test response',
        timestamp: new Date().toISOString()
      });

      // Call the handler
      const response = await agentQueryHandler({
        agent_id: 'agent1',
        query: 'Hello, agent!',
        conversation_id: 'conv1',
        context: { test: 'context' }
      });
      
      // Verify the response
      expect(response.content[0].text).toBe('Test response');
      expect(response.conversation_id).toBe('conv1');
      expect(response.agent_id).toBe('agent1');
      expect(queryDustAgent).toHaveBeenCalledWith(
        'agent1',
        'Hello, agent!',
        { test: 'context' },
        'conv1'
      );
    });
  });
});
