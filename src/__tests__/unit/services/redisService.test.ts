import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import RedisConnection from '../../../config/redis';

// Create a mock Redis client
const createMockRedis = () => ({
  on: jest.fn().mockReturnThis(),
  quit: jest.fn().mockResolvedValue('OK'),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue('test-value'),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  status: 'ready',
});

// Mock ioredis
const mockRedis = createMockRedis();
const mockRedisModule = jest.fn().mockImplementation(() => mockRedis);

// Mock ioredis-mock
const mockRedisMock = createMockRedis();
const mockRedisMockModule = {
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockRedisMock)
};

// Mock the modules
jest.mock('ioredis', () => ({
  __esModule: true,
  default: mockRedisModule
}));

jest.mock('ioredis-mock', () => mockRedisMockModule);

describe('RedisConnection', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original process.env
    originalEnv = { ...process.env };
    
    // Clear all mocks and reset the module state
    jest.clearAllMocks();
    
    // Reset the singleton instance before each test
    (RedisConnection as any)._instance = null;
    (RedisConnection as any)._isConnected = false;
    (RedisConnection as any)._initialized = false;
    (RedisConnection as any)._useMemoryStore = false;
  });
  
  afterEach(async () => {
    // Clean up after each test
    await RedisConnection.disconnect();
    
    // Restore original process.env
    process.env = { ...originalEnv };
  });
  
  describe('initialize', () => {
    it('should use mock Redis when REDIS_DISABLED is true', () => {
      // Arrange
      process.env.REDIS_DISABLED = 'true';
      
      // Act
      const client = RedisConnection.initialize();
      
      // Assert
      expect(RedisConnection.isUsingMemoryStore()).toBe(true);
      expect(client).toBeDefined();
    });
    
    it('should use mock Redis when in test environment', () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      
      // Act
      const client = RedisConnection.initialize();
      
      // Assert
      expect(RedisConnection.isUsingMemoryStore()).toBe(true);
      expect(client).toBeDefined();
    });
    
    it('should create a Redis client with URL from environment', () => {
      // Arrange
      const redisUrl = 'redis://localhost:6379';
      process.env.REDIS_URL = redisUrl;
      
      // Act
      const client = RedisConnection.initialize();
      
      // Assert
      expect(IORedis).toHaveBeenCalledTimes(1);
      expect(IORedis).toHaveBeenCalledWith(redisUrl, expect.any(Object));
    });
    
    it('should return the same instance on subsequent calls', () => {
      // Arrange & Act
      const client1 = RedisConnection.initialize();
      const client2 = RedisConnection.initialize();
      
      // Assert
      expect(client1).toBe(client2);
      expect(IORedis).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('getClient', () => {
    it('should return the Redis client instance', () => {
      // Arrange
      const client = RedisConnection.initialize();
      
      // Act
      const result = RedisConnection.getClient();
      
      // Assert
      expect(result).toBe(client);
    });
    
    it('should throw an error if Redis is not initialized', () => {
      // Act & Assert
      expect(() => RedisConnection.getClient()).toThrow('Redis client not initialized');
    });
  });
  
  describe('isConnected', () => {
    it('should return true if Redis is connected', () => {
      // Arrange
      RedisConnection.initialize();
      
      // Act & Assert
      expect(RedisConnection.isConnected()).toBe(true);
    });
    
    it('should return false if Redis is not connected', () => {
      // Act & Assert
      expect(RedisConnection.isConnected()).toBe(false);
    });
  });
  
  describe('isUsingMemoryStore', () => {
    it('should return true when using memory store', () => {
      // Arrange
      process.env.REDIS_DISABLED = 'true';
      RedisConnection.initialize();
      
      // Act & Assert
      expect(RedisConnection.isUsingMemoryStore()).toBe(true);
    });
    
    it('should return false when using real Redis', () => {
      // Arrange
      delete process.env.REDIS_DISABLED;
      process.env.NODE_ENV = 'production';
      RedisConnection.initialize();
      
      // Act & Assert
      expect(RedisConnection.isUsingMemoryStore()).toBe(false);
    });
  });
  
  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      // Arrange
      RedisConnection.initialize();
      
      // Act
      await RedisConnection.disconnect();
      
      // Assert
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(RedisConnection.isConnected()).toBe(false);
    });
    
    it('should not throw if Redis is not connected', async () => {
      // Act & Assert
      await expect(RedisConnection.disconnect()).resolves.not.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return connection status', () => {
      expect(RedisConnection.isConnected()).toBe(false);
      
      RedisConnection.initialize();
      (RedisConnection as any)._isConnected = true;
      
      expect(RedisConnection.isConnected()).toBe(true);
    });
  });
  
  describe('connection events', () => {
    it('should log on successful connection', () => {
      // Arrange
      const logger = require('../../../../utils/logger').getLogger();
      const logSpy = jest.spyOn(logger, 'info');
      
      // Simulate connection event
      RedisConnection.initialize();
      const connectHandler = (MockedIORedis.mock.instances[0] as any).on.mock.calls
        .find(([event]: [string]) => event === 'connect')[1];
      
      // Act
      connectHandler();
      
      // Assert
      expect(logSpy).toHaveBeenCalledWith('Redis connection established');
    });
    
    it('should handle connection errors', () => {
      // Arrange
      const logger = require('../../../../utils/logger').getLogger();
      const errorSpy = jest.spyOn(logger, 'error');
      const testError = new Error('Connection failed');
      
      // Simulate error event
      RedisConnection.initialize();
      const errorHandler = (MockedIORedis.mock.instances[0] as any).on.mock.calls
        .find(([event]: [string]) => event === 'error')[1];
      
      // Act
      errorHandler(testError);
      
      // Assert
      expect(errorSpy).toHaveBeenCalledWith('Redis connection error', { error: 'Connection failed' });
    });
  });
  
  describe('connection management', () => {
    it('should close the connection when close is called', async () => {
      // Arrange
      const client = RedisConnection.initialize();
      
      // Act
      await RedisConnection.close();
      
      // Assert
      expect(mockRedis.quit).toHaveBeenCalledTimes(1);
    });
    
    it('should handle errors during connection close', async () => {
      // Arrange
      const error = new Error('Failed to close');
      mockRedis.quit.mockRejectedValueOnce(error);
      const logger = require('../../../../utils/logger').getLogger();
      const errorSpy = jest.spyOn(logger, 'error');
      
      RedisConnection.initialize();
      
      // Act & Assert
      await expect(RedisConnection.close()).rejects.toThrow('Failed to close');
      expect(errorSpy).toHaveBeenCalledWith('Error closing Redis connection', { error });
    });
  });
});
