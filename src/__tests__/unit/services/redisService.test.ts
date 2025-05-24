import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import IORedis from 'ioredis';
import { RedisConnection } from '../../../../config/redis';

// Mock ioredis
jest.mock('ioredis');

const MockedIORedis = IORedis as jest.MockedClass<typeof IORedis>;

describe('RedisConnection', () => {
  let mockRedis: jest.Mocked<IORedis.Redis>;
  
  beforeEach(() => {
    // Clear all mocks and reset the module state
    jest.clearAllMocks();
    jest.resetModules();
    
    // Create a fresh mock Redis instance
    mockRedis = {
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('test-value'),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      // Add other Redis methods as needed
    } as unknown as jest.Mocked<IORedis.Redis>;
    
    // Mock the IORedis constructor to return our mock instance
    MockedIORedis.mockImplementation(() => mockRedis);
  });
  
  afterEach(() => {
    // Clean up the singleton instance after each test
    jest.resetModules();
  });
  
  describe('initialize', () => {
    it('should create a Redis client with default configuration', () => {
      // Arrange
      delete process.env.REDIS_URL;
      
      // Act
      const client = RedisConnection.initialize();
      
      // Assert
      expect(MockedIORedis).toHaveBeenCalledTimes(1);
      expect(MockedIORedis).toHaveBeenCalledWith(expect.any(Object));
      expect(client).toBeDefined();
    });
    
    it('should create a Redis client with URL from environment', () => {
      // Arrange
      const redisUrl = 'redis://localhost:6379';
      process.env.REDIS_URL = redisUrl;
      
      // Act
      const client = RedisConnection.initialize();
      
      // Assert
      expect(MockedIORedis).toHaveBeenCalledTimes(1);
      expect(MockedIORedis).toHaveBeenCalledWith(redisUrl, expect.any(Object));
    });
    
    it('should return the same instance on subsequent calls', () => {
      // Arrange & Act
      const client1 = RedisConnection.initialize();
      const client2 = RedisConnection.initialize();
      
      // Assert
      expect(client1).toBe(client2);
      expect(MockedIORedis).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('getInstance', () => {
    it('should throw an error if not initialized', () => {
      // Arrange
      // Reset the singleton state
      jest.resetModules();
      const { RedisConnection: FreshRedisConnection } = require('../../../../config/redis');
      
      // Act & Assert
      expect(() => FreshRedisConnection.getInstance()).toThrow('Redis connection not initialized');
    });
    
    it('should return the Redis client instance after initialization', () => {
      // Arrange
      const client = RedisConnection.initialize();
      
      // Act
      const instance = RedisConnection.getInstance();
      
      // Assert
      expect(instance).toBe(client);
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
