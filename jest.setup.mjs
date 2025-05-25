// Setup file for Jest tests
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '.env.test' });

// Set default environment variables for testing
process.env.NODE_ENV = 'test';

// Force memory store for tests unless explicitly set to redis
if (process.env.SESSION_STORE_TYPE !== 'redis') {
    process.env.SESSION_STORE_TYPE = 'memory';
}

// Mock any global objects or modules here
if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = await import('node:util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}
