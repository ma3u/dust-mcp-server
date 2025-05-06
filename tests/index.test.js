/**
 * Main test file for Dust MCP Server
 * 
 * This file imports and runs all the test files for the Dust MCP methods:
 * - dust_agent_query
 * - dust_list_agents
 * - dust_get_agent_config
 * 
 * It also includes integration tests that verify the complete flow.
 */

// Import unit tests
import './unit/dust_agent_query.test.js';
import './unit/dust_list_agents.test.js';
import './unit/dust_get_agent_config.test.js';

// Import integration tests
import './integration/dust_mcp_integration.test.js';

// This file doesn't contain any tests itself, it just imports all test files
// Jest will automatically discover and run all the imported tests
