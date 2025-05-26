export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    modulePaths: ['<rootDir>'],
    moduleDirectories: ['node_modules', '<rootDir>'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^\\.(css|less|scss)$': 'identity-obj-proxy',
        '^axios$': '<rootDir>/src/__mocks__/axios.ts',
        '^(\.{1,2}/.*)\\.js$': '$1',
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx', '.js'],
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
        'node_modules/(?!(uuid|axios|@babel|@jest|@types|chalk|ansi-styles|strip-ansi|jest-util|jest-snapshot|jest-circus|pretty-format|react-is|@testing-library|@esbuild|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|@modelcontextprotocol)/)',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
    testMatch: [
        '**/__tests__/**/*.test.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
    ],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    verbose: true,
    testEnvironmentOptions: {
        NODE_ENV: 'test',
        url: 'http://localhost:3000'
    },
    setupFiles: ['<rootDir>/jest.setup.js'],
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    testTimeout: 30000,
    testPathIgnorePatterns: [
        '/node_modules/'
    ],
    globals: {
        'ts-jest': {
            isolatedModules: true,
            tsconfig: 'tsconfig.json',
            useESM: true,
        },
    },
};
