# Changelog

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
