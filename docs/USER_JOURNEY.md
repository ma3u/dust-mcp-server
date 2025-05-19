# User Journey: Dust MCP Server

This document outlines the typical user journey for interacting with the Dust MCP Server, from initial setup to advanced usage scenarios.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Agent Discovery](#agent-discovery)
3. [Session Management](#session-management)
4. [Interacting with Agents](#interacting-with-agents)
5. [Advanced Scenarios](#advanced-scenarios)
6. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Dust.tt account and API credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/Ma3u/dust-mcp-server.git
cd dust-mcp-server

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration
```

### Configuration

Update the `.env` file with your Dust API credentials and other settings:

```env
DUST_API_KEY=your_api_key_here
DUST_WORKSPACE_ID=your_workspace_id
PORT=3000
NODE_ENV=development
```

### Starting the Server

```bash
# Development mode with hot-reload
npm run dev

# Production mode
npm run build
npm start
```

## Agent Discovery

### Listing Available Agents

```bash
# Using cURL
curl -X GET http://localhost:3000/api/agents

# Example Response
[
  {
    "id": "research_agent",
    "name": "Research Assistant",
    "description": "Helps with research tasks and information gathering",
    "capabilities": ["web_search", "document_analysis"]
  },
  {
    "id": "data_analyst",
    "name": "Data Analyst",
    "description": "Analyzes data and generates insights",
    "capabilities": ["data_analysis", "visualization"]
  }
]
```

### Getting Agent Details

```bash
# Using cURL
curl -X GET http://localhost:3000/api/agents/research_agent

# Example Response
{
  "id": "research_agent",
  "name": "Research Assistant",
  "description": "Helps with research tasks and information gathering",
  "capabilities": ["web_search", "document_analysis"],
  "metadata": {
    "version": "1.0.0"
  }
}
```

## Session Management

### Creating a Session

```bash
# Using cURL
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "research_agent",
    "context": {
      "preferences": {
        "language": "en",
        "detailLevel": "detailed"
      }
    }
  }'

# Example Response
{
  "id": "sess_1234567890",
  "agentId": "research_agent",
  "context": {
    "preferences": {
      "language": "en",
      "detailLevel": "detailed"
    }
  },
  "createdAt": "2025-05-19T10:30:00.000Z",
  "lastActivity": "2025-05-19T10:30:00.000Z"
}
```

### Ending a Session

```bash
# Using cURL
curl -X DELETE http://localhost:3000/api/sessions/sess_1234567890
```

## Interacting with Agents

### Sending a Message

```bash
# Using cURL
curl -X POST http://localhost:3000/api/sessions/sess_1234567890/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the latest developments in AI?"
  }'

# Example Response
{
  "response": "Here are the latest developments in AI as of 2025...",
  "context": {
    "preferences": {
      "language": "en",
      "detailLevel": "detailed"
    },
    "lastMessage": "What are the latest developments in AI?"
  }
}
```

### Uploading Files

```bash
# Using cURL with base64-encoded file content
curl -X POST http://localhost:3000/api/sessions/sess_1234567890/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Please analyze this document",
    "files": [
      {
        "name": "document.pdf",
        "content": "<base64-encoded-file-content>"
      }
    ]
  }'
```

## Advanced Scenarios

### Multi-Agent Workflow

1. **Create a research session**
   ```bash
   curl -X POST http://localhost:3000/api/sessions -d '{"agentId":"research_agent"}'
   ```

2. **Gather information**
   ```bash
   curl -X POST http://localhost:3000/api/sessions/sess_1234567890/messages -d '{"message":"Find recent papers about quantum computing"}'
   ```

3. **Create a data analysis session**
   ```bash
   curl -X POST http://localhost:3000/api/sessions -d '{"agentId":"data_analyst"}'
   ```

4. **Analyze the research**
   ```bash
   curl -X POST http://localhost:3000/api/sessions/sess_9876543210/messages -d '{"message":"Analyze these research findings and create a summary"}'
   ```

### Using MCP Protocol

The server also supports the Model Context Protocol (MCP) for integration with MCP clients:

```bash
# Example MCP request
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list_agents",
    "params": {},
    "id": 1
  }'
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your `DUST_API_KEY` is set correctly in the `.env` file
   - Ensure your API key has the necessary permissions

2. **Session Not Found**
   - Check that the session ID is correct
   - Sessions expire after 30 minutes of inactivity by default

3. **Agent Not Found**
   - Verify the agent ID is correct
   - Check that the agent is available in your workspace

### Viewing Logs

Logs are stored in the `logs/` directory by default. You can view them with:

```bash
tail -f logs/app-*.log
```

### Getting Help

For additional support, please open an issue on the [GitHub repository](https://github.com/Ma3u/dust-mcp-server/issues).
