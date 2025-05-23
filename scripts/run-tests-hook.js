#!/usr/bin/env node
/**
 * Windsurf Hook: Run Tests
 * 
 * This hook runs after each Windsurf request to ensure code quality.
 * It runs the test suite and reports any failures.
 */

import { execSync } from 'node:child_process';
import { EOL } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cwd = process.cwd();

// Configuration
const CONFIG = {
  // Run smoke tests by default
  testTypes: ['smoke'],
  // Show test output in the console
  verbose: true,
  // Don't fail the hook on test failures
  bail: false,
  // Timeout for tests (in milliseconds)
  timeout: 30000
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    CONFIG.testTypes = ['unit', 'integration', 'e2e'];
  } else if (args.includes('--e2e')) {
    CONFIG.testTypes = ['e2e'];
  }
  
  if (args.includes('--no-bail')) {
    CONFIG.bail = false;
  }
  
  if (args.includes('--quiet')) {
    CONFIG.verbose = false;
  }
}

// Run tests for a specific type
function runTestType(type) {
  const args = [];
  if (CONFIG.bail) args.push('--bail');
  if (CONFIG.verbose) args.push('--verbose');
  
  const testCmd = `npm run test:${type}${args.length ? ' -- ' + args.join(' ') : ''}`;
  
  if (CONFIG.verbose) {
    console.log(`🚀 Running ${type} tests...`);
    console.log(`   Command: ${testCmd}`);
  }
  
  try {
    // Run with buffer to capture output
    const output = execSync(testCmd, { 
      stdio: ['inherit', 'pipe', 'pipe'],
      encoding: 'utf-8'
    });
    
    if (CONFIG.verbose) {
      console.log(output);
    }
    
    return { success: true };
  } catch (error) {
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    
    return { 
      success: false, 
      error: `❌ ${type} tests failed`,
      details: error.message
    };
  }
}

// Main function
async function main() {
  parseArgs();
  
  if (CONFIG.verbose) {
    console.log('🔍 Running Windsurf test hook...');
    console.log(`📋 Test types: ${CONFIG.testTypes.join(', ')}`);
  }
  
  let allPassed = true;
  const results = [];
  
  // Run tests for each specified type
  for (const type of CONFIG.testTypes) {
    const result = runTestType(type);
    results.push({ type, ...result });
    
    if (!result.success) {
      allPassed = false;
      if (CONFIG.bail) {
        break;
      }
    }
  }
  
  // Print summary
  if (CONFIG.verbose) {
    console.log('\n📊 Test Summary:');
    results.forEach(({ type, success, error }) => {
      const status = success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${type.padEnd(12)} ${status} ${error || ''}`);
    });
    
    if (!allPassed) {
      console.error('\n❌ Some tests failed. Please fix them before continuing.');
      process.exit(1);
    }
    
    console.log('\n🎉 All tests passed!');
  }
  
  return allPassed ? 0 : 1;
}

// Run the hook
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then(code => process.exit(code));
}

export { main as runTests };
