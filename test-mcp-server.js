#!/usr/bin/env node

// This script tests the MCP server functionality
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000/mcp';

console.log('Testing MCP Server Functionality');
console.log('===============================\n');

// Helper function to make requests
async function makeRequest(method, url, headers = {}, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`Making ${method} request to ${url}`);
  console.log('Headers:', JSON.stringify(options.headers, null, 2));
  if (body) {
    console.log('Request body:', JSON.stringify(body, null, 2));
  }

  const response = await fetch(url, options);
  console.log(`Response status: ${response.status}`);
  
  const responseHeaders = {};
  response.headers.forEach((value, name) => {
    responseHeaders[name] = value;
  });
  console.log('Response headers:', JSON.stringify(responseHeaders, null, 2));
  
  try {
    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
    return { status: response.status, headers: responseHeaders, data };
  } catch (error) {
    console.log('Failed to parse response as JSON:', error.message);
    const text = await response.text();
    console.log('Raw response:', text);
    return { status: response.status, headers: responseHeaders, text };
  }
}

// Main test flow
async function runTest() {
  try {
    // Step 1: Initialize the MCP connection
    console.log('\n\x1b[34mStep 1: Sending initialization request...\x1b[0m');
    
    const initResult = await makeRequest('POST', SERVER_URL, {}, {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        client: {
          name: 'mcp-test-client',
          version: '1.0.0'
        },
        capabilities: ['tools']
      },
      id: 1
    });
    
    // Extract session ID from response headers or body
    let sessionId = null;
    
    // Try to get from headers first (standard approach)
    if (initResult.headers['mcp-session-id']) {
      sessionId = initResult.headers['mcp-session-id'];
      console.log(`\x1b[32mFound session ID in headers: ${sessionId}\x1b[0m`);
    }
    // Then try from response if available
    else if (initResult.data?.result?.sessionId) {
      sessionId = initResult.data.result.sessionId;
      console.log(`\x1b[32mFound session ID in response body: ${sessionId}\x1b[0m`);
    }
    else {
      console.error('\x1b[31mNo session ID found in response! Check server implementation.\x1b[0m');
      process.exit(1);
    }
    
    // Step 2: List available tools
    console.log('\n\x1b[34mStep 2: Retrieving available tools...\x1b[0m');
    
    await makeRequest('POST', SERVER_URL, {
      'mcp-session-id': sessionId
    }, {
      jsonrpc: '2.0',
      method: 'listTools',
      params: {},
      id: 2
    });
    
    // Step 3: Test the health endpoint
    console.log('\n\x1b[34mStep 3: Testing health endpoint...\x1b[0m');
    
    const healthResult = await makeRequest('GET', 'http://localhost:3000/health');
    
    if (healthResult.data?.status === 'ok') {
      console.log('\x1b[32mHealth endpoint is working!\x1b[0m');
    } else {
      console.log('\x1b[31mHealth endpoint not responding correctly\x1b[0m');
    }
    
    // Step 4: Clean up session
    console.log('\n\x1b[34mStep 4: Cleaning up session...\x1b[0m');
    
    await makeRequest('DELETE', SERVER_URL, { 'mcp-session-id': sessionId });
    
    console.log('\n\x1b[32mMCP Server Test Complete!\x1b[0m');
  } catch (error) {
    console.error('\x1b[31mTest failed with error:', error, '\x1b[0m');
    process.exit(1);
  }
}

// Run the test
runTest();
