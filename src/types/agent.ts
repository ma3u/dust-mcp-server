export interface AgentDescriptor {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface SessionDescriptor {
  id: string;
  agentId: string;
  context: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  lastActivity: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  [key: string]: any;
}

export interface DustMessageResponse {
  response: string;
  context: Record<string, any>;
  [key: string]: any;
}
