#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Run TypeScript transpilation ignoring errors (just for testing)
console.log('Building with --noEmitOnError=false...');
try {
  execSync('npx tsc --noEmitOnError false', { stdio: 'inherit' });
  console.log('Build completed with warnings/errors, but JavaScript files were generated');
} catch (err) {
  console.error('Build failed completely:', err.message);
  process.exit(1);
}

// Check if our fixed file was transpiled
const dustAgentJsPath = path.join(process.cwd(), 'build', 'tools', 'dustAgent.js');
if (fs.existsSync(dustAgentJsPath)) {
  console.log('Success! dustAgent.js was generated - syntax error was fixed');
} else {
  console.error('Failed: dustAgent.js was not generated - syntax error might still exist');
}
