import Redis from 'ioredis';
import { logger } from '../utils/logger';

class RedisClient {
  private static instance: Redis;
  private static isConnected = false;

  private constructor() {}

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      RedisClient.instance = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      });

      RedisClient.setupEventListeners();
    }

    return RedisClient.instance;
  }

  private static setupEventListeners(): void {
    if (!RedisClient.instance) return;

    RedisClient.instance.on('connect', () => {
      RedisClient.isConnected = true;
      logger.info('Redis client connected');
    });

    RedisClient.instance.on('error', (err) => {
      if (RedisClient.isConnected) {
        logger.error('Redis error:', err);
      } else {
        logger.error('Failed to connect to Redis:', err);
      }
      RedisClient.isConnected = false;
    });

    RedisClient.instance.on('reconnecting', () => {
      logger.info('Reconnecting to Redis...');
    });

    RedisClient.instance.on('end', () => {
      RedisClient.isConnected = false;
      logger.info('Redis connection closed');
    });
  }

  public static async close(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.isConnected = false;
    }
  }
}

export const redisClient = RedisClient.getInstance();

export default redisClient;
