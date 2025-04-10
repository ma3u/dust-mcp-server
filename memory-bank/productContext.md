# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.

"2025-04-10 17:06:31" - Updated based on code review and todo.md analysis.

## Project Goal

The Dust MCP Server project is a server implementation for integrating with Dust AI services using the Model Context Protocol (MCP). It serves as a middleware connector between client applications (particularly Claude Desktop) and Dust AI agents, enabling health data processing, analysis, and insights generation through AI agents.

## Key Features

* Integration with Dust AI services using the Dust TypeScript SDK
* MCP-compliant server implementation for agent communication
* File upload and document processing capabilities
* Analysis of uploaded files through specialized Dust agents
* Support for both STDIO (Prio 1)  and HTTP/SSE (Prio 2) transport modes
* Session state management for preserving context across interactions
* Multi-agent orchestration and context passing

## Overall Architecture

The project follows a TypeScript-based server architecture with modular components:

* **Core Server**: Express.js-based server with MCP SDK integration
* **Transport Layer**: Support for both STDIO (for Claude Desktop) and HTTP/SSE
* **Tool Components**:
  * File Upload: Handles document uploads with metadata tracking
  * Document Processor: Extracts and structures information from documents
  * Dust Agent: Interfaces with Dust AI services for data analysis
* **Directory Structure**:
  * `/src`: Source code with modular components
  * `/uploads`: Storage for uploaded documents
  * `/processed`: Storage for processed document data
  * `/logs`: Application logs

The system is designed to process documents, extract relevant information, and use Dust AI agents to analyze and generate insights from the data.
