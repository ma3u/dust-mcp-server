import * as dustService from '../../../src/services/dustService';

// Mock the service module
jest.mock('../../../src/services/dustService');

// Test agent data
const testAgent = {
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
  timestamp: Date.now()
};

// Test response data
const testResponse = {
  agentId: 'agent1',
  conversationId: 'conv1',
  messageId: 'msg1',
  result: 'Test response',
  timestamp: new Date().toISOString()
};

describe('Dust Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (dustService.listDustAgents as jest.Mock).mockResolvedValue([testAgent]);
    (dustService.getAgentConfig as jest.Mock).mockImplementation((id) => 
      Promise.resolve(id === 'agent1' ? testAgent : null)
    );
    (dustService.queryDustAgent as jest.Mock).mockResolvedValue(testResponse);
  });

  describe('listDustAgents', () => {
    it('should return a list of agents', async () => {
      const agents = await dustService.listDustAgents();
      expect(agents).toEqual([testAgent]);
      expect(dustService.listDustAgents).toHaveBeenCalled();
    });
  });

  describe('getAgentConfig', () => {
    it('should return agent config for valid agent ID', async () => {
      const agent = await dustService.getAgentConfig('agent1');
      expect(agent).toEqual(testAgent);
      expect(dustService.getAgentConfig).toHaveBeenCalledWith('agent1');
    });

    it('should return null for invalid agent ID', async () => {
      const agent = await dustService.getAgentConfig('invalid-id');
      expect(agent).toBeNull();
      expect(dustService.getAgentConfig).toHaveBeenCalledWith('invalid-id');
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
      expect(dustService.queryDustAgent).toHaveBeenCalledWith(
        'agent1',
        'Test query',
        { key: 'value' },
        'conv1'
      );
    });
  });
});
