# Changelog

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
