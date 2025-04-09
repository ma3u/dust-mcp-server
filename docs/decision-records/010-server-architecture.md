# Decision Record: MCP Server Architecture

## Date

2025-04-09

## Context

Based on the requirements analysis completed in Phase 1, we need to design a robust architecture for the MCP server that will connect Claude Desktop with Dust AI agents for health data management and analysis.

## Architecture Overview

### High-Level Architecture

The MCP server architecture follows a modular, layered design with clear separation of concerns:

1. **Transport Layer**: Handles communication with Claude Desktop
2. **Core MCP Layer**: Implements the MCP protocol and manages sessions
3. **Tool Management Layer**: Registers and manages available tools
4. **Dust Integration Layer**: Communicates with Dust agents
5. **Health Data Processing Layer**: Processes and analyzes health data
6. **Security Layer**: Ensures data privacy and secure communication

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Client Applications                        │
│                                                                 │
│  ┌───────────────────┐                 ┌───────────────────┐    │
│  │   Claude Desktop  │                 │    Web Browsers   │    │
│  └─────────┬─────────┘                 └─────────┬─────────┘    │
└─────────────────────────────────────────────────────────────────┘
              │                                     │
              │ STDIO                               │ HTTP/SSE
              │                                     │
┌─────────────────────────────────────────────────────────────────┐
│                         Transport Layer                          │
│                                                                 │
│  ┌───────────────────┐                 ┌───────────────────┐    │
│  │  STDIO Transport  │                 │  HTTP/SSE Server  │    │
│  └─────────┬─────────┘                 └─────────┬─────────┘    │
└─────────────┬─────────────────────────────────────┬─────────────┘
              │                                     │
              └─────────────────┬───────────────────┘
                                │
┌───────────────────────────────┼───────────────────────────────┐
│                               │                               │
│                     Core MCP Server Layer                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │   Session   │  │   Message   │  │ Authentication  │  │  │
│  │  │  Management │  │  Processing │  │    & Auth       │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                               │                               │
└───────────────────────────────┼───────────────────────────────┘
                                │
