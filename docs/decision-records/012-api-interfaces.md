# Decision Record: API Interfaces Between MCP Server and Dust Agents

## Date

2025-04-09

## Context

The MCP server needs well-defined API interfaces to communicate with Dust agents. This document outlines the API interfaces, data formats, and communication patterns between these components.

## API Interface Design

### Overview

The API interface between the MCP server and Dust agents consists of several key components:

1. **Agent Configuration Interface**: Manages agent settings and capabilities
2. **Agent Communication Interface**: Handles message exchange with agents
3. **Context Management Interface**: Manages conversation history and context
4. **Data Integration Interface**: Provides health data to agents
5. **Error Handling Interface**: Manages error conditions and recovery

### Interface Diagrams

```
┌───────────────────────────────────────────────────────────────┐
│                        MCP Server                             │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ Tool Management │  │ Session Manager │  │ Data Processor  ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                    Dust Integration Layer                     │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │Agent Config API │  │Agent Message API│  │Context Manager  ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                         Dust API                              │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │  Agent Registry │  │ Conversation API│  │  Data API       ││
│  │                 │  │                 │  │                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

## API Interface Specifications

### 1. Agent Configuration Interface

The Agent Configuration Interface manages agent settings, capabilities, and discovery.

#### Methods

##### `listAgents()`
- **Purpose**: Retrieve available agents in the workspace
- **Request Parameters**: None
- **Response**: Array of agent metadata
- **Error Handling**: Authentication errors, API availability errors

```typescript
interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  healthDataTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

async function listAgents(): Promise<AgentMetadata[]>
```

##### `getAgentDetails(agentId: string)`
- **Purpose**: Retrieve detailed information about a specific agent
- **Request Parameters**: Agent ID
- **Response**: Detailed agent information
- **Error Handling**: Agent not found, authentication errors

```typescript
interface AgentDetails extends AgentMetadata {
  inputSchema: object;
  outputSchema: object;
  configOptions: {
    [key: string]: {
      type: string;
      description: string;
      default?: any;
      required: boolean;
    };
  };
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
}

async function getAgentDetails(agentId: string): Promise<AgentDetails>
```

##### `configureAgent(agentId: string, config: AgentConfig)`
- **Purpose**: Configure an agent with specific settings
- **Request Parameters**: Agent ID, configuration options
- **Response**: Configuration status
- **Error Handling**: Invalid configuration, agent not found

```typescript
interface AgentConfig {
  parameters: {
    [key: string]: any;
  };
  contextWindow?: number;
  responseFormat?: 'markdown' | 'json' | 'text';
  maxTokens?: number;
}

interface ConfigurationStatus {
  success: boolean;
  agentId: string;
  message: string;
  activeConfig: AgentConfig;
}

async function configureAgent(
  agentId: string, 
  config: AgentConfig
): Promise<ConfigurationStatus>
```

### 2. Agent Communication Interface

The Agent Communication Interface handles message exchange with Dust agents.

#### Methods

##### `sendMessage(agentId: string, message: AgentMessage, options?: MessageOptions)`
- **Purpose**: Send a message to an agent and receive a response
- **Request Parameters**: Agent ID, message content, optional parameters
- **Response**: Agent response
- **Error Handling**: Communication errors, agent errors, timeout

```typescript
interface AgentMessage {
  content: string;
  attachments?: Array<{
    type: 'file' | 'image' | 'data';
    content: string | Buffer;
    mimeType: string;
    filename?: string;
  }>;
  metadata?: {
    [key: string]: any;
  };
}

interface MessageOptions {
  conversationId?: string;
  streaming?: boolean;
  timeout?: number;
  includeRawResponse?: boolean;
  contextItems?: Array<{
    type: string;
    content: any;
  }>;
}

interface AgentResponse {
  content: string;
  conversationId: string;
  messageId: string;
  created: Date;
  metadata?: {
    [key: string]: any;
  };
  raw?: any;
}

