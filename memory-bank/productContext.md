# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.

"2025-05-19 09:04:18" - Added detailed user journey for multi-agent interaction.

## Project Goal

The Dust MCP Server project is a server implementation for integrating with Dust AI services using the Model Context Protocol (MCP). It serves as a middleware connector between client applications (particularly Claude Desktop) and Dust AI agents, enabling data processing, analysis, and insights generation through AI agents. The implementation includes a comprehensive test suite covering unit, integration, and end-to-end testing scenarios.

## Key Features

- Integration with Dust AI services using the Dust TypeScript SDK
- MCP-compliant server implementation for agent communication
- File upload and document processing capabilities
- Analysis of uploaded files through specialized Dust agents
- Support for both STDIO (Prio 1) and HTTP/SSE (Prio 2) transport modes
- Session state management for preserving context across interactions
- Multi-agent orchestration and context passing

## Overall Architecture

The project follows a TypeScript-based server architecture with modular components:

- **Core Server**: Express.js-based server with MCP SDK integration
- **Transport Layer**: Support for both STDIO (for Claude Desktop) and HTTP/SSE
- **Testing Framework**: Comprehensive test suite with Jest for unit, integration, and end-to-end tests
- **Tool Components**:
  - File Upload: Handles document uploads with metadata tracking
  - Document Processor: Extracts and structures information from documents
  - Dust Agent: Interfaces with Dust AI services for data analysis
  - Agent Service: Manages agent lifecycle and session state
- **Directory Structure**:
  - `/src`: Source code with modular components
    - `/api`: API routes, controllers, and middleware
    - `/services`: Business logic and service layer
    - `/types`: TypeScript type definitions
    - `/utils`: Utility functions and helpers
    - `/__tests__/unit`: Unit tests
    - `/__tests__/integration`: Integration tests
    - `/__tests__/e2e`: End-to-end tests
  - `/docs`: Documentation including API specs and user guides
  - `/logs`: Application logs (not version controlled)
  - `/.github`: GitHub workflows and templates

The system is designed to process documents, extract relevant information, and use Dust AI agents to analyze and generate insights from the data. The implementation includes a comprehensive test suite that validates all critical paths and edge cases, ensuring reliability and maintainability.

## User Journey: Claude Desktop as MCP Client for Dust

### 1. Initial Setup and Configuration

- **MCP Client Installation**:
  - User installs Claude Desktop with MCP Client capabilities
  - Configures connection to Dust platform using API credentials
  - Sets up local cache and session storage preferences

- **Dust Account Integration**:
  - Authenticates with Dust platform via OAuth or API Key
  - Syncs available agents and tools from Dust account
  - Configures default agent preferences and settings

- **Agent Discovery and Selection**:
  - Browses available Dust agents through Claude Desktop interface
  - Views agent capabilities, documentation, and example use cases
  - Selects and configures preferred agents for different task types

### 2. Workspace and Session Management

- **Session Initialization**:
  - Creates new MCP sessions tied to Dust conversation history
  - Resumes previous sessions with full context preservation
  - Manages multiple concurrent sessions for different tasks

- **Context Management**:
  - Leverages Dust's session history for context continuity
  - Syncs conversation state across devices via Dust platform
  - Manages context window and summarization preferences

- **File Handling**:
  - Uploads various file formats (PDF, DOCX, XLSX, etc.) through Claude Desktop
  - Tracks file references within Dust conversation history
  - Manages file access permissions and versions

### 3. Agent Interaction and Orchestration

- **Agent Selection and Invocation**:
  - Uses natural language to request specific agent capabilities
  - Claude Desktop intelligently routes requests to appropriate Dust agents
  - Views which agent is handling each part of the conversation

- **Multi-Agent Workflows**:
  - Defines agent chains through conversation context
  - Monitors agent handoffs and collaboration
  - Adjusts workflow based on intermediate results

- **Real-time Monitoring**:
  - Views agent activity and status in real-time
  - Monitors token usage and API costs
  - Receives notifications for long-running operations

### 4. Advanced Features and Integration

- **Tool Integration**:
  - Discovers and configures special tools through MCP
  - Maps Claude Desktop features to Dust agent capabilities
  - Manages authentication and permissions for integrated tools

### 5. Future Integration Roadmap

- **Collaboration Features**:
  - Shares conversations and agent interactions via Dust's collaboration features
  - Invites team members to join active sessions
  - Tracks changes and contributions from different users

- **Analysis and Reporting**:
  - Generates reports using Dust's analysis capabilities
  - Exports conversation history and agent outputs
  - Creates custom dashboards for recurring analysis tasks

- **Enhanced Collaboration**:
  - Real-time co-editing of agent prompts and configurations
  - Team workspaces with shared agent presets
  - Version control for agent interactions

