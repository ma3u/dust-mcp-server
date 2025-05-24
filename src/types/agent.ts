// Base type for agent configuration
export type AgentConfig = {
  model: string;
  provider: string;
  temperature: number;
  status: string;
  pictureUrl?: string;
  supportedOutputFormats: string[];
  tags: string[];
  visualizationEnabled: boolean;
  [key: string]: unknown;
};

export interface AgentDescriptor extends AgentConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
}

// Base type for session context
export type SessionContext = Record<string, unknown>;

export interface SessionDescriptor {
  id: string;
  agentId: string;
  context: SessionContext;
  isActive: boolean;
  createdAt: string;
  lastActivity: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
}

export interface DustMessageResponse {
  response: string;
  context: SessionContext;
  metadata?: Record<string, unknown>;
}
