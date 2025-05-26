# System Patterns

This file documents recurring patterns and standards used in the project.
It is intended to be updated as the project evolves.

- "2025-04-10 17:06:31" - Updated based on code review and todo.md analysis.
- "2025-05-19 10:45:00" - Added VS Code debugging configuration and patterns.
- "2025-05-19 10:50:00" - Added testing patterns and updated debugging patterns.

## Testing Strategy

For a comprehensive overview of our testing approach, see the [Test Strategy Epic (#8)](https://github.com/ma3u/dust-mcp-server/issues/8).

### Test Types

#### 1. Unit Testing

- **Location**: `/src/__tests__/unit/`
- **Naming**: `*.test.ts`
- **Coverage**: >90% coverage for core modules
- **Mocks**: Use Jest mocks for external dependencies
- **Fixtures**: Store test data in `__fixtures__` directories
- **Related**: [Test Utilities (#12)](https://github.com/ma3u/dust-mcp-server/issues/12)

#### 2. Integration Testing

- **Location**: `/src/__tests__/integration/`
- **Focus**: Component interactions and transport layers
- **Setup**: Test containers for external services
- **Cleanup**: Automatic resource cleanup
- **Related**: [Transport Test Suite (#10)](https://github.com/ma3u/dust-mcp-server/issues/10)

#### 3. E2E Testing

- **Location**: `/src/__tests__/e2e/`
- **Scope**: Complete user journeys
- **Data**: Isolated test data
- **Assertions**: Business outcomes validation
- **CI**: Runs in dedicated GitHub Actions workflow

#### 4. UI Testing (Claude Desktop)

- **Framework**: AskUI
- **Scope**: End-to-end user interactions
- **Coverage**: Critical user flows
- **Related**: [Claude Desktop UI Testing (#13)](https://github.com/ma3u/dust-mcp-server/issues/13)

### Quality Gates

- **Pre-merge**: All tests must pass
- **Coverage**: Enforced thresholds
- **Performance**: Benchmarks in CI
- **Security**: Automated scanning
- **CI/CD**: [GitHub Actions Pipeline (#9)](https://github.com/ma3u/dust-mcp-server/issues/9)

### Performance & Security

- **Benchmarking**: Regular performance tests
- **Load Testing**: Simulate production traffic
- **Security**: Automated vulnerability scanning
- **Related**: [Security & Performance Testing (#11)](https://github.com/ma3u/dust-mcp-server/issues/11)

## Debugging Patterns

### VS Code Debugging

- **Configurations**:
  - Debug Server (HTTP/STDIO)
  - Debug Current Test File
  - Debug All Tests

- **Keybindings**:
  - F5: Start/Continue
  - F9: Toggle Breakpoint
  - F10: Step Over
  - F11: Step Into
  - Shift+F11: Step Out

### Logging

- **Levels**: error, warn, info, debug, verbose
- **Format**: JSON for structured logging
- **Context**: Include request IDs and timestamps
- **Sensitive Data**: Never log sensitive information

## Coding Patterns

- **TypeScript with Strong Typing**: Using Zod for runtime validation and TypeScript interfaces for static typing
- **Tool Registration Pattern**: Consistent pattern for registering MCP tools with server

  ```typescript
  server.tool(
    "tool_name",
    "Tool description",
    { /* Zod schema for parameters */ },
    async (params) => { /* Implementation */ }
  );
  ```

- **Async/Await Pattern**: Consistent use of async/await for asynchronous operations
- **Error Handling**: Try/catch blocks with structured error reporting
- **Directory Initialization**: Consistent pattern for ensuring directories exist before use
- **Environment Configuration**: Using dotenv for environment variable management
- **Modular Architecture**: Clear separation of concerns with modular components

## Architectural Patterns

- **MCP Server Architecture**: Following the Model Context Protocol specification
- **Tool-Based Design**: Functionality exposed as tools to MCP clients
- **Multi-Transport Support**: STDIO for Claude Desktop, HTTP/SSE for web clients (future releases)
- **Pipeline Processing**: Three-stage pipeline for document handling (upload → process → query)
- **Metadata Tracking**: JSON metadata files for tracking document status and properties
- **Mock Implementation**: Using mock implementations for components that will be replaced with real implementations
- **API-based Communication**: Preference for using existing TypeScript SDKs when available
- **Structured Logging**: Consistent logging pattern for operations and errors
- **Session Management**: Planned implementation for preserving context across interactions
- **Multi-Agent Orchestration**: Design for coordinating multiple Dust agents

# Resources to Develop MCP Server in TypeScript for DUST.tt
## Best Practices

- **Implement full MCP lifecycle** (initialize → message → terminate) with proper session cleanup
- **Mask PII** in logs using secure logging utilities
- **Validate inputs** using Zod schemas as demonstrated in the [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Specifications
- **MCP Protocol 2025-03-26** - Latest specification supporting JSON-RPC 2.0 with extensions: https://modelcontextprotocol.io/specification/2025-03-26
- **Dust API Integration** - Standardized agent communication using workspace/agent ID context: https://dust.tt/swagger.json

## SDKs

### @modelcontextprotocol/sdk

- **URL**: [GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- **Description**: Official TypeScript SDK for MCP server/client development
- **Features**:
  - Implements full protocol lifecycle
  - Supports stdio and HTTP transports
  - Includes Zod validation for tool arguments

### MCP Dust Server SDK
- **Description**: Reference implementation for Dust API integration
- **Resources**:
  - [Dust API Documentation](https://dust.tt/swagger.json)
  - [Postman Collection](https://www.postman.com/dust33/dust/collection/6nvk011/dust-api-documentation)
  - [Dust Labs Scripts](https://github.com/dust-tt/dust-labs)
- **SDKs limited support - use is as blue print for the API wrapper **:
  - [Dust SDK JS](https://github.com/dust-tt/dust-sdk-js)
  - [Dust SDKs](https://github.com/dust-tt/dust/tree/main/sdks/js)
- **Features**:
  - Preconfigured Dust API client
  - Session management utilities
  - Secure logging middleware

**Monitoring Endpoints**:
- `GET /status` - Server health check
- `GET /metrics` - Prometheus-style metrics
- `GET /sessions` - Active session list
