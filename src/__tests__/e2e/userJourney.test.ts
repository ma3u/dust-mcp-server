import request from 'supertest';
import { Server } from 'http';
import { app } from '../../server';
import { agentService } from '../../services/agentService';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Mock the Dust API
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Import types from agent service
import { AgentDescriptor, SessionDescriptor } from '../../services/agentService';

// Define mock data
const mockAgents: AgentDescriptor[] = [
  {
    id: 'data_analyst',
    name: 'Data Analyst',
    description: 'Analyzes data and generates insights',
    capabilities: ['data_analysis', 'report_generation'],
    isActive: true
  },
  {
    id: 'content_writer',
    name: 'Content Writer',
    description: 'Creates written content',
    capabilities: ['content_creation', 'summarization'],
    isActive: true
  }
];

const mockSession: SessionDescriptor = {
  id: 'test-session-123',
  agentId: 'data_analyst',
  context: { userId: 'test_user' },
  isActive: true,
  createdAt: new Date().toISOString(),
  lastActivity: new Date().toISOString()
};

// Define context type for agent operations
interface AgentContext {
  [key: string]: unknown;
}

// Create a mock implementation of the agent service
const mockAgentService = {
  getAgents: jest.fn<Promise<AgentDescriptor[]>, []>(),
  createSession: jest.fn<Promise<SessionDescriptor>, [string, Record<string, unknown>]>(),
  sendMessage: jest.fn<Promise<{ response: string; context: AgentContext }>, [string, string, string[]]>(),
  endSession: jest.fn<Promise<{ success: boolean }>, [string]>(),
  getSession: jest.fn<Promise<SessionDescriptor | null>, [string]>(),
  saveSession: jest.fn<Promise<{ success: boolean; sessionId: string }>, [string, string, string[]]>(),
  invokeAgent: jest.fn<Promise<{ response: string; context: AgentContext }>, [string, string, Record<string, unknown>]>()
};

// Mock the agent service module
jest.mock('../../services/agentService', () => ({
  agentService: mockAgentService
}));

// Set up default mock implementations
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Set up default mock implementations
  mockAgentService.getAgents.mockResolvedValue(mockAgents);
  mockAgentService.createSession.mockResolvedValue(mockSession);
  
  mockAgentService.sendMessage.mockResolvedValue({
    response: 'Analysis completed successfully',
    context: {}
  });
  
  mockAgentService.invokeAgent.mockResolvedValue({
    response: 'Content generated successfully',
    context: {}
  });
  
  mockAgentService.saveSession.mockResolvedValue({
    success: true,
    sessionId: mockSession.id
  });
  
  mockAgentService.endSession.mockResolvedValue({
    success: true
  });
  
  mockAgentService.getSession.mockResolvedValue({
    ...mockSession,
    isActive: false
  });
});

describe('User Journey', () => {
  let server: Server;
  let sessionId: string;
  let testFilePath: string;

  // Mock data
  const mockAgents = [
    {
      id: 'data_analyst',
      name: 'Data Analyst',
      description: 'Analyzes data and generates insights',
      capabilities: ['data_analysis', 'report_generation']
    },
    {
      id: 'content_writer',
      name: 'Content Writer',
      description: 'Creates written content',
      capabilities: ['content_creation', 'summarization']
    }
  ];

  beforeAll(async () => {
    // Start the test server with a random port
    server = app.listen(0);
    
    // Create a test file
    const testDir = path.join(__dirname, 'test-data');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    testFilePath = path.join(testDir, 'test-data.txt');
    fs.writeFileSync(testFilePath, 'Test data for analysis');
    
    // Set up mock implementations for agent service
    mockAgentService.getAgents.mockResolvedValue([
      {
        id: 'data_analyst',
        name: 'Data Analyst',
        description: 'Analyzes data and generates insights',
        capabilities: ['data_analysis', 'report_generation']
      },
      {
        id: 'content_writer',
        name: 'Content Writer',
        description: 'Creates written content',
        capabilities: ['content_creation', 'summarization']
      }
    ]);
  });

  afterAll((done) => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      // Remove test directory if empty
      const testDir = path.dirname(testFilePath);
      if (fs.existsSync(testDir) && fs.readdirSync(testDir).length === 0) {
        fs.rmdirSync(testDir);
      }
    }
    server.close(done);
    jest.restoreAllMocks();
  });

  it('should complete the full multi-agent user journey', async () => {
    // 1. List available agents with filtering
    const listResponse = await request(server)
      .get('/api/agents')
      .query({ capability: 'data_analysis' })
      .expect(200);
    
    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.some((a: any) => a.id === 'data_analyst')).toBe(true);
    
    // 2. Create a session with the data analyst agent
    const createSessionResponse = await request(server)
      .post('/api/sessions')
      .send({
        agentId: 'data_analyst',
        context: { 
          userId: 'test_user',
          preferences: { format: 'markdown' }
        }
      })
      .expect(201);
    
    sessionId = createSessionResponse.body.id;
    expect(sessionId).toBeDefined();
    
    // 3. Upload a file for analysis
    const uploadResponse = await request(server)
      .post(`/api/sessions/${sessionId}/files`)
      .attach('file', testFilePath)
      .expect(200);
    
    const fileId = uploadResponse.body.id;
    expect(fileId).toBeDefined();
    
    // 4. Send a message with the file to analyze
    const messageResponse = await request(server)
      .post(`/api/sessions/${sessionId}/messages`)
      .send({
        content: 'Please analyze this data and prepare a summary',
        fileIds: [fileId]
      })
      .expect(200);
    
    expect(messageResponse.body.response).toBeDefined();
    
    // 5. Get session history
    const historyResponse = await request(server)
      .get(`/api/sessions/${sessionId}/messages`)
      .expect(200);
    
    expect(Array.isArray(historyResponse.body)).toBe(true);
    expect(historyResponse.body.length).toBeGreaterThan(0);
    
    // 6. Invoke a second agent (content writer) to enhance the analysis
    const secondAgentResponse = await request(server)
      .post(`/api/sessions/${sessionId}/invoke`)
      .send({
        agentId: 'content_writer',
        context: {
          analysis: 'Sample analysis',
          format: 'executive_summary'
        }
      })
      .expect(200);
    
    expect(secondAgentResponse.body.response).toBeDefined();
    
    // 7. Save the session
    const saveResponse = await request(server)
      .post(`/api/sessions/${sessionId}/save`)
      .send({
        name: 'Analysis Session',
        tags: ['data_analysis', 'content_creation']
      })
      .expect(200);
    
    expect(saveResponse.body.success).toBe(true);
    
    // 8. End the session
    await request(server)
      .delete(`/api/sessions/${sessionId}`)
      .expect(200);
    
    // 9. Verify session is ended
    const sessionResponse = await request(server)
      .get(`/api/sessions/${sessionId}`)
      .expect(200);
    
    expect(sessionResponse.body.isActive).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    // Test with non-existent agent
    mockedAxios.post.mockRejectedValueOnce(new Error('Agent not found'));
    
    await request(server)
      .post('/api/sessions')
      .send({
        agentId: 'non_existent_agent',
        context: {}
      })
      .expect(500);
    
    // Test with invalid session ID
    await request(server)
      .post('/api/sessions/invalid-session/messages')
      .send({ message: 'Test' })
      .expect(500);
  });
});
