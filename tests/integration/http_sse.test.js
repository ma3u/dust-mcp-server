/**
 * Integration tests for HTTP and SSE endpoints
 *
 * Tests:
 * - /health HTTP endpoint
 * - /events SSE endpoint
 */
import {
  jest,
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
} from '@jest/globals';
import http from 'http';
import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('HTTP/SSE Integration', () => {
  test('GET /health returns status ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(typeof json.uptime).toBe('number');
  });

  test('SSE /events streams events', async () => {
    // Increase timeout for this test (30s)
    jest.setTimeout(30000);
    let eventReceived = false;
    // Open SSE connection
    const res = await fetch(`${BASE_URL}/events`, {
      headers: { Accept: 'text/event-stream' },
    });
    expect(res.ok).toBe(true);
    const reader = res.body.getReader();
    // Trigger a health event
    await fetch(`${BASE_URL}/health`);
    // Read the stream for up to 5 seconds
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = value ? new TextDecoder().decode(value) : '';
      if (chunk.includes('event: health')) {
        eventReceived = true;
        break;
      }
    }
    reader.cancel();
    expect(eventReceived).toBe(true);
  });
});
