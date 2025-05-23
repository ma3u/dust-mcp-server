import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import dustTools from '../../../src/dust';

// Define the mock agent type for testing
interface MockAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  model: string;
  provider: string;
  temperature: number;
  status: string;
  pictureUrl: string;
  supportedOutputFormats: string[];
  tags: string[] | { sId: string; name: string; kind: string }[];
  visualizationEnabled: boolean;
}

// Mock the Dust service with proper typing
const mockQueryDustAgent = jest.fn().mockImplementation((): Promise<{
  agentId: string;
  conversationId: string;
  messageId: string;
  result: string;
  timestamp: string;
}> => {
  return Promise.resolve({
    agentId: 'agent1',
    conversationId: 'conv1',
    messageId: 'msg1',
    result: 'Test response',
    timestamp: new Date().toISOString()
  });
});

const mockListDustAgents = jest.fn().mockImplementation((): Promise<MockAgent[]> => {
  return Promise.resolve([{
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
  }]);
});

const mockGetAgentConfig = jest.fn().mockImplementation((agentId: string): Promise<MockAgent | null> => {
  if (agentId === 'agent1') {
    return Promise.resolve({
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
    });
  }
  return Promise.resolve(null);
});

// Mock the dustService module with proper typing
jest.mock('../../../src/services/dustService', () => ({
  queryDustAgent: jest.fn((...args: any[]) => mockQueryDustAgent(...args)),
  listDustAgents: jest.fn((...args: any[]) => mockListDustAgents(...args)),
  getAgentConfig: jest.fn((...args: any[]) => mockGetAgentConfig(...args)),
}));

describe('Dust MCP Tools', () => {
  let mockServer: {
    tool: jest.Mock;
  };
  
  const mockAgents: MockAgent[] = [
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
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a mock server with proper typing
    mockServer = {
      tool: jest.fn()
    } as unknown as {
      tool: jest.Mock;
    };
    
    // Setup the Dust tools
    if (typeof dustTools === 'function') {
      dustTools(mockServer as any);
    } else {
      throw new Error('dustTools is not a function');
    }
  });

  it('should register all tools', () => {
    // Verify all tools were registered
    expect(mockServer.tool).toHaveBeenCalledTimes(3);
    
    // Get the registered tool names
    const toolNames = mockServer.tool.mock.calls.map(call => call[0]);
    expect(toolNames).toContain('dust_list_agents');
    expect(toolNames).toContain('dust_get_agent_config');
    expect(toolNames).toContain('dust_agent_query');
  });

  describe('dust_list_agents', () => {
    let listAgentsHandler: any;
    
    beforeEach(() => {
      // Get the handler for the list agents tool
      const call = mockServer.tool.mock.calls.find(([name]) => name === 'dust_list_agents');
      listAgentsHandler = call?.[2];
    });

    it('should return a list of agents', async () => {
      // Mock the listDustAgents function to return our test agents
      mockListDustAgents.mockResolvedValue(mockAgents);

      // Call the handler
      const response = await listAgentsHandler({});
      
      // Verify the response
      expect(response.content[0].text).toBe(JSON.stringify(mockAgents, null, 2));
      expect(mockListDustAgents).toHaveBeenCalled();
    });
  });

  describe('dust_get_agent_config', () => {
    let getAgentConfigHandler: any;
    
    beforeEach(() => {
      // Get the handler for the get agent config tool
      const call = mockServer.tool.mock.calls.find(([name]) => name === 'dust_get_agent_config');
      getAgentConfigHandler = call?.[2];
    });

    it('should return agent configuration', async () => {
      // Mock the getAgentConfig function to return our test agent
      mockGetAgentConfig.mockResolvedValue(mockAgents[0]);

      // Call the handler
      const response = await getAgentConfigHandler({ agent_id: 'agent1' });
      
      // Verify the response
      expect(response.content[0].text).toBe(JSON.stringify(mockAgents[0], null, 2));
      expect(mockGetAgentConfig).toHaveBeenCalledWith('agent1');
    });
  });

  describe('dust_agent_query', () => {
    let agentQueryHandler: any;
    
    beforeEach(() => {
      // Get the handler for the agent query tool
      const call = mockServer.tool.mock.calls.find(([name]) => name === 'dust_agent_query');
      agentQueryHandler = call?.[2];
    });

    it('should query an agent and return a response', async () => {
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
      expect(mockQueryDustAgent).toHaveBeenCalledWith(
        'agent1',
        'Hello, agent!',
        { test: 'context' },
        'conv1'
      );
    });
  });
});
