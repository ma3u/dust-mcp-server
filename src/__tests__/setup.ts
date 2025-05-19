// Import any test setup code here
import 'jest-extended';

// Global test timeout
jest.setTimeout(30000);

// Mock any global objects needed for testing
// For example, if you're using environment variables in your tests
process.env.NODE_ENV = 'test';

// Add global test utilities
global.console = {
  ...console,
  // Override any console methods if needed
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
  // log: jest.fn(),
};
