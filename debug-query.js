// Debug script for MCP server query_dust_agent
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Create debug logs directory if it doesn't exist
const debugLogsDir = path.join(process.cwd(), 'logs', 'debug');
if (!fs.existsSync(debugLogsDir)) {
  fs.mkdirSync(debugLogsDir, { recursive: true });
}

// Create a debug log file
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFile = path.join(debugLogsDir, `query-debug-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log function
const log = (message) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  logStream.write(formattedMessage);
  console.log(formattedMessage);
};

// Log environment variables (redacting sensitive values)
log('Environment variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')) {
    log(`${key}=***REDACTED***`);
  } else if (key.startsWith('DUST_')) {
    log(`${key}=${process.env[key]}`);
  }
});

// Run the MCP query
log('Running query_dust_agent...');
const query = {
  query: "Give me a summary",
  agentId: "helper", // Explicitly specify an agent
  echo: true // Enable echo for debugging
};

log(`Query parameters: ${JSON.stringify(query, null, 2)}`);

// Spawn the MCP process
const mcp = spawn('mcp', [
  'call', 
  'query_dust_agent', 
  'node', 
  'build/index.js', 
  '--params', 
  JSON.stringify(query)
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Capture stdout
mcp.stdout.on('data', (data) => {
  const output = data.toString();
  log(`STDOUT: ${output}`);
});

// Capture stderr
mcp.stderr.on('data', (data) => {
  const output = data.toString();
  log(`STDERR: ${output}`);
});

// Handle process exit
mcp.on('close', (code) => {
  log(`Process exited with code ${code}`);
  logStream.end();
  console.log(`Debug log written to: ${logFile}`);
});
