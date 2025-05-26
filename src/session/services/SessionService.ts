import type { Redis } from 'ioredis';
import type { SessionRepository } from '../interfaces/ISession.js';
import type {
  ISession,
  CreateSessionInput,
  UpdateSessionInput,
} from '../interfaces/ISession.js';
import { SessionStoreFactory } from '../factories/SessionStoreFactory.js';

export class SessionService {
  private static instance: SessionService;
  private readonly sessionRepository: SessionRepository;

  /**
   * Private constructor to enforce singleton pattern
   * @param sessionRepository The session repository to use
   */
  private constructor(sessionRepository: SessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  /**
   * Get or create a SessionService instance
   * @param redisClient Optional Redis client for Redis-based session storage
   * @returns SessionService instance
   */
  /**
   * Get or create a SessionService instance
   * @param redisClient Optional Redis client for Redis-based session storage
   * @returns SessionService instance
   */
  static getInstance(redisClient?: Redis): SessionService {
    if (!SessionService.instance) {
      const repository =
        SessionStoreFactory.createSessionRepository(redisClient);
      SessionService.instance = new SessionService(repository);
    }
    return SessionService.instance;
  }

  /**
   * Create a new session
   * @param input Session creation parameters
   * @returns The created session
   */
  async createSession(input: CreateSessionInput): Promise<ISession> {
    try {
      return await this.sessionRepository.create(input);
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  async getSession(sessionId: string): Promise<ISession | null> {
    return this.sessionRepository.findById(sessionId);
  }

  async updateSession(
    sessionId: string,
    updates: UpdateSessionInput
  ): Promise<ISession | null> {
    return this.sessionRepository.update(sessionId, updates);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessionRepository.delete(sessionId);
  }

  async getUserSessions(userId: string): Promise<ISession[]> {
    return this.sessionRepository.findByUserId(userId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    return this.sessionRepository.deleteExpired();
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return !!session && new Date(session.expiresAt) > new Date();
  }

  async updateSessionData(
    sessionId: string,
    data: Record<string, any>,
    ttl?: number
  ): Promise<ISession | null> {
    return this.sessionRepository.update(sessionId, { data, ttl });
  }

  async extendSession(
    sessionId: string,
    ttl: number
  ): Promise<ISession | null> {
    return this.sessionRepository.update(sessionId, { ttl });
  }
}
