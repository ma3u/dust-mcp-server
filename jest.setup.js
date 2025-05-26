// Jest setup file
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder and TextDecoder to global for tests
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add any other global test setup here
