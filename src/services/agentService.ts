import logger from '../utils/logger.js';
import { DustApiService, DustAgent, DustSession, DustMessageResponse } from './dustApiService.js';

// Type definitions
export interface AgentDescriptor extends DustAgent {
  // Add any additional fields specific to your application
  isActive?: boolean;
  lastUsed?: string;
}

export interface SessionDescriptor extends DustSession {
  // Add any additional fields specific to your application
  isActive: boolean;
  createdAt: string;
  lastActivity: string;
}

class AgentService {
  private dustApiService: DustApiService;
  private agents: Map<string, AgentDescriptor> = new Map();
  private sessions: Map<string, SessionDescriptor> = new Map();

  constructor(dustApiService: DustApiService) {
    this.dustApiService = dustApiService;
  }

  /**
   * Initialize the service by loading available agents
   */
  async initialize(): Promise<void> {
    try {
      const agents = await this.dustApiService.listAgents();
      agents.forEach(agent => {
        this.agents.set(agent.id, {
          ...agent,
          isActive: true
        });
      });
      logger.info(`Initialized with ${agents.length} agents`);
    } catch (error) {
      logger.error('Failed to initialize AgentService', error);
      throw error;
    }
  }

  /**
   * Get all available agents
   */
  async getAgents(): Promise<AgentDescriptor[]> {
    return Array.from(this.agents.values());
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string): Promise<AgentDescriptor | undefined> {
    return this.agents.get(agentId);
  }

  /**
   * Create a new session with an agent
   */
  async createSession(agentId: string, context: Record<string, any> = {}): Promise<SessionDescriptor> {
    try {
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      const session = await this.dustApiService.createSession(agentId, context);
      const now = new Date().toISOString();
      const sessionDescriptor: SessionDescriptor = {
        ...session,
        isActive: true,
        createdAt: now,
        lastActivity: now
      };

      this.sessions.set(session.id, sessionDescriptor);
      return sessionDescriptor;
    } catch (error) {
      logger.error(`Failed to create session for agent ${agentId}`, error);
      throw error;
    }
  }

  /**
   * Send a message to an agent in a session
   */
  async sendMessage(
    sessionId: string,
    message: string,
    files: Array<{ name: string; content: string }> = []
  ): Promise<DustMessageResponse> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }
      
      const response = await this.dustApiService.sendMessage(sessionId, message, files);
      
      // Update last activity
      session.lastActivity = new Date().toISOString();
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send message in session ${sessionId}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * End an active session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }

      await this.dustApiService.endSession(sessionId);
      session.isActive = false;
      this.sessions.delete(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to end session ${sessionId}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get an active session by ID
   */
  async getSession(sessionId: string): Promise<SessionDescriptor | undefined> {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<SessionDescriptor[]> {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }
}

// Create a singleton instance
export const agentService = new AgentService(new DustApiService({
  apiKey: process.env.DUST_API_KEY || '',
  workspaceId: process.env.DUST_WORKSPACE_ID || ''
}));

// Initialize the service when this module is loaded
agentService.initialize().catch((error: Error) => {
  logger.error(`Failed to initialize AgentService: ${error.message}`);
});
