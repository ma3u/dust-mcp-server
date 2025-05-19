import request from 'supertest';
import { Server } from 'http';
import { app } from '../../../server';
import { AgentService } from '../../../services/agentService';

// Mock the AgentService
jest.mock('../../../services/agentService');

const MockedAgentService = AgentService as jest.MockedClass<typeof AgentService>;

describe('Agent API Routes', () => {
  let server: Server;
  let agentService: jest.Mocked<AgentService>;

  beforeAll(() => {
    server = app.listen(0); // Use dynamic port
    agentService = new MockedAgentService() as jest.Mocked<AgentService>;
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /api/agents', () => {
    it('should return a list of agents', async () => {
      const mockAgents = [
        { id: 'agent1', name: 'Agent 1', description: 'Test Agent', capabilities: ['test'] }
      ];
      
      agentService.listAgents.mockResolvedValue(mockAgents as any);
      
      const response = await request(server)
        .get('/api/agents')
        .expect(200);
      
      expect(response.body).toEqual(mockAgents);
    });
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const mockSession = {
        id: 'session1',
        agentId: 'agent1',
        context: { test: 'context' },
        createdAt: new Date(),
        lastActivity: new Date()
      };
      
      agentService.createSession.mockResolvedValue(mockSession as any);
      
      const response = await request(server)
        .post('/api/sessions')
        .send({ agentId: 'agent1', context: { test: 'context' } })
        .expect(201);
      
      expect(response.body).toMatchObject({
        id: 'session1',
        agentId: 'agent1',
        context: { test: 'context' }
      });
    });
  });

  describe('POST /api/sessions/:sessionId/messages', () => {
    it('should send a message to an agent', async () => {
      const mockResponse = {
        response: 'Test response',
        context: { lastMessage: 'Hello' }
      };
      
      agentService.sendMessage.mockResolvedValue(mockResponse);
      
      const response = await request(server)
        .post('/api/sessions/session1/messages')
        .send({ message: 'Hello' })
        .expect(200);
      
      expect(response.body).toEqual(mockResponse);
    });
  });
});
