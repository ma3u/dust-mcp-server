# Decision Record: SDK Integration and File Upload Processing

## Date

2025-04-09

## Context

The MCP server needs to integrate with existing SDKs rather than creating custom API interfaces. Additionally, instead of direct health device integration, we'll implement file upload capabilities for health data in PDF or image formats.

## SDK Integration Strategy

### Overview

We will leverage existing SDKs to minimize development effort and ensure compatibility with established systems:

1. **MCP TypeScript SDK**: For implementing the Model Context Protocol
2. **Dust.tt SDK**: For agent communication and configuration
3. **Express.js**: For HTTP/SSE transport and file upload handling

We already created the MCP basic code with the MCP tool. Please use the tool as in README described.

### Integration Architecture

```mermaid
┌───────────────────────────────────────────────────────────────┐
│                        MCP Server                             │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ MCP TypeScript  │  │ Express.js      │  │ File Upload     ││
│  │ SDK Integration │  │ Integration     │  │ Processing      ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                    Core Service Layer                         │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ Tool Management │  │ Session Manager │  │ PDF/Image       ││
│  │                 │  │                 │  │ Processor       ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                    Dust Integration Layer                     │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ Dust.tt SDK     │  │ Agent Context   │  │ Response        ││
│  │ Integration     │  │ Builder         │  │ Formatter       ││
│  │                 │  │                 │  │                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

## SDK Implementation Details

### 1. MCP TypeScript SDK Integration

We will use the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`) to implement the Model Context Protocol.

```typescript
import { createServer, Tool, ToolCall } from '@modelcontextprotocol/sdk';

// Initialize MCP server
const server = createServer({
  name: 'Health Data MCP Server',
  version: '1.0.0',
  description: 'MCP server for health data processing and Dust agent integration'
});

// Register tools
server.tool(
  'process_document',
  'Process a document (PDF or image)',
  {
    documentId: z.string({
      description: 'ID of the uploaded document'
    }),
    documentType: z.enum(['lab_report', 'medical_record', 'nutrition_log']),
    options: z.object({
      extractText: z.boolean().optional(),
      performOCR: z.boolean().optional(),
      highlightAbnormal: z.boolean().optional()
    }).optional()
  },
  async (params) => {
    // Implementation using document processing service
  }
);

// Start the server
server.listen(process.env.PORT || 3000);
```

### 2. Dust.tt SDK Integration

We will use the Dust.tt SDK to communicate with Dust agents.

```typescript
import { DustAPI } from '@dust-tt/dust-sdk';

// Initialize Dust client
const dustClient = new DustAPI({
  apiKey: process.env.DUST_API_KEY!,
  workspaceId: process.env.DUST_WORKSPACE_ID!
});

// Example function to interact with a Dust agent
async function queryHealthAgent(agentId: string, message: string, context: any) {
  try {
    const response = await dustClient.runAgent({
      agentId,
      input: {
        message,
        context
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error querying Dust agent:', error);
    throw new Error('Failed to communicate with health agent');
  }
}
```
