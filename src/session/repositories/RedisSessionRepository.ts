import type { Redis } from 'ioredis';
import type {
  ISession,
  SessionRepository,
  CreateSessionInput,
  UpdateSessionInput,
} from '../interfaces/ISession.js';
import { v4 as uuidv4 } from 'uuid';

export class RedisSessionRepository implements SessionRepository {
  private readonly redis: Redis;
  private readonly prefix = 'session:';
  private readonly defaultTTL = 60 * 60 * 24; // 24 hours in seconds

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  private getKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  async create({
    userId,
    data = {},
    ttl = this.defaultTTL,
  }: CreateSessionInput): Promise<ISession> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const session: ISession = {
      sessionId,
      userId,
      data,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.redis.set(
      this.getKey(sessionId),
      JSON.stringify(session),
      'EX',
      ttl
    );

    return session;
  }

  async findById(sessionId: string): Promise<ISession | null> {
    const data = await this.redis.get(this.getKey(sessionId));
    if (!data) return null;

    const session = JSON.parse(data) as ISession;

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  async update(
    sessionId: string,
    { data, ttl = this.defaultTTL }: UpdateSessionInput
  ): Promise<ISession | null> {
    const existing = await this.findById(sessionId);
    if (!existing) return null;

    const now = new Date();
    const expiresAt = ttl
      ? new Date(now.getTime() + ttl * 1000)
      : existing.expiresAt;

    const updatedSession: ISession = {
      ...existing,
      data: { ...existing.data, ...data },
      expiresAt,
      updatedAt: now,
    };

    await this.redis.set(
      this.getKey(sessionId),
      JSON.stringify(updatedSession),
      'EX',
      ttl || this.defaultTTL
    );

    return updatedSession;
  }

  async delete(sessionId: string): Promise<boolean> {
    const result = await this.redis.del(this.getKey(sessionId));
    return result > 0;
  }

  async deleteExpired(): Promise<number> {
    // Redis handles expiration automatically, but we can clean up any stale sessions
    // This is a simplified implementation - in production, you might want a more robust solution
    const keys = await this.redis.keys(`${this.prefix}*`);
    let deletedCount = 0;

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl < 0) {
        await this.redis.del(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async findByUserId(userId: string): Promise<ISession[]> {
    // Note: This is inefficient for large numbers of sessions
    // In production, consider maintaining a separate index
    const keys = await this.redis.keys(`${this.prefix}*`);
    const sessions: ISession[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data) as ISession;
        if (
          session.userId === userId &&
          new Date(session.expiresAt) > new Date()
        ) {
          sessions.push(session);
        }
      }
    }

    return sessions;
  }
}
