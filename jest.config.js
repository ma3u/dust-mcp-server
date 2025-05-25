export default {
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
    extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
    transform: {
        '^.+\\.(t|j)sx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: 'tsconfig.json',
                isolatedModules: true,
                diagnostics: false, // Disable type checking in tests for better performance
            },
        ],
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(.*\\.mjs|@babel|@jest|@types|uuid|chalk|ansi-styles|strip-ansi|jest-util|jest-snapshot|jest-circus|pretty-format|react-is|@testing-library|@babel|@esbuild)/)',
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
        '/node_modules/',
        '/dist/',
        '/coverage/',
        '/src/__tests__/'
    ],
    verbose: true,
    testEnvironmentOptions: {
        NODE_ENV: 'test',
    },
    setupFiles: ['<rootDir>/jest.setup.js'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.afterEnv.js'],
    testTimeout: 30000, // Increased timeout for slower CI environments
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
    transformIgnorePatterns: [
        'node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)',
    ],
};