┌───────────────────────────────┼───────────────────────────────┐
│                               │                               │
│                     Tool Management Layer                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │    Tool     │  │  Parameter  │  │     Error       │  │  │
│  │  │ Registration│  │  Validation │  │    Handling     │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                               │                               │
└───────────────────────────────┼───────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
┌───────────────┼───────────────┐ ┌─────────────┼─────────────┐
│               │               │ │             │             │
│   Dust Integration Layer      │ │  Health Data Processing   │
│ ┌─────────────────────────┐   │ │ ┌─────────────────────┐   │
│ │                         │   │ │ │                     │   │
│ │ ┌─────────┐ ┌─────────┐ │   │ │ │ ┌─────────────────┐ │   │
│ │ │  Agent  │ │  Agent  │ │   │ │ │ │ Data Parsers    │ │   │
│ │ │  API    │ │ Session │ │   │ │ │ │ - Apple Health  │ │   │
│ │ │ Client  │ │ Manager │ │   │ │ │ │ - Blood Tests   │ │   │
│ │ └─────────┘ └─────────┘ │   │ │ │ │ - Keto Mojo     │ │   │
│ │                         │   │ │ │ └─────────────────┘ │   │
│ └─────────────────────────┘   │ │ │                     │   │
│                               │ │ │ ┌─────────────────┐ │   │
│                               │ │ │ │ Data Analytics  │ │   │
│                               │ │ │ └─────────────────┘ │   │
│                               │ │ │                     │   │
│                               │ │ └─────────────────────┘   │
└───────────────────────────────┘ └─────────────────────────────┘
```

## Component Details

### Transport Layer

The Transport Layer handles communication between client applications and the MCP server.

#### STDIO Transport

- Implements `StdioServerTransport` from the MCP TypeScript SDK
- Handles line-delimited JSON messages
- Manages process I/O for command-line based interactions
- Avoids console.log() to prevent transport breakage

#### HTTP/SSE Server

- Implements `HttpServerTransport` from the MCP TypeScript SDK
- Provides RESTful API endpoints for client communication
- Supports Server-Sent Events for streaming responses
- Handles connection management and timeouts
- Implements CORS and security headers

### Core MCP Server Layer

The Core MCP Server Layer implements the MCP protocol and manages the server's core functionality.

#### Session Management

- Tracks active client sessions
- Manages session context and state
- Implements session timeout and cleanup
- Supports session persistence (optional)

#### Message Processing

- Parses and validates incoming messages
- Formats outgoing messages according to MCP specification
- Handles message routing to appropriate tools
- Manages streaming response generation

#### Authentication & Authorization

- Validates client credentials (when required)
- Manages API key security for Dust integration
- Implements role-based access control
- Enforces security policies

### Tool Management Layer

The Tool Management Layer handles the registration and execution of MCP tools.

#### Tool Registration

- Registers available tools with the MCP server
- Manages tool metadata and descriptions
- Organizes tools into logical categories
- Handles tool discovery and listing

#### Parameter Validation

- Validates tool parameters using Zod schemas
- Enforces type safety and constraints
- Provides helpful error messages for invalid inputs
- Sanitizes inputs for security

#### Error Handling

- Implements standardized error responses
- Manages error propagation and logging
- Provides appropriate error codes and messages
- Handles recovery from transient errors

### Dust Integration Layer

The Dust Integration Layer manages communication with Dust AI agents.

#### Agent API Client

- Implements secure communication with Dust API
- Manages API key authentication
- Handles rate limiting and retries
- Formats requests according to Dust API requirements

#### Agent Session Manager

- Maintains agent session context
- Manages conversation history
- Handles agent configuration and preferences
- Supports multiple concurrent agent sessions

### Health Data Processing Layer

The Health Data Processing Layer handles the parsing, analysis, and management of health data.

#### Data Parsers

- Implements parsers for various health data formats:
  - Apple Health XML exports
  - Blood test PDF reports
  - Keto Mojo data exports
  - Manual data entry
- Validates and normalizes health data
- Converts data to standardized formats

#### Data Analytics

- Performs time-series analysis on health data
- Identifies trends and patterns
- Generates summary statistics
- Prepares data for agent consumption

### Security Layer (Cross-cutting)

The Security Layer ensures data privacy and secure communication across all components.

- Implements end-to-end encryption
- Enforces data privacy policies
- Manages secure storage of sensitive information
- Provides audit logging for security events
- Implements input validation and sanitization

## Data Flow

### Client Request Flow

1. Client sends request via STDIO or HTTP/SSE
2. Transport Layer receives and forwards the request
3. Core MCP Layer validates and processes the message
4. Tool Management Layer identifies the requested tool
5. Tool executes, potentially calling Dust Integration or Health Data Processing
6. Response flows back through the layers to the client

### Health Data Processing Flow

1. Client uploads health data file
2. Transport Layer receives the file
3. Health Data Processing Layer identifies the format
4. Appropriate parser processes the file
5. Data is normalized and stored securely
6. Analytics are performed as needed
7. Results are made available to Dust agents

### Agent Communication Flow

1. Client requests agent interaction
2. Dust Integration Layer prepares the request
3. Agent API Client sends request to Dust API
4. Response is received and processed
5. Agent Session Manager updates context
6. Response is formatted and returned to client

## Technology Choices

- **Language**: TypeScript for type safety and developer experience
- **MCP Implementation**: Official TypeScript SDK (@modelcontextprotocol/sdk)
- **HTTP Server**: Express.js for HTTP/SSE transport
- **Schema Validation**: Zod for robust parameter validation
- **Data Processing**: Custom parsers with appropriate libraries
- **Security**: Industry standard encryption and authentication libraries

## Decision

Based on the architecture design, we will:

1. Implement a modular, layered architecture with clear separation of concerns
2. Use the official TypeScript SDK as the foundation
3. Support both STDIO and HTTP/SSE transports
4. Implement robust error handling and security measures
5. Create specialized components for health data processing
6. Design for extensibility and maintainability

## Consequences

- The modular architecture allows for independent development of components
- Clear separation of concerns improves maintainability
- Dual transport support ensures compatibility with various clients
- Security is addressed as a cross-cutting concern
- The architecture supports future extensions for additional data sources
- Component interfaces must be well-defined to ensure proper integration

## Open Questions

- How will we handle scaling for multiple concurrent users?
- What's the optimal approach for secure storage of health data?
- How should we implement caching for improved performance?

## References

- [MCP TypeScript SDK Documentation](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Express.js Documentation](https://expressjs.com/)
- [Zod Documentation](https://github.com/colinhacks/zod)
