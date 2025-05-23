import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentService } from '../../../services/agentService.js';
import { DustApiService } from '../../../services/dustApiService.js';

// Mock the dustApiService
const mockListAgents = jest.fn();
const mockCreateSession = jest.fn();
const mockSendMessage = jest.fn();

const mockDustApiService = {
  listAgents: mockListAgents,
  createSession: mockCreateSession,
  sendMessage: mockSendMessage,
} as unknown as DustApiService;

// Create a new instance of AgentService for testing
let agentService: AgentService;

// Mock data
const mockAgent = {
  id: 'test1',
  name: 'Test Agent',
  description: 'A test agent',
  capabilities: ['test'],
  version: '1.0.0',
  instructions: 'Test instructions',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true
};

const mockSession = {
  id: 'session1',
  agentId: 'test1',
  context: {},
  isActive: true,
  createdAt: new Date().toISOString(),
  lastActivity: new Date().toISOString()
};

const mockMessageResponse = {
  response: 'Test response',
  context: {},
  messages: [{ role: 'assistant', content: 'Test response' }]
};

describe('AgentService', () => {
  const testAgent = {
    id: 'test1',
    name: 'Test Agent',
    description: 'A test agent',
    capabilities: ['test'],
    version: '1.0.0',
    instructions: 'Test instructions',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  

  const mockSession: SessionDescriptor = {
    id: 'session1',
    agentId: 'test1',
    context: { test: 'context' },
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    messages: []
  };

  const mockMessageResponse: DustMessageResponse = {
    response: 'Test response',
    context: { test: 'context' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create a new instance of AgentService for each test
    agentService = new AgentService(mockDustApiService);
    
    // Set up default mock implementations
    mockListAgents.mockResolvedValue([mockAgent]);
    mockCreateSession.mockResolvedValue(mockSession);
    mockSendMessage.mockResolvedValue(mockMessageResponse);
    
    // Initialize the service
    await agentService.initialize();
  });

  describe('getAgents', () => {
    it('should return an empty array when no agents exist', async () => {
      // Override the default mock for this test
      mockListAgents.mockResolvedValueOnce([]);
      
      // Re-initialize with empty agents
      const emptyAgentService = new AgentService({
        ...mockDustApiService,
        listAgents: async () => []
      } as DustApiService);
      
      await emptyAgentService.initialize();
      const agents = await emptyAgentService.getAgents();
      expect(agents).toEqual([]);
    });

    it('should return all agents', async () => {
      const agents = await agentService.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('test1');
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      // Mock the session creation
      const newSession = {
        ...mockSession,
        context: { test: 'context' }
      };
      
      // @ts-ignore
      mockCreateSession.mockImplementation(async (agentId, context) => {
        if (agentId === 'test1') {
          return newSession;
        }
        throw new Error(`Agent with ID ${agentId} not found`);
      });
      
      const session = await agentService.createSession('test1', { test: 'context' });
      expect(session.agentId).toBe('test1');
      expect(session.context).toEqual({ test: 'context' });
      expect(mockCreateSession).toHaveBeenCalledWith('test1', { test: 'context' });
    });

    it('should throw error for non-existent agent', async () => {
      // @ts-ignore
      mockGetAgent.mockImplementationOnce(async () => undefined);
      
      await expect(agentService.createSession('nonexistent'))
        .rejects
        .toThrow('Agent with ID nonexistent not found');
    });
  });

  describe('sendMessage', () => {
    it('should send a message to an agent', async () => {
      // Mock the session
      const session = {
        ...mockSession,
        id: 'session1',
        isActive: true
      };
      
      // @ts-ignore
      mockSendMessage.mockImplementation(async (sessionId, message) => {
        if (sessionId === 'session1') {
          return {
            ...mockMessageResponse,
            context: { test: 'context' }
          };
        }
        throw new Error(`Session with ID ${sessionId} not found`);
      });
      
      const response = await agentService.sendMessage('session1', 'Hello');
      expect(response).toHaveProperty('response', 'Test response');
      expect(response).toHaveProperty('context', { test: 'context' });
      expect(mockSendMessage).toHaveBeenCalledWith('session1', 'Hello', []);
    });
  });
});
