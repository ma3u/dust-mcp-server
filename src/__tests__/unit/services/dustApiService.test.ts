import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
        `/workspaces/${config.workspaceId}/agents`,
        expect.any(Object)
      );
    });

    it('should throw an error when the request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Server Error' } }
      });
      
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
        `/workspaces/${config.workspaceId}/agents/${agentId}`,
        expect.any(Object)
      );
    });

    it('should throw an error when agent is not found', async () => {
      const agentId = 'nonexistent';
      
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not Found' } }
      });
      
      await expect(dustApiService.getAgent(agentId))
        .rejects
        .toThrow(`Failed to get agent: ${agentId}`);
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
        { agentId, context },
        expect.any(Object)
      );
    });
  });

  describe('sendMessage', () => {
    it('should send a message to a session', async () => {
      const sessionId = 'session1';
      const message = 'Hello, agent!';
      const files = [{ name: 'test.txt', content: 'Test content' }];
      const mockResponse = {
        response: 'Hello, user!',
        context: { lastMessage: message }
      };
      
      mockedAxios.post.mockResolvedValueOnce({ 
        data: { response: mockResponse } 
      });
      
      const response = await dustApiService.sendMessage(sessionId, message, files);
      
      expect(response).toEqual(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/workspaces/${config.workspaceId}/sessions/${sessionId}/messages`,
        { message, files },
        expect.any(Object)
      );
    });
  });

  describe('endSession', () => {
    it('should end a session', async () => {
      const sessionId = 'session1';
      
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });
      
      await expect(dustApiService.endSession(sessionId)).resolves.not.toThrow();
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/workspaces/${config.workspaceId}/sessions/${sessionId}`,
        expect.any(Object)
      );
    });
  });
});
