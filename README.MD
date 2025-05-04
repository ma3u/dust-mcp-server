

# Dust MCP Server

A Model Context Protocol (MCP) server for interacting with Dust.tt agents, designed to work with Claude Desktop via STDIO transport. This server provides tools for querying Dust agents, listing available agents, and retrieving agent configurations.

## Setup and Configuration

### Prerequisites

- Node.js v18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/Ma3u/dust-mcp-server.git
cd dust-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
DUST_API_KEY=your_dust_api_key
DUST_WORKSPACE_ID=your_workspace_id
DUST_AGENT_IDs=comma,separated,agent,ids
DUST_USERNAME=your_username
DUST_EMAIL=your_email
DUST_FULLNAME=Your Full Name
DUST_API_URL=https://dust.tt/api/v1
```

### Running the Server

```bash
node start-server.js
```

### Using MCP Tools

This project uses [MCP Tools](https://github.com/f/mcptools) for testing and integration. Here's how to use them:

1. Install MCP Tools globally

```bash
npm install -g mcptools
```

2. List available tools in the server

```bash
mcp tools node build/dust.js
```

3. Call a specific tool

```bash
mcp call dust_list_agents node build/dust.js --params '{"limit": 10}'

mcp call dust_agent_query node build/dust.js --params '{"query": "Give me a summary"}'
```

4. Add the server to your aliases

```bash
mcp alias add dust node build/dust.js
mcp alias list
```

5. Configure with Claude Desktop

```bash
mcp configs set claude-desktop dust /path/to/node /path/to/dust-mcp-server/build/dust.js
```

## Available MCP Tools

The server provides the following MCP tools for interacting with Dust.tt agents:

### `dust_list_agents`

Lists available Dust agents in your workspace.

**Parameters:**

- `view` (optional): View type for filtering agents
- `limit` (optional): Maximum number of agents to return

**Returns:**

- Markdown formatted list of available Dust agents with their capabilities
- JSON data of all agent configurations

**Example:**

```bash
mcp call dust_list_agents node build/dust.js --params '{"limit": 10}'
```

### `dust_agent_query`

Queries a Dust agent with a natural language prompt.

**Parameters:**

- `agent_id` (optional): ID of the agent to query (will use default if not provided)
- `query` (required): Message to send to the agent
- `conversation_id` (optional): ID of an existing conversation to continue
- `context` (optional): Additional context for the agent

**Returns:**

- Agent's response to the query
- Conversation and message IDs for future reference

**Example:**

```bash
mcp call dust_agent_query node build/dust.js --params '{"query": "Give me a summary of the Dust API"}'
```

### `dust_get_agent_config`

Get detailed configuration for a specific Dust agent.

**Parameters:**

- `agent_id` (required): ID of the agent to get configuration for

**Returns:**

- Markdown formatted agent configuration details
- JSON data of the complete agent configuration

**Example:**

```bash
mcp call dust_get_agent_config node build/dust.js --params '{"agent_id": "agent-id-123"}'
```

## Project Structure

- `/src`: Source code
  - `/services`: Service layer for Dust API integration
  - `/tools`: MCP tool implementations (deprecated, now using direct import)
- `/build`: Compiled JavaScript code
- `/logs`: Application logs
  - `/debug`: Debug logs for API interactions
- `/.env`: Environment configuration
- `/memory-bank`: Project memory and context tracking

## Testing

### Test Scripts

The repository includes a test script to verify MCP functionality:

```bash
# Test MCP tools functionality
node test-mcp-tools.js
```

## Debugging

Logs are stored in the `logs` directory:

- `app-YYYY-MM-DD.log`: Application logs
- `server-YYYY-MM-DD.log`: Server logs
- `test-mcp-YYYY-MM-DD.log`: MCP tools test logs

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build the project
npm run build
```

## API Documentation

For more information about the Dust API, see the official documentation:

- [Dust API Documentation](https://docs.dust.tt/reference/openapi)
- [Agent Configurations](https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-agent-configurations-sid)
- [Conversations](https://docs.dust.tt/reference/post_api-v1-w-wid-assistant-conversations)
- [Messages](https://docs.dust.tt/reference/post_api-v1-w-wid-assistant-conversations-cid-messages)

## License

MIT