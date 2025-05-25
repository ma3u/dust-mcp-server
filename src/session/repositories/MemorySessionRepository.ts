import { v4 as uuidv4 } from 'uuid';
import type { ISession, CreateSessionInput, UpdateSessionInput } from '../interfaces/ISession.js';
import { MemoryStore } from '../../../config/MemoryStore.js';
import type { SessionRepository } from '../interfaces/ISession.js';

/**
 * In-memory implementation of SessionRepository using MemoryStore
 */
export class MemorySessionRepository implements SessionRepository {
  private readonly prefix = 'session:';
  private readonly defaultTTL = 60 * 60 * 24; // 24 hours in seconds
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  private getKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  async create({ userId, data = {}, ttl = this.defaultTTL }: CreateSessionInput): Promise<ISession> {
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

    await this.store.set(this.getKey(sessionId), JSON.stringify(session), ttl);
    return session;
  }

  async findById(sessionId: string): Promise<ISession | null> {
    const data = await this.store.get(this.getKey(sessionId));
    if (!data) return null;
    
    const session = JSON.parse(data) as ISession;
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.delete(sessionId);
      return null;
    }
    
    return session;
  }

  async update(sessionId: string, updates: UpdateSessionInput): Promise<ISession | null> {
    const existing = await this.findById(sessionId);
    if (!existing) return null;

    const updatedSession: ISession = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    // Get remaining TTL
    const ttl = await this.store.ttl(this.getKey(sessionId));
    
    await this.store.set(
      this.getKey(sessionId), 
      JSON.stringify(updatedSession), 
      ttl > 0 ? ttl : this.defaultTTL
    );
    
    return updatedSession;
  }

  async delete(sessionId: string): Promise<boolean> {
    const result = await this.store.del(this.getKey(sessionId));
    return result > 0;
  }

  async findByUserId(userId: string): Promise<ISession[]> {
    // Note: This is inefficient for memory store as it scans all keys
    // Consider using a secondary index if this is a common operation
    const keys = await this.store.keys(`${this.prefix}*`);
    const sessions: ISession[] = [];
    
    for (const key of keys) {
      const data = await this.store.get(key);
      if (data) {
        const session = JSON.parse(data) as ISession;
        if (session.userId === userId) {
          sessions.push(session);
        }
      }
    }
    
    return sessions;
  }

  async deleteExpired(): Promise<number> {
    // This is handled automatically by MemoryStore's TTL
    // But we can implement a manual check if needed
    const keys = await this.store.keys(`${this.prefix}*`);
    let deleted = 0;
    
    for (const key of keys) {
      const data = await this.store.get(key);
      if (data) {
        const session = JSON.parse(data) as ISession;
        if (new Date(session.expiresAt) < new Date()) {
          await this.store.del(key);
          deleted++;
        }
      }
    }
    
    return deleted;
  }

  async deleteAll(): Promise<void> {
    const keys = await this.store.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.store.del(...keys);
    }
  }
}
