# System Patterns

This file documents recurring patterns and standards used in the project.
It is intended to be updated as the project evolves.
"2025-04-10 17:06:31" - Updated based on code review and todo.md analysis.

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
