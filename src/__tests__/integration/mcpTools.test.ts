import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import with type assertions to avoid ESM issues
const { setupDustTools } = await import('../../src/dust.js');
type AgentConfig = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
};

// Define parameter types for the service functions
interface QueryDustAgentParams {
  agentId: string | null;
  query: string;
  context?: Record<string, unknown>;
  conversationId?: string;
}

interface ListDustAgentsParams {
  workspaceId?: string;
  limit?: number;
}

// Define the expected response type from the tool handlers
interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
    [key: string]: unknown;
  }>;
  conversation_id?: string;
  agent_id?: string;
}

// Define the ToolHandler type
type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResponse>;

// Define proper types for mock functions
type QueryDustAgentFn = (params: QueryDustAgentParams) => Promise<Record<string, unknown>>;
type ListDustAgentsFn = (params: ListDustAgentsParams) => Promise<AgentConfig[]>;
type GetAgentConfigFn = (agentId: string) => Promise<AgentConfig | null>;

// Mock the Dust service with proper types
const mockQueryDustAgent = jest.fn();
const mockListDustAgents = jest.fn();
const mockGetAgentConfig = jest.fn();

// Mock the dust service module with proper typing
const mockDustService = {
  queryDustAgent: mockQueryDustAgent,
  listDustAgents: mockListDustAgents,
  getAgentConfig: mockGetAgentConfig
};

jest.mock('../../src/services/dustService.js', () => mockDustService);

// Define types for the mock server
type ToolRegistration = [string, unknown, ToolHandler];

interface MockServer {
  tool: jest.Mock & {
    mock: {
      calls: ToolRegistration[];
    };
  };
  [key: string]: any; // Allow additional properties
}

describe('Dust MCP Tools', () => {
  let mockServer: MockServer;
  let mockTool: jest.Mock<void, [string, unknown, ToolHandler]>;
  
  const mockAgent: AgentConfig = {
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
    visualizationEnabled: true,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const mockAgents: AgentConfig[] = [mockAgent];

  // Setup mock implementations before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations with proper types
    (mockQueryDustAgent as jest.Mock).mockResolvedValue({
      agentId: 'test-agent-1',
      conversationId: 'conv-123',
      messageId: 'msg-123',
      result: 'Test response',
      timestamp: new Date().toISOString()
    });
    
    (mockListDustAgents as jest.Mock).mockResolvedValue([{
      id: 'test-agent-1',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['query', 'search']
    }]);
    
    (mockGetAgentConfig as jest.Mock).mockResolvedValue({
      id: 'test-agent-1',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['query', 'search']
    });
    
    // Create a mock MCP server
    mockServer = {
      tool: jest.fn()
    } as unknown as MockServer;
    
    // Setup the dust tools with the mock server
    setupDustTools(mockServer as unknown as McpServer);
  });

  it('should register dust_list_agents tool', () => {
    // Verify the tool was registered
    expect(mockServer.tool).toHaveBeenCalledWith(
      'dust_list_agents',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register dust_get_agent_config tool', () => {
    // Verify the tool was registered
    expect(mockServer.tool).toHaveBeenCalledWith(
      'dust_get_agent_config',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register dust_agent_query tool', () => {
    // Verify the tool was registered
    expect(mockServer.tool).toHaveBeenCalledWith(
      'dust_agent_query',
      expect.any(Object),
      expect.any(Function)
    );
  });

  describe('list_agents tool', () => {
    let listAgentsHandler: ToolHandler;
    
    beforeEach(() => {
      // Get the handler for the list agents tool
      const call = (mockServer.tool as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'list_agents'
      );
      if (!call) throw new Error('list_agents tool not registered');
      listAgentsHandler = call[2] as ToolHandler;
    });

    it('should return a list of agents', async () => {
      // Mock the listDustAgents function
      mockListDustAgents.mockResolvedValue(mockAgents);

      // Call the handler
      const response = await listAgentsHandler({});
      
      // Verify the response
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0].text).toContain('Available Dust Agents');
      expect(response.content[0].text).toContain('Test Agent');
      expect(mockListDustAgents).toHaveBeenCalled();
    });
  });

  describe('get_agent_config tool', () => {
    let getAgentConfigHandler: ToolHandler;
    
    beforeEach(() => {
      // Get the handler for the get agent config tool
      const call = (mockServer.tool as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'get_agent_config'
      );
      if (!call) throw new Error('get_agent_config tool not registered');
      getAgentConfigHandler = call[2] as ToolHandler;
    });

    it('should return agent configuration', async () => {
      // Mock the getAgentConfig function
      mockGetAgentConfig.mockResolvedValue(mockAgent);

      // Call the handler
      const response = await getAgentConfigHandler({ agent_id: 'agent1' });
      
      // Verify the response
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0].text).toContain('Agent Configuration');
      expect(response.content[0].text).toContain('Test Agent');
      expect(mockGetAgentConfig).toHaveBeenCalledWith('agent1');
    });
  });

  describe('dust_agent_query tool', () => {
    let agentQueryHandler: ToolHandler;
    
    beforeEach(() => {
      // Get the handler for the agent query tool
      const call = (mockServer.tool as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'dust_agent_query'
      );
      if (!call) throw new Error('dust_agent_query tool not registered');
      agentQueryHandler = call[2] as ToolHandler;
    });

    it('should query an agent and return a response', async () => {
      // Mock the queryDustAgent function
      mockQueryDustAgent.mockResolvedValue({
        agentId: 'agent1',
        conversationId: 'conv1',
        messageId: 'msg1',
        result: 'Test response',
        timestamp: new Date().toISOString()
      });

      // Call the handler
      const response = await agentQueryHandler({
        agent_id: 'agent1',
        query: 'Test query',
        conversation_id: 'conv1'
      } as any);
      
      // Verify the response
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0].text).toContain('Test response');
      expect(mockQueryDustAgent).toHaveBeenCalledWith(
        'agent1',
        'Test query',
        {},
        'conv1'
      );
    });

    it('should handle errors in agent query', async () => {
      // Mock the queryDustAgent function to throw an error
      mockQueryDustAgent.mockRejectedValue(new Error('Test error'));

      // Call the handler
      const response = await agentQueryHandler({
        agent_id: 'agent1',
        query: 'Test query'
      } as any);
      
      // Verify the error response
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0].text).toContain('Error querying agent');
      expect(response.content[0].text).toContain('Test error');
    });
  });
});
