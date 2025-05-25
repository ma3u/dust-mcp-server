import { Types } from 'mongoose';

export interface ISession {
  sessionId: string;
  userId: string;
  data: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  data?: Record<string, any>;
  ttl?: number; // Time to live in seconds
}

export interface UpdateSessionInput {
  data?: Record<string, any>;
  ttl?: number; // Time to live in seconds
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<ISession>;
  findById(sessionId: string): Promise<ISession | null>;
  update(sessionId: string, input: UpdateSessionInput): Promise<ISession | null>;
  delete(sessionId: string): Promise<boolean>;
  deleteExpired(): Promise<number>;
  findByUserId(userId: string): Promise<ISession[]>;
}
