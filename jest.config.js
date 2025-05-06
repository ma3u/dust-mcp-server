/**
 * Jest configuration for Dust MCP Server tests
 */

export default {
  // Specify test environment
  testEnvironment: 'node',
  
  // File extensions to consider as test files
  testMatch: ['**/*.test.js'],
  
  // Transform TypeScript files
  transform: {
    '^.+\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Setup test timeouts
  testTimeout: 10000,
  
  // Coverage configuration
  collectCoverage: false, // Disable coverage for now to focus on getting tests running
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/examples/**',
  ],
  
  // Verbose output
  verbose: true,
  
  // Setup files
  setupFiles: [],
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Support for ES modules
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol)/)',
  ],
};
