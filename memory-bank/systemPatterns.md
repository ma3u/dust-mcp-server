# System Patterns

This file documents recurring patterns and standards used in the project.
It is intended to be updated as the project evolves.

- "2025-04-10 17:06:31" - Updated based on code review and todo.md analysis.
- "2025-05-19 10:45:00" - Added VS Code debugging configuration and patterns.

## Coding Patterns

* **TypeScript with Strong Typing**: Using Zod for runtime validation and TypeScript interfaces for static typing
* **Tool Registration Pattern**: Consistent pattern for registering MCP tools with server

  ```typescript
  server.tool(
    "tool_name",
    "Tool description",
    { /* Zod schema for parameters */ },
    async (params) => { /* Implementation */ }
  );
  ```

* **Async/Await Pattern**: Consistent use of async/await for asynchronous operations
* **Error Handling**: Try/catch blocks with structured error reporting
* **Directory Initialization**: Consistent pattern for ensuring directories exist before use
* **Environment Configuration**: Using dotenv for environment variable management
* **Modular Architecture**: Clear separation of concerns with modular components

## Architectural Patterns

* **MCP Server Architecture**: Following the Model Context Protocol specification
* **Tool-Based Design**: Functionality exposed as tools to MCP clients
* **Multi-Transport Support**: STDIO for Claude Desktop, HTTP/SSE for web clients
* **Pipeline Processing**: Three-stage pipeline for document handling (upload → process → query)
* **Metadata Tracking**: JSON metadata files for tracking document status and properties
* **Mock Implementation**: Using mock implementations for components that will be replaced with real implementations
* **API-based Communication**: Preference for using existing TypeScript SDKs when available
* **Structured Logging**: Consistent logging pattern for operations and errors
* **Session Management**: Planned implementation for preserving context across interactions
* **Multi-Agent Orchestration**: Design for coordinating multiple Dust agents


 
# Resources to Develop MCP Server in TypeScript for DUST.tt

## Best Practices
- **Use [MCP Inspector](https://github.com/ma3u/mcp-dust-server/blob/main/public/DEVELOPERS.md)** for protocol validation and debugging during development
- **Implement full MCP lifecycle** (initialize → message → terminate) with proper session cleanup ([ma3u/mcp-dust-server](https://github.com/ma3u/mcp-dust-server), [MCP-Mirror/ma3u_mcp-dust-server](https://github.com/MCP-Mirror/ma3u_mcp-dust-server), [DEVELOPERS.md](https://github.com/ma3u/mcp-dust-server/blob/main/public/DEVELOPERS.md))
- **Mask PII** in logs using secure logging utilities included in the [reference implementation](https://github.com/ma3u/mcp-dust-server/blob/main/public/DEVELOPERS.md)
- **Test all transport layers** including SSE and HTTP Stream with automatic reconnection ([ma3u/mcp-dust-server](https://github.com/ma3u/mcp-dust-server), [MCP-Mirror/ma3u_mcp-dust-server](https://github.com/MCP-Mirror/ma3u_mcp-dust-server))
- **Follow connection management** patterns with heartbeat mechanisms (30s default) ([ma3u/mcp-dust-server](https://github.com/ma3u/mcp-dust-server), [DEVELOPERS.md](https://github.com/ma3u/mcp-dust-server/blob/main/public/DEVELOPERS.md))
- **Validate inputs** using Zod schemas as demonstrated in the [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Specifications
- **MCP Protocol 2025-03-26** - Latest specification supporting JSON-RPC 2.0 with extensions: https://modelcontextprotocol.io/specification/2025-03-26
- **Dust API Integration** - Standardized agent communication using workspace/agent ID context: https://dust.tt/swagger.json

## SDKs
- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)** - Official TypeScript SDK for MCP server/client development
  - Implements full protocol lifecycle
  - Supports stdio and HTTP transports
  - Includes Zod validation for tool arguments
- **MCP Dust Server SDK** - Reference implementation limited to Dust API integration
  - Use the SDK as blue print https://github.com/dust-tt/dust-sdk-js and https://github.com/dust-tt/dust/tree/main/sdks/js
  - Use the original DUST API to access and test the Dust API: https://dust.tt/swagger.json
  - Use the Postman collection for testing: https://www.postman.com/dust33/dust/collection/6nvk011/dust-api-documentation
  - Use the scripts as blue print: https://github.com/dust-tt/dust-labs
  - Preconfigured Dust API client
  - Session management utilities
  - Secure logging middleware

**Monitoring Endpoints**:
- `GET /status` - Server health check
- `GET /metrics` - Prometheus-style metrics
- `GET /sessions` - Active session list
