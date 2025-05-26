#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'coverage',
  'dist',
  'build',
  '.next',
  '.vercel',
  '.github',
  '.vscode',
  '.idea',
  'logs',
  'temp',
  'tmp',
];

const ABSOLUTE_PATH_REGEX =
  /(?:['"`]\s*)(\/|\\)(?!\/|\\)|(?:['"`]\s*)[A-Za-z]:[\\/]|(?:['"`]\s*)\\/g;

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  underline: '\x1b[4m',
};

function logError(message) {
  console.error(`${colors.red}${colors.bold}ERROR:${colors.reset} ${message}`);
}

function logWarning(message) {
  console.warn(
    `${colors.yellow}${colors.bold}WARNING:${colors.reset} ${message}`
  );
}

function logSuccess(message) {
  console.log(
    `${colors.green}${colors.bold}SUCCESS:${colors.reset} ${message}`
  );
}

function logInfo(message) {
  console.log(`${colors.blue}${colors.bold}INFO:${colors.reset} ${message}`);
}

function findFiles(dir, filePattern, ignoreDirs = []) {
  let results = [];
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (ignoreDirs.includes(file)) {
      return;
    }

    if (stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, filePattern, ignoreDirs));
    } else if (filePattern.test(file)) {
      results.push(fullPath);
    }
  });

  return results;
}

function checkFileForAbsolutePaths(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    const match = ABSOLUTE_PATH_REGEX.exec(line);
    if (match) {
      issues.push({
        line: index + 1,
        column: match.index + 1,
        match: match[0].trim(),
        context: line.trim(),
      });
    }
    // Reset the lastIndex for the next iteration
    ABSOLUTE_PATH_REGEX.lastIndex = 0;
  });

  if (issues.length > 0) {
    logWarning(
      `Found ${issues.length} potential absolute path(s) in ${relativePath}:`
    );
    issues.forEach((issue) => {
      console.log(`  Line ${issue.line}:${issue.column} - ${issue.match}`);
      console.log(`    ${issue.context}`);
    });
    return issues.length;
  }
  return 0;
}

function main() {
  logInfo('Scanning for absolute paths in the codebase...');

  // Find all TypeScript and JavaScript files
  const files = [
    ...findFiles(ROOT_DIR, /\.(js|jsx|ts|tsx)$/, IGNORE_DIRS),
    ...findFiles(ROOT_DIR, /\.json$/, IGNORE_DIRS),
  ];

  logInfo(`Found ${files.length} files to check`);

  let totalIssues = 0;
  files.forEach((file) => {
    totalIssues += checkFileForAbsolutePaths(file);
  });

  if (totalIssues > 0) {
    logError(`Found ${totalIssues} absolute path(s) in the codebase`);
    logInfo('Please replace absolute paths with path.join() or path.resolve()');
    process.exit(1);
  } else {
    logSuccess('No absolute paths found in the codebase!');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { checkFileForAbsolutePaths };
