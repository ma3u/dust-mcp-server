import { jest } from '@jest/globals';
import * as dustService from '../../../src/services/dustService';
import type { AgentConfig } from '../../../src/services/dustService';

// Mock the service module
jest.mock('../../../src/services/dustService');

// Test agent data
const testAgent: dustService.AgentConfig = {
  id: 'agent1',
  name: 'Test Agent',
  description: 'A test agent',
  capabilities: ['test'],
  model: 'test-model',
  provider: 'test-provider',
  temperature: 0.7,
  status: 'active',
  pictureUrl: 'http://example.com/agent.jpg',
  supportedOutputFormats: [],
  tags: [],
  visualizationEnabled: true,
  timestamp: Date.now(),
  instructions: 'Test instructions',
};

// Test response data
const testResponse = {
  agentId: 'agent1',
  conversationId: 'conv1',
  messageId: 'msg1',
  result: 'Test response',
  timestamp: new Date().toISOString(),
};

// Type the mock functions
const mockListDustAgents = dustService.listDustAgents as jest.MockedFunction<
  typeof dustService.listDustAgents
>;
const mockGetAgentConfig = dustService.getAgentConfig as jest.MockedFunction<
  typeof dustService.getAgentConfig
>;
const mockQueryDustAgent = dustService.queryDustAgent as jest.MockedFunction<
  typeof dustService.queryDustAgent
>;

describe('Dust Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations with proper types
    mockListDustAgents.mockResolvedValue([testAgent]);
    mockGetAgentConfig.mockImplementation((id) =>
      Promise.resolve(id === 'agent1' ? testAgent : null)
    );
    mockQueryDustAgent.mockResolvedValue(testResponse);
  });

  describe('listDustAgents', () => {
    it('should return a list of agents', async () => {
      const agents = await dustService.listDustAgents();
      expect(agents).toEqual([testAgent]);
      expect(mockListDustAgents).toHaveBeenCalled();
    });
  });

  describe('getAgentConfig', () => {
    it('should return agent config for valid agent ID', async () => {
      const agent = await dustService.getAgentConfig('agent1');
      expect(agent).toEqual(testAgent);
      expect(mockGetAgentConfig).toHaveBeenCalledWith('agent1');
    });

    it('should return null for invalid agent ID', async () => {
      mockGetAgentConfig.mockResolvedValueOnce(null);
      const agent = await dustService.getAgentConfig('invalid-id');
      expect(agent).toBeNull();
      expect(mockGetAgentConfig).toHaveBeenCalledWith('invalid-id');
    });
  });

  describe('queryDustAgent', () => {
    it('should query an agent and return the response', async () => {
      const response = await dustService.queryDustAgent(
        'agent1',
        'Test query',
        { key: 'value' },
        'conv1'
      );

      expect(response).toEqual(testResponse);
      expect(mockQueryDustAgent).toHaveBeenCalledWith(
        'agent1',
        'Test query',
        { key: 'value' },
        'conv1'
      );
    });
  });
});
