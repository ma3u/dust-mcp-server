/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  modulePaths: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
        isolatedModules: true,
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|@modelcontextprotocol)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/src/__tests__/'
  ],
  verbose: true,
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  setupFiles: ['<rootDir>/jest.setup.mjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.afterEnv.mjs'],
  testTimeout: 30000,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: 'tsconfig.json',
      useESM: true,
    },
  },
};

export default config;
