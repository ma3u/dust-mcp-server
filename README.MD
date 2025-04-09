

# Health Data MCP Server

A Model Context Protocol (MCP) server for health document processing and analysis, designed to work with Claude Desktop via STDIO transport.

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

# Start the server
npm start
```

### Using MCP Tools

This project uses [MCP Tools](https://github.com/f/mcptools) for testing and integration. Here's how to use them:

1. Install MCP Tools globally

```bash
npm install -g @modelcontextprotocol/mcptools
```

2. List available tools in the server

```bash
mcp tools node build/index.js
```

3. Call a specific tool

```bash
mcp call upload_health_document node build/index.js --params '{"fileContent": "base64-encoded-content", "fileName": "test.pdf", "fileType": "medical_record"}'
```

4. Add the server to your aliases

```bash
mcp alias add health node build/index.js
mcp alias list
```

5. Configure with Claude Desktop

```bash
mcp configs set claude-desktop health /path/to/node /path/to/dust-mcp-server/build/index.js
```

## Available Tools

The server provides the following tools for health document management and analysis:

### `upload_health_document`

Uploads a health document (PDF or image) for storage and future processing.

**Parameters:**

- `fileContent` (string, required): Base64-encoded content of the file
- `fileName` (string, required): Name of the file including extension
- `fileType` (string, required): Type of health document (e.g., "medical_record", "lab_report")
- `description` (string, optional): Additional description of the document

**Returns:**

- Document ID and metadata for the uploaded file

### `list_health_documents`

Lists all uploaded health documents with optional filtering.

**Parameters:**

- `fileType` (string, optional): Filter by document type
- `limit` (number, optional): Maximum number of documents to return
- `sortBy` (string, optional): Field to sort by (e.g., "uploadDate")

**Returns:**

- List of document IDs and metadata

### `process_health_document`

Processes a previously uploaded health document to extract and structure its information.

**Parameters:**

- `documentId` (string, required): ID of the document to process

**Returns:**

- Processing status and extracted information

### `get_health_document`

Retrieves a processed health document by its ID.

**Parameters:**

- `documentId` (string, required): ID of the document to retrieve
- `includeRawText` (boolean, optional): Whether to include the raw extracted text

**Returns:**

- Document metadata and structured data

### `query_health_agent`

Queries a Dust health agent with context from processed documents.

**Parameters:**

- `agentId` (string, required): ID or name of the Dust agent to query
- `documentIds` (string[], required): IDs of processed documents to include as context
- `query` (string, required): The query or question to ask the agent
- `includeResponse` (boolean, optional): Whether to include the full agent response

**Returns:**

- Agent's response to the query with relevant insights

### `generate_health_insights`

Generates health insights and recommendations based on processed documents.

**Parameters:**

- `documentIds` (string[], required): IDs of processed documents to analyze
- `focusArea` (string, optional): Area to focus the analysis on ("nutrition", "lab_results", "overall_health", "trends")
- `timeframe` (string, optional): Timeframe to consider ("recent", "all", "past_month", "past_year")

**Returns:**

- Health insights, trends, and recommendations based on the documents

## Project Structure

- `/src`: Source code
  - `/auth`: Authentication modules (placeholder for Milestone 2)
  - `/middleware`: Express middleware including file upload handling
  - `/tools`: MCP tool implementations
  - `/transport`: Transport layer handling (STDIO and HTTP/SSE)
- `/build`: Compiled JavaScript code
- `/uploads`: Directory for uploaded documents
- `/processed`: Directory for processed document data
- `/logs`: Application logs

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Using with Claude Desktop

After setting up the MCP server, you can use it directly with Claude Desktop:
npm 