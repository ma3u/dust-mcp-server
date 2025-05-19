import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../utils/logger.js';

interface DustApiConfig {
  apiKey: string;
  workspaceId: string;
  baseUrl?: string;
}

export interface DustAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

export interface DustSession {
  id: string;
  agentId: string;
  context: Record<string, any>;
  createdAt: string;
  lastActivity: string;
}

export interface DustMessageResponse {
  response: string;
  context: Record<string, any>;
}

export class DustApiService {
  private client: AxiosInstance;
  private workspaceId: string;

  constructor(config: DustApiConfig) {
    this.workspaceId = config.workspaceId;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://dust.tt/api',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });
  }

  async listAgents(): Promise<DustAgent[]> {
    try {
      const response = await this.client.get(`/workspaces/${this.workspaceId}/agents`);
      return response.data.agents;
    } catch (error) {
      logger.error('Failed to list agents', { error });
      throw new Error('Failed to list agents');
    }
  }

  async getAgent(agentId: string): Promise<DustAgent> {
    try {
      const response = await this.client.get(`/workspaces/${this.workspaceId}/agents/${agentId}`);
      return response.data.agent;
    } catch (error) {
      logger.error('Failed to get agent', { agentId, error });
      throw new Error(`Failed to get agent: ${agentId}`);
    }
  }

  async createSession(agentId: string, context: Record<string, any> = {}): Promise<DustSession> {
    try {
      const response = await this.client.post<{ session: DustSession }>(
        `/workspaces/${this.workspaceId}/sessions`,
        { agentId, context }
      );
      return response.data.session;
    } catch (error) {
      logger.error('Failed to create session', { agentId, error });
      throw new Error('Failed to create session');
    }
  }

  async sendMessage(sessionId: string, message: string, files: Array<{ name: string; content: string }> = []): Promise<DustMessageResponse> {
    try {
      const response = await this.client.post<{ response: DustMessageResponse }>(
        `/workspaces/${this.workspaceId}/sessions/${sessionId}/messages`,
        { message, files }
      );
      return response.data.response;
    } catch (error) {
      logger.error('Failed to send message', { sessionId, error });
      throw new Error('Failed to send message');
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      await this.client.delete(`/workspaces/${this.workspaceId}/sessions/${sessionId}`);
    } catch (error) {
      logger.error('Failed to end session', { sessionId, error });
      throw new Error('Failed to end session');
    }
  }
}

export default DustApiService;
