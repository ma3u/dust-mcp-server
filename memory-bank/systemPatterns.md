# System Patterns

This file documents recurring patterns and standards used in the project.
It is intended to be updated as the project evolves.

- "2025-04-10 17:06:31" - Updated based on code review and todo.md analysis.
- "2025-05-19 10:45:00" - Added VS Code debugging configuration and patterns.
- "2025-05-19 10:50:00" - Added testing patterns and updated debugging patterns.

## Testing Patterns

### Unit Testing

- **Location**: `/src/__tests__/unit/`
- **Naming**: `*.test.ts`
- **Coverage**: Aim for >80% coverage
- **Mocks**: Use Jest mocks for external dependencies
- **Fixtures**: Store test data in `__fixtures__` directories

### Integration Testing

- **Location**: `/src/__tests__/integration/`
- **Focus**: Test component interactions
- **Setup**: Use test containers for external services
- **Cleanup**: Ensure proper cleanup after tests

### E2E Testing

- **Location**: `/src/__tests__/e2e/`
- **Scope**: Test complete user journeys
- **Data**: Use isolated test data
- **Assertions**: Focus on business outcomes

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
- **Multi-Transport Support**: STDIO for Claude Desktop, HTTP/SSE for web clients
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
  - [Dust SDK JS](https://github.com/dust-tt/dust-sdk-js)
  - [Dust SDKs](https://github.com/dust-tt/dust/tree/main/sdks/js)
  - [Dust API Documentation](https://dust.tt/swagger.json)
  - [Postman Collection](https://www.postman.com/dust33/dust/collection/6nvk011/dust-api-documentation)
  - [Dust Labs Scripts](https://github.com/dust-tt/dust-labs)
- **Features**:
  - Preconfigured Dust API client
  - Session management utilities
  - Secure logging middleware

**Monitoring Endpoints**:
- `GET /status` - Server health check
- `GET /metrics` - Prometheus-style metrics
- `GET /sessions` - Active session list
