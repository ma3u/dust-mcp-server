# Decision Log

This file records architectural and implementation decisions using a list format.

---
"2025-05-24 18:56:32" - Server-Sent Events (SSE) Support Implementation

## Decision 10: Implement SSE for Real-time Updates

* Added support for Server-Sent Events (SSE) to enable real-time updates
* Created new SSE endpoint at `/api/sse` for MCP clients
* Integrated with existing session management system
* Implemented connection management and keep-alive mechanism
* Added rate limiting and connection limits
* Documented SSE API for client integration

### Decision 10 Rationale

* Enable real-time updates for MCP clients like Windsurf
* Reduce server load by eliminating polling
* Improve user experience with instant updates
* Support Smithery and Pipedream integration
* Maintain backward compatibility with existing clients

### Decision 10 Implementation

#### Components Added
* `SSEController`: Handles SSE connections and events
* `SSEService`: Manages active connections and broadcasting
* `SSETypes`: TypeScript types for SSE events
* `sseRoutes`: Express routes for SSE endpoint
* `sseMiddleware`: Handles SSE connection setup and teardown

#### Configuration
* `SSE_KEEP_ALIVE_INTERVAL`: Interval for keep-alive messages (default: 30s)
* `SSE_MAX_CONNECTIONS_PER_IP`: Maximum concurrent connections per IP (default: 5)
* `SSE_RECONNECTION_TIMEOUT`: Client reconnection timeout (default: 30s)

#### Security
* Rate limiting for SSE connections
* Session validation for authenticated endpoints
* CORS configuration for web clients
* Connection cleanup on disconnect

---
"2025-05-24 17:25:00" - User Journey Test Implementation

## Decision 9: Test Implementation for Claude Desktop MCP Client

* Implemented comprehensive test coverage for the Claude Desktop MCP Client user journey (#19)
* Mapped test cases to each step of the user journey
* Defined clear acceptance criteria for test implementation
* Integrated with existing CI/CD pipeline for automated testing
* Included performance and security testing requirements
* Added test coverage reporting and quality gates

### Decision 9 Rationale

* Ensure end-to-end validation of the user journey
* Maintain consistent quality across all user interactions
* Catch regressions early in the development cycle
* Provide clear metrics for test coverage and quality
* Support continuous delivery with confidence
* Ensure security and performance requirements are met

### Decision 9 Implementation

#### Test Coverage Areas

* **Initial Setup**: Installation, configuration, and authentication
* **Agent Discovery**: Agent sync, capability verification, and configuration
* **Session Management**: Session creation, resumption, and context preservation
* **File Handling**: Upload, processing, and reference management
* **Agent Interaction**: Natural language processing and request routing
* **Workflow Orchestration**: Agent chaining and progress monitoring

#### Test Types

* Unit Tests: Individual component testing
* Integration Tests: Component interaction testing
* E2E Tests: Full user journey testing
* Performance Tests: Load and stress testing
* Security Tests: Authentication and data protection

#### Quality Gates

* 100% test coverage for critical paths
* All tests must pass in CI/CD pipeline
* Performance benchmarks must meet requirements
* Security validation must be completed

---
"2025-05-24 11:40:00" - Comprehensive Test Strategy Implementation

## Decision 8: Test Strategy for MCP Server Implementation

* Implemented a comprehensive test strategy covering unit, integration, and E2E tests
* Established CI/CD pipeline with GitHub Actions for automated testing
* Defined transport-specific testing for STDIO, HTTP, and SSE
* Integrated security and performance testing into the development workflow
* Added Claude Desktop UI testing with AskUI for end-to-end validation
* Included MCP client compatibility testing as a strategic priority

### Decision 8 Rationale

* Need to ensure MCP protocol compliance across all transport layers
* Required automated testing to maintain code quality and prevent regressions
* Needed performance baselines for production readiness
* Security validation for health data handling
* Essential to validate real user interactions with Claude Desktop
* Critical to maintain compatibility with various MCP client implementations

### Decision 8 Implementation

#### Subtasks Overview

* **Test Strategy Epic (#8)**: Central epic tracking all testing initiatives with progress metrics and cross-dependencies.
* **CI/CD Pipeline (#9)**: GitHub Actions workflow for automated testing, linting, and deployment with quality gates.
* **Transport Test Suite (#10)**: Comprehensive testing for all MCP transport layers (STDIO, HTTP, SSE) with protocol validation.
* **Security & Performance Testing (#11)**: Automated security scanning, load testing, and performance benchmarking.
* **Test Utilities (#12)**: Shared test helpers, mocks, and fixtures to streamline test development.
* **Claude Desktop UI Testing (#13)**: End-to-end testing of the Claude Desktop integration using AskUI for visual validation.

#### Strategic Focus Areas

* **MCP Client Testing (via Claude Desktop)**:
  * Implemented in [#13: Claude Desktop UI Testing](https://github.com/ma3u/dust-mcp-server/issues/13)
  * Tests against Claude Desktop as the primary MCP client
  * Validates protocol compatibility and message handling
  * Monitors client connection lifecycles
  * Documents client-specific behaviors and requirements
  * Includes end-to-end testing of user workflows
  * Implements UI automation for critical paths
  * Benchmarks performance of user interactions
  * Tests error handling and recovery scenarios

* **Future Client Testing**:
  * Framework designed to support additional MCP clients
  * Structure in place for protocol version validation
  * Documentation template for client-specific requirements

#### Implementation Details

* **Test Coverage Requirements**:
  * Unit Tests: 90%+ coverage for all core modules
  * Integration Tests: 100% coverage for critical paths
  * E2E Tests: Core user journeys validated
  * Performance: < 2s response time for 95th percentile under load
  * Security: Zero critical vulnerabilities in dependencies

* **Quality Gates**:
  * All tests must pass before merge
  * Code coverage thresholds enforced
  * Static analysis with zero warnings
  * Performance benchmarks met
  * Security scans clean

* **Tooling**:
  * Jest for unit and integration tests
  * AskUI for UI testing
  * autocannon for performance testing
  * MCP Inspector for protocol validation
  * GitHub Actions for CI/CD
  * MCP Test Client for client compatibility testing
* Established test coverage requirements and quality gates
* Integrated MCP Inspector for protocol validation
* Set up performance testing with autocannon
* Documented test patterns in systemPatterns.md

### Related Resources

* [Test Implementation Plan](https://github.com/ma3u/dust-mcp-server/issues/8)
* [CI/CD Pipeline](https://github.com/ma3u/dust-mcp-server/issues/9)
* [Test Coverage Report](https://github.com/ma3u/dust-mcp-server/actions)
* [AskUI Workshop](https://github.com/ma3u/askui-automation-workshop)

---
"2025-05-24 01:20:00" - Updated UUID and Directory Handling

## Decision 7: UUID v7 and Secure Directory Handling

* Upgraded to UUID v7 for time-ordered session IDs
* Implemented secure directory handling within project boundaries
* Added proper error handling for file system operations
* Ensured cross-platform compatibility for path resolution

### Decision 7 Rationale

* UUID v7 provides better time-ordered IDs for session management
* Needed to prevent file system operations outside project directory
* Required robust error handling for production reliability
* Needed consistent behavior across different operating systems

### Decision 7 Implementation

* Updated UUID package to latest version supporting v7
* Implemented proper path resolution using `process.cwd()`
* Added comprehensive error handling for file operations
* Added logging for directory creation events
* Ensured all file operations are contained within project directory

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
