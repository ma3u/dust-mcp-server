# Decision Log

This file records architectural and implementation decisions using a list format.

---
"2025-05-24 01:10:00" - Implemented Structured Logging System

## Decision 6: Structured Logging Implementation

* Implemented a comprehensive logging system with multiple log levels
* Added support for structured JSON logging with metadata
* Ensured MCP protocol compliance by avoiding STDIO pollution
* Added request ID correlation for distributed tracing

### Decision 6 Rationale

* Needed a robust logging solution that works with the MCP protocol
* Required structured logs for better log analysis and querying
* Needed to maintain performance while providing detailed logging
* Required thread-safe operations for concurrent request handling

### Decision 6 Implementation

* Created `Logger` class with configurable log levels and outputs
* Implemented file-based logging with rotation support
* Added support for request ID correlation
* Ensured proper error handling and fallbacks
* Added TypeScript type safety throughout
* Documented all public APIs with JSDoc
* Added environment-based configuration
* Implemented proper cleanup of resources

---
"2025-05-19 10:55:00" - Added VS Code Debugging and Testing Infrastructure

## Decision 5: VS Code Debugging and Testing Infrastructure

* Implemented comprehensive VS Code debugging configurations
* Set up Jest testing infrastructure with TypeScript support
* Added test coverage reporting
* Documented testing and debugging patterns

### Decision 5 Rationale

* VS Code debugging improves developer productivity
* Jest provides a robust testing framework with good TypeScript support
* Test coverage reporting ensures code quality
* Documentation ensures consistency across the team

### Decision 5 Implementation

* Created `.vscode/launch.json` with debug configurations:
  - Debug Server (HTTP/STDIO)
  - Debug Current Test File
  - Debug All Tests
* Added `.vscode/tasks.json` for build automation
* Configured Jest with TypeScript support
* Set up code coverage reporting
* Documented testing patterns in `systemPatterns.md`
* Updated README with debugging instructions

---

"2025-05-06 20:15:03" - Added Jest Test Plan and Strategy for MCP Server.

## Decision 4: Jest Test Plan and Strategy for MCP Server

* All unit and integration tests for the MCP Server use Jest with ES module support.
* Service calls (e.g., Dust agent methods) are always mocked via `client.callTool` to ensure isolation.
* No direct mocks of service-layer functions like `listDustAgents`, `getAgentConfig`, or `queryDustAgent`.
* Each test file validates MCP methods by mocking and verifying `client.callTool` responses only.
* Tests are written to be compatible with ES modules and avoid common pitfalls with Jest and ESM.
* All previous test errors (TypeError, syntax errors, reference errors) were addressed by focusing on proper mocking and import order.
* Test plan includes:
  - `dust_list_agents.test.js`: Tests listing agents via mocked client.
  - `dust_agent_query.test.js`: Tests agent querying logic with mocked client.
  - `dust_get_agent_config.test.js`: Tests agent config retrieval with mocked client.
* Test suite is run using `npm test` with `NODE_OPTIONS=--experimental-vm-modules` for ESM compatibility.
* Test strategy and approach are documented for future contributors.

### Decision 4 Rationale

* Mocking at the client layer ensures tests are independent of backend or service changes.
* ES module compatibility avoids future migration issues and leverages modern JavaScript features.
* Clear, modular test files improve maintainability and onboarding for new developers.
* Addressing previous errors increases test reliability and developer confidence.

### Decision 4 Implementation

* Updated all test files to mock only `client.callTool`.
* Removed all direct references and mocks to service-layer functions.
* Ensured all tests pass with Jest and ESM configuration.
* Documented the test plan and strategy in this decision log for future reference.

---

"2025-04-10 17:06:31" - Updated based on code review and todo.md analysis.

## Decision 1: MCP Server Architecture

* Implement MCP server using the official MCP TypeScript SDK
* Support both STDIO and HTTP/SSE transport modes
* Modular tool-based architecture for extensibility

### Decision 1 Rationale

* Official MCP SDK provides standardized implementation
* STDIO transport is required for Claude Desktop integration
* HTTP/SSE transport enables web-based clients
* Modular architecture allows for easier maintenance and extension

### Decision 1 Implementation

* Used McpServer class from @modelcontextprotocol/sdk
* Configured StdioServerTransport for Claude Desktop compatibility
* Express.js server for HTTP transport (currently commented out but prepared)
* Implemented tool registration pattern for all functionality

---

## Decision 2: Document Processing Pipeline

* Three-stage pipeline: Upload → Process → Query
* Separate storage for raw uploads and processed documents
* Structured metadata for tracking document status

### Decision 2 Rationale

* Separation of concerns between upload, processing, and querying
* Enables asynchronous processing of documents
* Structured metadata facilitates document management and retrieval

### Decision 2 Implementation

* Created dedicated directories for uploads and processed documents
* Implemented file upload tool with metadata generation
* Document processor extracts and structures information
* Dust agent tools query processed documents

---

## Decision 3: Dust Agent Integration

* Mock implementation for initial development
* Prepared for SDK integration in future iterations
* Query-based interface for agent interaction

### Decision 3 Rationale

* Enables development and testing without full Dust SDK integration
* Query-based interface matches Dust's interaction model
* Facilitates future transition to actual Dust SDK

### Decision 3 Implementation

* Created mock queryDustAgent function
* Implemented tool interfaces that match expected Dust functionality

---

## Decision 4: Dust API Integration

* Implement direct Dust API integration using axios instead of an SDK
* Create a dedicated service layer for Dust API interactions
* Implement agent configuration caching to improve performance
* Support conversation IDs for stateful interactions

### Decision 4 Rationale

* Direct API integration provides immediate access to Dust capabilities
* Using axios instead of an SDK offers several advantages:
  * Greater flexibility and control over request/response handling
  * Minimizes external dependencies
  * Simpler implementation for our current requirements
  * Easier to maintain and update as the API evolves
  * Future-proof architecture that can be replaced with SDK if needed
* Service layer separates concerns and improves maintainability
* Caching reduces redundant API calls and improves response times
* Conversation IDs enable multi-turn interactions with agents

### Decision 4 Implementation Details

* Created dustService.ts for all Dust API interactions
* Implemented agent configuration caching with TTL
* Added support for document context in agent queries
* Updated test strategy to mock at the client layer only

---

"2025-05-09 14:06:30" - Added HTTP/SSE mode and Smithery build support.

## Decision 5: HTTP/SSE Mode and Smithery Support

* Implemented HTTP/SSE mode for MCP server using Express and Server-Sent Events (SSE)
* Added /events SSE endpoint for real-time event streaming
* Preserved STDIO transport for Claude Desktop compatibility
* Added Smithery build and deployment support with smithery.yaml

### Decision 5 Rationale

* HTTP/SSE enables web-based clients and real-time updates
* Maintaining STDIO ensures backward compatibility
* Smithery support streamlines builds and deployment

### Decision 5 Implementation Details

* Added sseBroadcaster utility and integrated with Express
* Updated index.ts to provide /events SSE endpoint and event broadcasting
* Created and validated smithery.yaml for Smithery deployment
* Added TypeScript interfaces for API responses
* Structured response format to match MCP requirements
