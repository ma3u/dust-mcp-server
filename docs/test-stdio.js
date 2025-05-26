// Test script for Dust MCP server using STDIO transport
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Setup logging directory
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logger function
function logger(level, message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;

  // Write to log file
  fs.appendFileSync(
    path.join(
      LOG_DIR,
      `test-stdio-${new Date().toISOString().split('T')[0]}.log`
    ),
    logMessage + '\n'
  );

  // Also output to console
  console.log(logMessage);
}

// Test Dust MCP server using STDIO transport
async function testStdioTransport() {
  try {
    logger('INFO', 'Starting STDIO transport test...');

    // Create MCP client
    const client = new Client({
      name: 'Dust MCP Test Client',
      version: '1.0.0',
    });

    // Spawn the server process
    const serverProcess = spawn('node', ['build/dust.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Create STDIO transport
    const transport = new StdioClientTransport({
      stdin: serverProcess.stdin,
      stdout: serverProcess.stdout,
      stderr: serverProcess.stderr,
    });

    // Connect client to transport
    await client.connect(transport);

    logger('INFO', 'Connected to MCP server using STDIO transport');

    // Test dust_list_agents tool
    logger('INFO', 'Testing dust_list_agents tool...');
    try {
      const agentsResponse = await client.callTool({
        name: 'dust_list_agents',
        params: {
          limit: 5,
        },
      });

      logger('INFO', 'dust_list_agents response:', agentsResponse);
    } catch (error) {
      logger('ERROR', 'Error testing dust_list_agents:', error);
    }

    // Test dust_agent_query tool
    logger('INFO', 'Testing dust_agent_query tool...');
    try {
      const queryResponse = await client.callTool({
        name: 'dust_agent_query',
        params: {
          query: 'Give me a summary of the Dust API',
        },
      });

      logger('INFO', 'dust_agent_query response:', queryResponse);
    } catch (error) {
      logger('ERROR', 'Error testing dust_agent_query:', error);
    }

    logger('INFO', 'STDIO transport test completed');

    // Clean up
    serverProcess.kill();
  } catch (error) {
    logger('ERROR', 'Error testing STDIO transport:', error);
  }
}

// Run the test
testStdioTransport();