async function sendMessage(
  agentId: string, 
  message: AgentMessage, 
  options?: MessageOptions
): Promise<AgentResponse>
```

##### `streamMessage(agentId: string, message: AgentMessage, options?: MessageOptions)`
- **Purpose**: Send a message to an agent and receive a streaming response
- **Request Parameters**: Agent ID, message content, optional parameters
- **Response**: Stream of response chunks
- **Error Handling**: Communication errors, agent errors, stream interruption

```typescript
interface ResponseChunk {
  content: string;
  done: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
  };
}

async function* streamMessage(
  agentId: string, 
  message: AgentMessage, 
  options?: MessageOptions
): AsyncGenerator<ResponseChunk>
```

##### `abortMessage(messageId: string)`
- **Purpose**: Abort an in-progress message
- **Request Parameters**: Message ID
- **Response**: Abort status
- **Error Handling**: Message not found, already completed

```typescript
interface AbortStatus {
  success: boolean;
  messageId: string;
  message: string;
}

async function abortMessage(messageId: string): Promise<AbortStatus>
```

### 3. Context Management Interface

The Context Management Interface manages conversation history and context for agent interactions.

#### Methods

##### `getConversation(conversationId: string)`
- **Purpose**: Retrieve conversation history
- **Request Parameters**: Conversation ID
- **Response**: Conversation details and messages
- **Error Handling**: Conversation not found, authentication errors

```typescript
interface Conversation {
  id: string;
  agentId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'agent';
    content: string;
    created: Date;
    metadata?: {
      [key: string]: any;
    };
  }>;
  created: Date;
  updated: Date;
  metadata?: {
    [key: string]: any;
  };
}

async function getConversation(conversationId: string): Promise<Conversation>
```

##### `createConversation(agentId: string, metadata?: object)`
- **Purpose**: Create a new conversation with an agent
- **Request Parameters**: Agent ID, optional metadata
- **Response**: New conversation details
- **Error Handling**: Agent not found, authentication errors

```typescript
interface NewConversation {
  id: string;
  agentId: string;
  created: Date;
  metadata?: {
    [key: string]: any;
  };
}

async function createConversation(
  agentId: string, 
  metadata?: object
): Promise<NewConversation>
```

##### `addContextItem(conversationId: string, contextItem: ContextItem)`
- **Purpose**: Add context information to a conversation
- **Request Parameters**: Conversation ID, context item
- **Response**: Context update status
- **Error Handling**: Conversation not found, invalid context

```typescript
interface ContextItem {
  type: 'file' | 'data' | 'text' | 'health_data';
  content: any;
  metadata?: {
    [key: string]: any;
  };
}

interface ContextUpdateStatus {
  success: boolean;
  conversationId: string;
  message: string;
}

async function addContextItem(
  conversationId: string, 
  contextItem: ContextItem
): Promise<ContextUpdateStatus>
```

### 4. Data Integration Interface

The Data Integration Interface provides health data to Dust agents for analysis.

#### Methods

##### `prepareHealthData(userId: string, dataType: string, options?: DataOptions)`
- **Purpose**: Prepare health data for agent consumption
- **Request Parameters**: User ID, data type, optional parameters
- **Response**: Prepared data reference
- **Error Handling**: Data not found, processing errors

```typescript
type HealthDataType = 
  'apple_health' | 
  'blood_test' | 
  'keto_mojo' | 
  'nutrition' | 
  'activity';

interface DataOptions {
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  format?: 'json' | 'csv' | 'summary';
  includeAnalytics?: boolean;
  filters?: {
    [key: string]: any;
  };
}

interface PreparedData {
  dataId: string;
  dataType: HealthDataType;
  summary: string;
  size: number;
  format: string;
  created: Date;
  expires: Date;
}

async function prepareHealthData(
  userId: string, 
  dataType: HealthDataType, 
  options?: DataOptions
): Promise<PreparedData>
```

##### `attachHealthData(conversationId: string, dataId: string)`
- **Purpose**: Attach prepared health data to a conversation
- **Request Parameters**: Conversation ID, data ID
- **Response**: Attachment status
- **Error Handling**: Data not found, conversation not found

```typescript
interface AttachmentStatus {
  success: boolean;
  conversationId: string;
  dataId: string;
  message: string;
}

