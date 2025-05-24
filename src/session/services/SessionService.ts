import { SessionRepository } from '../interfaces/ISession';
import { ISession, CreateSessionInput, UpdateSessionInput } from '../interfaces/ISession';

export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async createSession(input: CreateSessionInput): Promise<ISession> {
    return this.sessionRepository.create(input);
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

  async extendSession(sessionId: string, ttl: number): Promise<ISession | null> {
    return this.sessionRepository.update(sessionId, { ttl });
  }
}