- **Advanced Analytics**:
  - Performance metrics for agent interactions
  - Cost and usage analytics across teams
  - Automated quality assessment of agent outputs

- **Extended Platform Support**:
  - Mobile client integration
  - Browser extension for web-based interactions
  - API for custom client implementations

- **Context Management**:
  - Reviews and edits shared context
  - Resolves context conflicts between agents
  - Saves context snapshots for future reference

- **Session Saving**:
  - Saves current workspace state
  - Names and tags sessions for retrieval
  - Shares sessions with team members

- **History and Versioning**:
  - Reviews interaction history
  - Reverts to previous states
  - Compares different versions of agent outputs

- **Data Export**:
  - Exports agent conversations
  - Saves processed data in structured formats
  - Generates API documentation for agent interactions

## Existing Files and Resources

### Core Application Files

- `src/`
  - `agents/`: Agent definitions and configurations
  - `api/`: REST API endpoints
  - `services/`: Core services for agent management
  - `utils/`: Shared utilities and helpers

### Configuration

- `.env`: Environment variables
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration

### Documentation

- `docs/`
  - `api/`: API documentation
  - `guides/`: User guides and tutorials
  - `examples/`: Example implementations

## Agent Capabilities

### Document Analysis Agent

- Processes and analyzes uploaded documents
- Extracts key information and metadata
- Generates summaries and insights

### Data Processing Agent

- Handles structured and unstructured data
- Performs data cleaning and transformation
- Generates visualizations and reports

### Research Agent

- Conducts web research
- Validates information from multiple sources
- Compiles research findings

### Content Generation Agent

- Creates written content
- Adapts tone and style
- Ensures consistency with brand guidelines

## MCP Integration with DUST Agents

### MCP Server Architecture

The MCP (Model Context Protocol) server acts as a middleware between clients and DUST's agent ecosystem, providing a standardized interface for agent interaction.

### Core MCP Methods

#### 1. Agent Discovery

```typescript
interface AgentDiscovery {
  // List all available agents for the authenticated user
  listAgents(): Promise<AgentDescriptor[]>;
  
  // Get details about a specific agent
  getAgent(agentId: string): Promise<AgentDetails>;
}
```

#### 2. Session Management

```typescript
interface SessionManagement {
  // Create a new session with optional initial context
  createSession(agentId: string, context?: Record<string, any>): Promise<Session>;
  
  // Resume an existing session
  getSession(sessionId: string): Promise<Session>;
  
  // End a session
  endSession(sessionId: string): Promise<void>;
}
```

#### 3. Agent Interaction

```typescript
interface AgentInteraction {
  // Send a message to an agent
  sendMessage(sessionId: string, message: Message): Promise<AgentResponse>;
  
  // Stream response from agent
  streamResponse(sessionId: string, callback: (chunk: string) => void): void;
  
  // Upload files to agent context
  uploadFiles(sessionId: string, files: File[]): Promise<FileReference[]>;
}
```

### Communication Flow

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant S as MCP Server
    participant D as DUST API
    participant A as DUST Agent
    
    C->>S: 1. listAgents()
    S->>D: GET /api/v1/agents
    D-->>S: [agent1, agent2, ...]
    S-->>C: List of available agents
    
    C->>S: 2. createSession(agentId)
    S->>D: POST /api/v1/sessions { agentId }
    D->>A: Initialize agent with context
    D-->>S: { sessionId, ... }
    S-->>C: Session created
    
    C->>S: 3. uploadFiles(sessionId, files)
    S->>D: POST /api/v1/sessions/{sessionId}/files
    D->>A: Process and store files
    D-->>S: [fileRef1, fileRef2, ...]
    S-->>C: File references
    
    C->>S: 4. sendMessage(sessionId, message)
    S->>D: POST /api/v1/sessions/{sessionId}/messages
    D->>A: Process with agent's knowledge and prompts
    A->>D: Response chunks
    D-->>S: Streaming response
    S-->>C: Stream chunks
    
    C->>S: 5. endSession(sessionId)
    S->>D: DELETE /api/v1/sessions/{sessionId}
    D->>A: Clean up resources
    D-->>S: 200 OK
    S-->>C: Session ended
```

### Authentication & Security

- All MCP endpoints require authentication using API keys or OAuth 2.0 tokens
- Session tokens are used for subsequent requests after initial authentication
- File uploads are validated for size and type restrictions
- All communications are encrypted using TLS 1.3

### Error Handling

Standard HTTP status codes are used with detailed error responses:

- `400 Bad Request`: Invalid input parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

### Performance Considerations

- Session timeouts after 30 minutes of inactivity
- Response streaming with chunked transfer encoding
- Client-side caching of agent metadata
- Rate limiting per API key/account
