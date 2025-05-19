import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentService } from '../../../services/agentService';

describe('AgentService', () => {
  let agentService: AgentService;

  beforeEach(() => {
    agentService = new AgentService();
    // Clear the agent store before each test
    (agentService as any).agentStore = {};
    (agentService as any).sessionStore = {};
  });

  describe('listAgents', () => {
    it('should return an empty array when no agents exist', async () => {
      const agents = await agentService.listAgents();
      expect(agents).toEqual([]);
    });

    it('should return all agents', async () => {
      // Add test agents
      await (agentService as any).createAgent({
        id: 'test1',
        name: 'Test Agent 1',
        description: 'Test Agent',
        capabilities: ['test']
      });
      
      const agents = await agentService.listAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('test1');
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      await (agentService as any).createAgent({
        id: 'test1',
        name: 'Test Agent',
        description: 'Test Agent',
        capabilities: ['test']
      });

      const session = await agentService.createSession('test1', { test: 'context' });
      expect(session.agentId).toBe('test1');
      expect(session.context).toEqual({ test: 'context' });
      expect(session.id).toBeDefined();
    });

    it('should throw error for non-existent agent', async () => {
      await expect(agentService.createSession('nonexistent'))
        .rejects
        .toThrow('Agent not found: nonexistent');
    });
  });

  describe('sendMessage', () => {
    it('should send a message to an agent', async () => {
      await (agentService as any).createAgent({
        id: 'test1',
        name: 'Test Agent',
        description: 'Test Agent',
        capabilities: ['test']
      });
      
      const session = await agentService.createSession('test1');
      const response = await agentService.sendMessage(session.id, 'Hello', []);
      
      expect(response.response).toContain('Hello');
      expect(response.context.lastMessage).toBe('Hello');
    });
  });
});
