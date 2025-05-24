import IORedis, { Redis, RedisOptions } from 'ioredis';
import { getLogger } from '../utils/logger.js';

// Get logger instance with Redis context
const logger = getLogger({
  logFilePrefix: 'redis',
  includeTimestamps: true,
  includeRequestId: true
});

type RedisConfig = RedisOptions & {
  url?: string;
};

class RedisConnection {
  private static _instance: Redis;
  private static _isConnected = false;
  private static _initialized = false;

  private constructor() {}

  public static getInstance(config: RedisConfig = {}): Redis {
    if (!RedisConnection._initialized) {
      throw new Error('Redis connection not initialized. Call RedisConnection.initialize() first.');
    }
    return RedisConnection._instance;
  }

  public static initialize(config: RedisConfig = {}): Redis {
    if (RedisConnection._initialized) {
      return RedisConnection._instance;
    }

    const redisUrl = process.env.REDIS_URL || config.url;
    const redisOptions: RedisOptions = {
      ...config,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        logger.error('Redis connection error', { error: err.message });
        return true;
      },
    };
    
    // Create Redis client with proper configuration
    RedisConnection._instance = redisUrl 
      ? new IORedis(redisUrl, redisOptions)
      : new IORedis(redisOptions);

    RedisConnection._setupEventListeners();
    RedisConnection._initialized = true;
    return RedisConnection._instance;
  }

  public static isConnected(): boolean {
    return RedisConnection._isConnected;
  }

  public static async disconnect(): Promise<void> {
    if (RedisConnection._instance) {
      await RedisConnection._instance.quit();
      RedisConnection._instance = null;
      RedisConnection._isConnected = false;
    }
  }

  private static _setupEventListeners(): void {
    RedisConnection._instance.on('connect', () => {
      RedisConnection._isConnected = true;
      logger.info('Redis client connected');
    });

    RedisConnection._instance.on('ready', () => {
      RedisConnection._isConnected = true;
      logger.info('Redis client ready');
    });

    RedisConnection._instance.on('error', (err: Error) => {
      RedisConnection._isConnected = false;
      logger.error('Redis client error', { error: err.message });
    });

    RedisConnection._instance.on('close', () => {
      RedisConnection._isConnected = false;
      logger.warn('Redis client connection closed');
    });

    RedisConnection._instance.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    RedisConnection._instance.on('end', () => {
      RedisConnection._isConnected = false;
      logger.info('Redis connection closed');
    });
  }
}

// Initialize Redis connection when this module is imported
const redisClient = RedisConnection.initialize();

export { redisClient };
export default RedisConnection;
