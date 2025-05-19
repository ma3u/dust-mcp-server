import axios from 'axios';
import { DustApiService } from '../../../services/dustApiService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DustApiService', () => {
  let dustApiService: DustApiService;
  const config = {
    apiKey: 'test-api-key',
    workspaceId: 'test-workspace',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dustApiService = new DustApiService(config);
  });

  describe('listAgents', () => {
    it('should return a list of agents', async () => {
      const mockAgents = {
        agents: [
          { id: 'agent1', name: 'Agent 1', description: 'Test Agent', capabilities: ['test'] }
        ]
      };
      
      mockedAxios.get.mockResolvedValueOnce({ data: mockAgents });
      
      const agents = await dustApiService.listAgents();
      
      expect(agents).toEqual(mockAgents.agents);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/workspaces/${config.workspaceId}/agents`
      );
    });

    it('should throw an error when the request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(dustApiService.listAgents())
        .rejects
        .toThrow('Failed to list agents');
    });
  });

  describe('getAgent', () => {
    it('should return agent details', async () => {
      const agentId = 'agent1';
      const mockAgent = {
        agent: {
          id: agentId,
          name: 'Test Agent',
          description: 'Test Agent',
          capabilities: ['test']
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce({ data: mockAgent });
      
      const agent = await dustApiService.getAgent(agentId);
      
      expect(agent).toEqual(mockAgent.agent);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/workspaces/${config.workspaceId}/agents/${agentId}`
      );
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const agentId = 'agent1';
      const context = { test: 'context' };
      const mockSession = {
        session: {
          id: 'session1',
          agentId,
          context,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce({ data: mockSession });
      
      const session = await dustApiService.createSession(agentId, context);
      
      expect(session).toEqual(mockSession.session);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/workspaces/${config.workspaceId}/sessions`,
        { agentId, context }
      );
    });
  });

  describe('sendMessage', () => {
    it('should send a message to a session', async () => {
      const sessionId = 'session1';
      const message = 'Hello, agent!';
      const files = [{ name: 'test.txt', content: 'Test content' }];
      const mockResponse = {
        response: {
          response: 'Hello, user!',
          context: { lastMessage: message }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });
      
      const response = await dustApiService.sendMessage(sessionId, message, files);
      
      expect(response).toEqual(mockResponse.response);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/workspaces/${config.workspaceId}/sessions/${sessionId}/messages`,
        { message, files }
      );
    });
  });

  describe('endSession', () => {
    it('should end a session', async () => {
      const sessionId = 'session1';
      
      mockedAxios.delete.mockResolvedValueOnce({});
      
      await expect(dustApiService.endSession(sessionId)).resolves.not.toThrow();
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/workspaces/${config.workspaceId}/sessions/${sessionId}`
      );
    });
  });
});
