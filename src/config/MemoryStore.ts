import { LRUCache } from 'lru-cache';
import { getLogger } from '../utils/logger.js';

const logger = getLogger({ logFilePrefix: 'memory-store' });

type CacheValue = any;

// Define a Redis-compatible interface for MemoryStore
interface RedisCompatible {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushall(): Promise<'OK'>;
  on(event: string, callback: Function): void;
  quit(): Promise<'OK'>;
  disconnect(): void;
}

/**
 * In-memory cache implementation using lru-cache with Redis-compatible interface
 */
export class MemoryStore implements RedisCompatible {
  // Event emitter for compatibility with Redis client
  private eventListeners: Map<string, Function[]> = new Map();
  private static instance: MemoryStore;
  private cache: LRUCache<string, CacheValue>;
  private ttlCache: Map<string, NodeJS.Timeout>;

  private constructor() {
    this.cache = new LRUCache({
      max: 1000, // Maximum number of items
      ttl: 1000 * 60 * 60, // Default TTL: 1 hour
      updateAgeOnGet: true, // Update the TTL when the item is accessed
    });

    this.ttlCache = new Map();
  }

  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
      logger.info('MemoryStore initialized');
    }
    return MemoryStore.instance;
  }

  public async set(key: string, value: any, ttl?: number): Promise<'OK'> {
    this.cache.set(key, value, { ttl: ttl ? ttl * 1000 : undefined });
    this.clearTtlTimeout(key);

    if (ttl) {
      const timeout = setTimeout(() => {
        this.cache.delete(key);
        this.ttlCache.delete(key);
      }, ttl * 1000);

      this.ttlCache.set(key, timeout);
    }

    return 'OK';
  }

  public async get(key: string): Promise<string | null> {
    const value = this.cache.get(key);
    if (value === undefined) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  public async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        this.clearTtlTimeout(key);
        count++;
      }
    }
    return count;
  }

  public async expire(key: string, ttl: number): Promise<number> {
    const value = this.cache.get(key);
    if (value === undefined) return 0;

    await this.set(key, value, ttl);
    return 1;
  }

  public async quit(): Promise<'OK'> {
    this.ttlCache.forEach((timeout) => clearTimeout(timeout));
    this.ttlCache.clear();
    this.cache.clear();
    // Emit end event for compatibility
    const endListeners = this.eventListeners.get('end') || [];
    endListeners.forEach((callback) => callback());
    logger.info('MemoryStore connection closed');
    return 'OK';
  }

  public async keys(pattern: string = '*'): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    if (pattern === '*') {
      return allKeys;
    }

    // Simple pattern matching (supports only * wildcard)
    const regexPattern = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return allKeys.filter((key) => regexPattern.test(key));
  }

  public async flushall(): Promise<'OK'> {
    this.cache.clear();
    this.ttlCache.forEach((timeout) => clearTimeout(timeout));
    this.ttlCache.clear();
    return 'OK';
  }

  private clearTtlTimeout(key: string): void {
    const timeout = this.ttlCache.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.ttlCache.delete(key);
    }
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.reduce(
      (count, key) => count + (this.cache.has(key.toString()) ? 1 : 0),
      0
    );
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async ttl(key: string): Promise<number> {
    const value = this.cache.get(key);
    if (value === undefined) return -2; // Key doesn't exist

    // For simplicity, we'll return -1 (no expiry) for all existing keys
    // since lru-cache doesn't expose TTL directly in the public API
    return -1;
  }

  // Implement the on method for event handling
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  // Implement the disconnect method
  public disconnect(): void {
    this.quit().catch(() => {});
  }
}
