# Changelog

## [1.4.0] - 2025-05-24

### Added

- Upgraded to UUID v7 for time-ordered session IDs
- Added secure directory handling within project boundaries
- Implemented cross-platform path resolution
- Added comprehensive error handling for file system operations
- Enhanced logging for directory creation events

### Changed

- Updated UUID package to latest version supporting v7
- Modified file upload handling to use project-relative paths
- Improved error messages for file system operations
- Updated dependencies to latest stable versions

### Fixed

- Resolved issue with directory creation in root filesystem
- Fixed path resolution for cross-platform compatibility
- Addressed potential security issues with file system access

## [1.3.0] - 2025-05-24

### Added

- Implemented structured JSON logging system
- Added request ID correlation for better traceability
- Configured log rotation and file management
- Added support for different log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Implemented MCP-compliant error handling that avoids breaking STDIO protocol
- Added TypeScript type safety throughout the logging system
- Included JSDoc documentation for all public methods

### Changed

- Replaced console.log with structured logging throughout the application
- Improved error handling and reporting
- Optimized log formatting and output
- Updated configuration to support environment-based logging levels

### Fixed

- Resolved issues with log file rotation
- Fixed potential memory leaks in log stream handling
- Ensured thread-safe log writing operations
- Addressed all TypeScript type checking issues

## [1.2.0] - 2025-05-19

### Added

- Comprehensive documentation split into User Guide and Developer Guide
- VS Code debugging configuration for both server and tests
- Detailed project structure documentation
- Enhanced test documentation with examples
- Debugging guide with VS Code launch configurations
- VS Code tasks.json for build automation
- Launch configurations for HTTP and STDIO server modes
- Debug configurations for test files and test suites

### Fixed

- Linting issues in documentation
- Markdown formatting for better readability
- Code block language specifications
- Duplicate headings in documentation

### Changed

- Updated README organization for better navigation
- Improved code examples with proper syntax highlighting
- Enhanced test documentation with clear examples

## [1.1.1] - 2025-05-06

### Fixed
- Resolved Jest ESM syntax errors in unit and integration test files.
- Closed all test and describe blocks in dust_get_agent_config.test.js to fix test runner errors.
- Ensured all MCP test files only mock client.callTool.
- All MCP unit and integration tests now pass successfully.

## [1.1.0] - 2025-05-04

### Fixed

- Updated all Dust API endpoints to match the official documentation
- Corrected agent configuration endpoint to use `/assistant/agent_configurations/{agentId}`
- Fixed conversation and message endpoints to follow the correct format
- Improved error handling for API requests
- Fixed conversation ID extraction logic

### Added

- Implemented proper logging system that doesn't interfere with STDIO transport
- Created server startup script for easier deployment
- Added test scripts for MCP tool verification
- Enhanced response formatting for MCP tools
- Added detailed documentation for API endpoints

### Changed

- Updated MCP tool implementations to return properly formatted responses
- Improved environment variable handling in test scripts
- Enhanced debug logging for better troubleshooting
- Refactored code for better maintainability

### Removed

- Removed unnecessary debug scripts (debug-dust-api.js, debug-query.js, debug-dust-api.sh)
- Removed test scripts that are no longer needed (test-dust-direct.js, test-query-dust-agent.sh)
- Updated .gitignore to properly exclude all log files and debug outputs
