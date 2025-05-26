import { Redis as IORedis, RedisOptions as IORedisOptions } from 'ioredis';
import { getLogger } from '../utils/logger.js';

// Use MemoryStore in test environment or when explicitly disabled
const useMemoryStore = process.env.NODE_ENV === 'test' || 
                      process.env.REDIS_DISABLED === 'true' ||
                      process.env.USE_MEMORY_STORE === 'true';

type Redis = IORedis;
type RedisOptions = IORedisOptions;

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
  private static _client: Redis | null = null;
  private static _isConnected = false;
  private static _initialized = false;
  private static _useMemoryStore = false;
  private static _connectionErrors = 0;
  private static readonly MAX_CONNECTION_ERRORS = 10;

  private constructor() {}

  /**
   * Get the Redis client instance
   * @throws {Error} If the client is not initialized
   */
  public static getClient(): Redis {
    if (!RedisConnection._client) {
      throw new Error('Redis client not initialized');
    }
    return RedisConnection._client;
  }

  /**
   * Check if the Redis client is connected
   */
  public static isConnected(): boolean {
    return RedisConnection._isConnected && RedisConnection._client?.status === 'ready';
  }

  /**
   * Check if using in-memory store
   */
  public static isUsingMemoryStore(): boolean {
    return RedisConnection._useMemoryStore;
  }
  
  /**
   * Close the Redis connection
   */
  public static async close(): Promise<void> {
    if (!RedisConnection._client) {
      return;
    }
    
    try {
      await RedisConnection._client.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
      throw error;
    } finally {
      RedisConnection._client = null;
      RedisConnection._isConnected = false;
      RedisConnection._initialized = false;
    }
  }

  public static async initialize(config: RedisConfig = {}): Promise<Redis> {
    if (RedisConnection._initialized && RedisConnection._instance) {
      return RedisConnection._instance as Redis;
    }

    // Use MemoryStore if configured
    if (useMemoryStore) {
      logger.info('Using in-memory store for Redis');
      return this._initializeMemoryStore();
    }

    // Initialize real Redis client
    try {
      const redisOptions: RedisOptions = {
        ...config,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          RedisConnection._connectionErrors++;
          
          // Fallback to memory store after too many connection errors
          if (RedisConnection._connectionErrors >= RedisConnection.MAX_CONNECTION_ERRORS) {
            logger.warn('Too many Redis connection errors, falling back to memory store');
            this._initializeMemoryStore().catch(err => {
              logger.error('Failed to initialize memory store', { error: err.message });
            });
            return null; // Stop retrying
          }
          
          return delay;
        },
        reconnectOnError: (err: Error) => {
          logger.error('Redis connection error', { error: err.message });
          RedisConnection._connectionErrors++;
          
          // Fallback to memory store after too many connection errors
          if (RedisConnection._connectionErrors >= RedisConnection.MAX_CONNECTION_ERRORS) {
            logger.warn('Too many Redis connection errors, falling back to memory store');
            this._initializeMemoryStore().catch(err => {
              logger.error('Failed to initialize memory store', { error: err.message });
            });
            return false; // Stop reconnecting
          }
          
          return true;
        },
      };

      const serverUrl = config.url || process.env.REDIS_URL;
      RedisConnection._instance = serverUrl 
        ? new IORedis(serverUrl, redisOptions)
        : new IORedis(redisOptions);

      RedisConnection._initialized = true;

      // Set up event handlers
      this._setupEventListeners(RedisConnection._instance);

      // Wait for connection to be ready
      await new Promise<void>((resolve, reject) => {
        if (!RedisConnection._instance) {
          return reject(new Error('Redis instance not initialized'));
        }
        
        const onReady = () => {
          cleanup();
          RedisConnection._isConnected = true;
          resolve();
        };

        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };

        const cleanup = () => {
          if (!RedisConnection._instance) return;
          RedisConnection._instance.off('ready', onReady);
          RedisConnection._instance.off('error', onError);
        };

        RedisConnection._instance.once('ready', onReady);
        RedisConnection._instance.once('error', onError);
      });

      logger.info('Redis connection initialized');
      return RedisConnection._instance as Redis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to initialize Redis, falling back to memory store', { error: errorMessage });
      return this._initializeMemoryStore();
    }
  }

  private static async _initializeMemoryStore(): Promise<Redis> {
    try {
      logger.info('Initializing in-memory store');
      
      // Import MemoryStore dynamically to avoid circular dependencies
      const { MemoryStore } = await import('./MemoryStore.js');
      RedisConnection._useMemoryStore = true;
      RedisConnection._instance = MemoryStore.getInstance() as unknown as Redis;
      RedisConnection._isConnected = true;
      RedisConnection._initialized = true;
      
      logger.info('In-memory store initialized successfully');
      return RedisConnection._instance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to initialize memory store', { error: errorMessage });
      throw error;
    }
  }

  public static isConnected(): boolean {
    return RedisConnection._useMemoryStore || RedisConnection._isConnected;
  }

  public static isUsingMemoryStore(): boolean {
    return RedisConnection._useMemoryStore;
  }

  public static async disconnect(): Promise<void> {
    if (!RedisConnection._instance) return;
    
    try {
      // Both real and mock Redis use the same quit method
      await RedisConnection._instance.quit();
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
      throw error;
    } finally {
      RedisConnection._instance = null;
      RedisConnection._isConnected = false;
      RedisConnection._initialized = false;
      RedisConnection._useMemoryStore = false;
    }
  }

  private static _setupEventListeners(redisClient: Redis): void {
    redisClient.on('connect', () => {
      RedisConnection._isConnected = true;
      RedisConnection._connectionErrors = 0;
      logger.info('Redis connection established');
    });

    redisClient.on('error', (error: Error) => {
      RedisConnection._connectionErrors++;
      logger.error('Redis error:', { error });

      // After too many errors, fall back to memory store
      if (RedisConnection._connectionErrors >= RedisConnection.MAX_CONNECTION_ERRORS) {
        logger.warn('Too many Redis connection errors, falling back to memory store');
        this._initializeMemoryStore().catch((err: Error) => {
          logger.error('Failed to initialize memory store', { error: err.message });
        });
      }
    });

    redisClient.on('reconnecting', () => {
      RedisConnection._isConnected = false;
      logger.info('Redis client reconnecting...');
    });

    redisClient.on('end', () => {
      RedisConnection._isConnected = false;
      logger.info('Redis client connection closed');
    });
  }
}

// Initialize Redis connection when this module is imported
let redisClient: Redis;

// This is a workaround for top-level await in ESM
const initRedis = async () => {
  redisClient = await RedisConnection.initialize();
  return redisClient;
};

// Initialize immediately but don't block the module load
const redisClientPromise = initRedis();

export { redisClient, redisClientPromise };
export default RedisConnection;
