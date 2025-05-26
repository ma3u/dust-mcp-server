import request from 'supertest';
import { Server } from 'http';
import { app } from '../../../server.js';
import {
  agentService,
  type AgentDescriptor,
  type SessionDescriptor,
} from '../../../services/agentService.js';

// Mock the agentService
const mockGetAgents = jest.fn();
const mockCreateSession = jest.fn();
const mockSendMessage = jest.fn();

jest.mock('../../../services/agentService.js', () => ({
  __esModule: true,
  agentService: {
    getAgents: mockGetAgents,
    createSession: mockCreateSession,
    sendMessage: mockSendMessage,
    // Add other methods as needed
  },
}));

describe('Agent API Routes', () => {
  let server: Server;

  beforeAll(() => {
    server = app.listen(0); // Use dynamic port
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/agents', () => {
    it('should return a list of agents', async () => {
      const mockAgents = [
        {
          id: 'agent1',
          name: 'Agent 1',
          description: 'Test Agent',
          capabilities: ['test'],
        },
      ] as AgentDescriptor[];

      mockGetAgents.mockResolvedValue(mockAgents);

      const response = await request(server).get('/api/agents').expect(200);

      expect(response.body).toEqual(mockAgents);
      expect(mockGetAgents).toHaveBeenCalled();
    });
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const mockSession = {
        id: 'session1',
        agentId: 'agent1',
        context: { test: 'context' },
        isActive: true,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      } as SessionDescriptor;

      mockCreateSession.mockResolvedValue(mockSession);

      const response = await request(server)
        .post('/api/sessions')
        .send({ agentId: 'agent1', context: { test: 'context' } })
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'session1',
        agentId: 'agent1',
        context: { test: 'context' },
        isActive: true,
      });
      expect(mockCreateSession).toHaveBeenCalledWith('agent1', {
        test: 'context',
      });
    });
  });

  describe('POST /api/sessions/:sessionId/messages', () => {
    it('should send a message to an agent', async () => {
      const mockResponse = {
        messageId: 'msg1',
        content: 'Test response',
        timestamp: new Date().toISOString(),
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const response = await request(server)
        .post('/api/sessions/session1/messages')
        .send({ message: 'Hello', files: [] })
        .expect(200);

      expect(response.body).toMatchObject({
        messageId: 'msg1',
        content: 'Test response',
      });
      expect(mockSendMessage).toHaveBeenCalledWith('session1', 'Hello', []);
    });
  });
});
