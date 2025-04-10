# Decision Log

This file records architectural and implementation decisions using a list format.

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
* Created tools for agent discovery and document analysis
* Added TypeScript interfaces for API responses
* Structured response format to match MCP requirements