async function attachHealthData(
  conversationId: string, 
  dataId: string
): Promise<AttachmentStatus>
```

##### `getHealthDataSummary(dataId: string)`
- **Purpose**: Get a summary of prepared health data
- **Request Parameters**: Data ID
- **Response**: Data summary
- **Error Handling**: Data not found, expired data

```typescript
interface HealthDataSummary {
  dataId: string;
  dataType: HealthDataType;
  summary: string;
  metrics: {
    [key: string]: {
      count: number;
      min?: number;
      max?: number;
      avg?: number;
      unit?: string;
    };
  };
  dateRange: {
    start: Date;
    end: Date;
  };
  created: Date;
  expires: Date;
}

async function getHealthDataSummary(dataId: string): Promise<HealthDataSummary>
```

### 5. Error Handling Interface

The Error Handling Interface manages error conditions and recovery for agent interactions.

#### Methods

##### `getErrorDetails(errorId: string)`
- **Purpose**: Get detailed information about an error
- **Request Parameters**: Error ID
- **Response**: Error details
- **Error Handling**: Error not found

```typescript
interface ErrorDetails {
  id: string;
  code: string;
  message: string;
  timestamp: Date;
  context: {
    agentId?: string;
    conversationId?: string;
    messageId?: string;
    request?: any;
  };
  resolution?: {
    type: 'retry' | 'fallback' | 'abort';
    message: string;
  };
}

async function getErrorDetails(errorId: string): Promise<ErrorDetails>
```

##### `retryOperation(operationId: string, options?: RetryOptions)`
- **Purpose**: Retry a failed operation
- **Request Parameters**: Operation ID, optional parameters
- **Response**: Retry status
- **Error Handling**: Operation not found, retry limit exceeded

```typescript
interface RetryOptions {
  maxAttempts?: number;
  backoffStrategy?: 'linear' | 'exponential';
  timeout?: number;
  modifiedParameters?: {
    [key: string]: any;
  };
}

interface RetryStatus {
  success: boolean;
  operationId: string;
  attemptNumber: number;
  message: string;
  result?: any;
}

async function retryOperation(
  operationId: string, 
  options?: RetryOptions
): Promise<RetryStatus>
```

## Data Formats

### Agent Request Format

```typescript
interface AgentRequest {
  version: string;
  agent: {
    id: string;
    config?: {
      [key: string]: any;
    };
  };
  message: {
    content: string;
    attachments?: Array<{
      type: string;
      content: string | Buffer;
      mimeType: string;
    }>;
  };
  context?: {
    conversation?: {
      id: string;
      messages?: Array<{
        role: 'user' | 'agent';
        content: string;
        timestamp: string;
      }>;
    };
    user?: {
      id: string;
      timezone?: string;
      preferences?: {
        [key: string]: any;
      };
    };
    data?: Array<{
      type: string;
      content: any;
      metadata?: {
        [key: string]: any;
      };
    }>;
  };
  options?: {
    streaming?: boolean;
    maxTokens?: number;
    responseFormat?: string;
    timeout?: number;
  };
}
```

### Agent Response Format

```typescript
interface AgentResponse {
  version: string;
  message: {
    id: string;
    content: string;
    created: string; // ISO date string
  };
  conversation: {
    id: string;
  };
  metadata?: {
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    sources?: Array<{
      type: string;
      reference: string;
      content?: string;
    }>;
    [key: string]: any;
  };
}
```

### Streaming Response Format

```typescript
interface StreamingResponse {
  id: string;
  chunk: string;
  done: boolean;
  error?: {
    code: string;
    message: string;
  };
}
```

## Authentication and Security

### Authentication Methods

1. **API Key Authentication**
   - API key included in request headers
   - Key rotation and management
   - Scoped permissions for different operations

2. **Request Signing**
   - HMAC signature of request payload
   - Timestamp validation to prevent replay attacks
   - Nonce validation for request uniqueness

### Security Measures

1. **Transport Security**
   - TLS 1.3+ for all API communications
   - Certificate validation
   - Secure cipher suites

2. **Data Protection**
   - Sensitive data encryption
   - Minimal data exposure in requests
   - Secure handling of health information

3. **Rate Limiting and Abuse Prevention**
   - Request rate limiting
   - Concurrent request limits
   - Abuse detection mechanisms

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    id: string;
    code: string;
    message: string;
    details?: {
      [key: string]: any;
    };
    timestamp: string; // ISO date string
    requestId?: string;
  };
}
```

