# Decision Log

This file records architectural and implementation decisions using a list format.

"2025-04-10 17:06:31" - Updated based on code review and todo.md analysis.

## Decision: MCP Server Architecture

* Implement MCP server using the official MCP TypeScript SDK
* Support both STDIO and HTTP/SSE transport modes
* Modular tool-based architecture for extensibility

## Rationale

* Official MCP SDK provides standardized implementation
* STDIO transport is required for Claude Desktop integration
* HTTP/SSE transport enables web-based clients
* Modular architecture allows for easier maintenance and extension

## Implementation Details

* Used McpServer class from @modelcontextprotocol/sdk
* Configured StdioServerTransport for Claude Desktop compatibility
* Express.js server for HTTP transport (currently commented out but prepared)
* Implemented tool registration pattern for all functionality

## Decision: Document Processing Pipeline

* Three-stage pipeline: Upload → Process → Query
* Separate storage for raw uploads and processed documents
* Structured metadata for tracking document status

## Rationale

* Separation of concerns between upload, processing, and querying
* Enables asynchronous processing of documents
* Structured metadata facilitates document management and retrieval

## Implementation Details

* Created dedicated directories for uploads and processed documents
* Implemented file upload tool with metadata generation
* Document processor extracts and structures information
* Dust agent tools query processed documents

## Decision: Dust Agent Integration

* Mock implementation for initial development
* Prepared for SDK integration in future iterations
* Query-based interface for agent interaction

## Rationale

* Enables development and testing without full Dust SDK integration
* Query-based interface matches Dust's interaction model
* Facilitates future transition to actual Dust SDK

## Implementation Details

* Created mock queryDustAgent function
* Implemented tool interfaces that match expected Dust functionality
* Structured response format to match MCP requirements
