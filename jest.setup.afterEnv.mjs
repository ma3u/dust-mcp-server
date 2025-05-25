// This file runs after Jest has been initialized in the test environment
import { jest } from '@jest/globals';

// Global test timeout (30 seconds)
jest.setTimeout(30000);

// Global before/after hooks
beforeAll(async () => {
  // Set up any test fixtures or mocks here
  console.log('Global test setup');
});

afterAll(async () => {
  // Clean up any test fixtures or mocks here
  console.log('Global test teardown');
});

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