### Common Error Codes

| Code | Description | Recovery Strategy |
|------|-------------|------------------|
| `auth_error` | Authentication failure | Refresh credentials |
| `invalid_request` | Malformed request | Fix request format |
| `agent_not_found` | Agent not available | Check agent ID |
| `rate_limited` | Too many requests | Implement backoff |
| `timeout` | Request timeout | Retry with longer timeout |
| `internal_error` | Server-side error | Retry after delay |
| `data_error` | Data processing error | Check data format |

### Retry Strategies

1. **Exponential Backoff**
   - Initial retry after 1 second
   - Double delay for each subsequent retry
   - Maximum of 5 retries

2. **Circuit Breaking**
   - Track error rates
   - Temporarily disable requests after threshold
   - Gradually restore service

## Implementation Considerations

### API Client Implementation

```typescript
class DustAgentClient {
  private apiKey: string;
  private baseUrl: string;
  private workspace: string;
  
  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    workspace: string;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://dust.tt/api/v1';
    this.workspace = config.workspace;
  }
  
  // Agent Configuration Interface
  async listAgents(): Promise<AgentMetadata[]> {
    // Implementation
  }
  
  async getAgentDetails(agentId: string): Promise<AgentDetails> {
    // Implementation
  }
  
  async configureAgent(
    agentId: string, 
    config: AgentConfig
  ): Promise<ConfigurationStatus> {
    // Implementation
  }
  
  // Agent Communication Interface
  async sendMessage(
    agentId: string, 
    message: AgentMessage, 
    options?: MessageOptions
  ): Promise<AgentResponse> {
    // Implementation
  }
  
  async *streamMessage(
    agentId: string, 
    message: AgentMessage, 
    options?: MessageOptions
  ): AsyncGenerator<ResponseChunk> {
    // Implementation
  }
  
  // Additional methods for other interfaces...
}
```

### Integration with MCP Tools

```typescript
// Example MCP tool registration using the Dust Agent client
server.tool(
  "dust_agent_chat",
  "Chat with a Dust health agent",
  {
    agentId: z.string({
      description: "ID of the Dust agent to chat with"
    }),
    message: z.string({
      description: "Message to send to the agent"
    }),
    conversationId: z.string({
      description: "Optional conversation ID for continuing a chat"
    }).optional(),
    includeHealthData: z.boolean({
      description: "Whether to include relevant health data"
    }).optional()
  },
  async (params) => {
    const dustClient = new DustAgentClient({
      apiKey: process.env.DUST_API_KEY!,
      workspace: process.env.DUST_WORKSPACE_ID!
    });
    
    let conversationId = params.conversationId;
    
    if (!conversationId) {
      const conversation = await dustClient.createConversation(params.agentId);
      conversationId = conversation.id;
    }
    
    if (params.includeHealthData) {
      // Prepare and attach relevant health data
      // Implementation details...
    }
    
    const response = await dustClient.sendMessage(
      params.agentId,
      { content: params.message },
      { conversationId }
    );
    
    return {
      content: [{
        type: "text",
        text: response.content
      }],
      metadata: {
        conversationId: response.conversationId
      }
    };
  }
);
```

## Decision

Based on the API interface design, we will:

1. Implement a comprehensive Dust agent client with all required interfaces
2. Use TypeScript for type-safe API interactions
3. Implement robust error handling and retry mechanisms
4. Create MCP tools that leverage the Dust agent capabilities
5. Design for both synchronous and streaming responses
6. Ensure secure handling of health data throughout the API

## Consequences

- The API interfaces provide a clear contract between the MCP server and Dust agents
- Type safety ensures consistent data formats and error handling
- The modular design allows for independent evolution of components
- Comprehensive error handling improves reliability
- The streaming support enables real-time agent interactions
- Security considerations are addressed throughout the design

## Open Questions

- How will we handle version changes in the Dust API?
- What's the optimal approach for caching agent responses?
- How should we manage rate limits and concurrent requests?

## References

- [Dust API Documentation](https://dust.tt/api/docs)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [REST API Design Best Practices](https://restfulapi.net/)
