import { expect } from '@jest/globals';
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

// Mock any global objects needed for testing
process.env.NODE_ENV = 'test';

// Force Redis to use memory store for tests
process.env.REDIS_DISABLED = 'true';

// Add global test utilities
global.console = {
  ...console,
  // Override any console methods if needed
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
  // log: jest.fn(),
} as Console;

// Mock Redis client for testing
jest.mock('ioredis', () => {
  const MemoryStore = require('../../src/config/MemoryStore').MemoryStore;
  const mockRedis = MemoryStore.getInstance();

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockRedis),
    Redis: jest.fn().mockImplementation(() => mockRedis),
  };
});

// Add any additional global setup here
export {}; // This file needs to be a module
