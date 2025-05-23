# Changelog

## [1.4.0] - 2025-05-24

### New Features (v1.4.0)

- Upgraded to UUID v7 for time-ordered session IDs
- Added secure directory handling within project boundaries
- Implemented cross-platform path resolution
- Added comprehensive error handling for file system operations
- Enhanced logging for directory creation events
- Added ESLint rules to prevent absolute paths in imports and requires
- Created custom ESLint rule for path handling best practices
- Added script to scan for absolute paths in the codebase

### Improvements (v1.4.0)

- Updated UUID package to latest version supporting v7
- Modified file upload handling to use project-relative paths
- Improved error messages for file system operations
- Updated dependencies to latest stable versions
- Enhanced logger to use project-relative paths with fallbacks
- Improved error handling for log directory creation

### Bug Fixes (v1.4.0)

- Fixed issue with absolute paths causing crashes in different environments
- Improved cross-platform compatibility for path handling
- Resolved issue with directory creation in root filesystem
- Fixed path resolution for cross-platform compatibility
- Addressed potential security issues with file system access

## [1.3.0] - 2025-05-24

### New Features (v1.3.0)

- Implemented structured JSON logging system
- Added request ID correlation for better traceability
- Configured log rotation and file management
- Added support for different log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Implemented MCP-compliant error handling that avoids breaking STDIO protocol
- Added TypeScript type safety throughout the logging system
- Included JSDoc documentation for all public methods

### Improvements (v1.3.0)

- Replaced console.log with structured logging throughout the application
- Improved error handling and reporting
- Optimized log formatting and output
- Updated configuration to support environment-based logging levels

### Bug Fixes (v1.3.0)

- Resolved issues with log file rotation
- Fixed potential memory leaks in log stream handling
- Ensured thread-safe log writing operations
- Addressed all TypeScript type checking issues

## [1.2.0] - 2025-05-19

### New Features (v1.2.0)

- Comprehensive documentation split into User Guide and Developer Guide
- VS Code debugging configuration for both server and tests
- Detailed project structure documentation
- Enhanced test documentation with examples
- Debugging guide with VS Code launch configurations
- VS Code tasks.json for build automation
- Launch configurations for HTTP and STDIO server modes
- Debug configurations for test files and test suites

### Bug Fixes (v1.2.0)

- Linting issues in documentation
- Markdown formatting for better readability
- Code block language specifications
- Duplicate headings in documentation

### Improvements (v1.2.0)

- Updated README organization for better navigation
- Improved code examples with proper syntax highlighting
- Enhanced test documentation with clear examples

## [1.1.1] - 2025-05-06

### Bug Fixes (v1.1.1)

- Resolved Jest ESM syntax errors in unit and integration test files
- Closed all test and describe blocks in dust_get_agent_config.test.js to fix test runner errors
- Ensured all MCP test files only mock client.callTool
- All MCP unit and integration tests now pass successfully

## [1.1.0] - 2025-05-04

### Bug Fixes (v1.1.0)

- Updated all Dust API endpoints to match the official documentation
- Corrected agent configuration endpoint to use `/assistant/agent_configurations/{agentId}`
- Fixed conversation and message endpoints to follow the correct format
- Improved error handling for API requests
- Fixed conversation ID extraction logic

### New Features (v1.1.0)

- Implemented proper logging system that doesn't interfere with STDIO transport
- Created server startup script for easier deployment
- Added test scripts for MCP tool verification
- Enhanced response formatting for MCP tools
- Added detailed documentation for API endpoints

### Improvements (v1.1.0)

- Updated MCP tool implementations to return properly formatted responses
- Improved environment variable handling in test scripts
- Enhanced debug logging for better troubleshooting
- Refactored code for better maintainability

### Removed (v1.1.0)

- Removed unnecessary debug scripts (debug-dust-api.js, debug-query.js, debug-dust-api.sh)
- Removed test scripts that are no longer needed (test-dust-direct.js, test-query-dust-agent.sh)
- Updated .gitignore to properly exclude all log files and debug outputs
