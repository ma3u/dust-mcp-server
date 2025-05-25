import type { Redis } from 'ioredis';
import type { SessionRepository } from '../interfaces/ISession.js';
import { RedisSessionRepository } from '../repositories/RedisSessionRepository.js';
import { MemorySessionRepository } from '../repositories/MemorySessionRepository.js';
import { MemoryStore } from '../../config/MemoryStore.js';

/**
 * Factory for creating the appropriate session store based on configuration
 */
export class SessionStoreFactory {
  /**
   * Creates a session repository based on the current configuration
   * @param redisClient Optional Redis client (required for Redis store)
   * @returns Configured session repository
   */
  /**
   * Creates a session repository based on configuration
   * @param redisClient Optional Redis client (required for Redis store)
   * @returns Configured session repository
   */
  static createSessionRepository(redisClient?: Redis): SessionRepository {
    const storeType = process.env.SESSION_STORE_TYPE || 'memory';
    const useMemoryStore = 
      storeType === 'memory' || 
      process.env.REDIS_DISABLED === 'true' || 
      process.env.USE_MEMORY_STORE === 'true' ||
      process.env.NODE_ENV === 'test';

    if (useMemoryStore) {
      console.log('Using in-memory session store');
      return new MemorySessionRepository(MemoryStore.getInstance());
    }

    if (!redisClient) {
      console.warn('Redis client not provided, falling back to in-memory store');
      return new MemorySessionRepository(MemoryStore.getInstance());
    }

    console.log('Using Redis session store');
    return new RedisSessionRepository(redisClient);
  }
}
