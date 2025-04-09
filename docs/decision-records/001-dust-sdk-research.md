# Decision Record: Dust.tt Agent Configuration SDK Requirements

## Date
2025-04-09

## Context
To successfully integrate with Dust.tt agents, we need to understand the Dust SDK requirements and capabilities. This research is critical for designing our MCP server architecture that will connect Claude Desktop with Dust AI agents.

## Research Findings

### Dust SDK Overview
- Official SDK: [dust-sdk-js](https://github.com/dust-tt/dust-sdk-js)
- The SDK provides TypeScript/JavaScript interfaces for interacting with Dust agents
- Latest version: Check [npm](https://www.npmjs.com/package/@dust-tt/dust-sdk) for the most recent version

### Key SDK Components

#### Authentication
- API Key-based authentication required for all requests
- Workspace ID needed to scope requests to specific workspaces
- API keys should be stored securely in environment variables

#### Agent Configuration
- Agents are identified by unique IDs or names within a workspace
- Multiple agents can be configured and accessed within the same workspace
- Agent configuration includes:
  - Input schema definition
  - Output formatting preferences
  - Context window management settings
  - Memory and conversation history settings

#### Communication Protocol
- RESTful API endpoints for agent interaction
- Supports both synchronous and streaming responses
- Conversation history can be maintained across sessions
- Supports file attachments and multi-modal inputs

#### Error Handling
- Structured error responses with error codes and descriptions
- Rate limiting considerations for API calls
- Retry mechanisms for transient failures

### Integration Requirements

#### Environment Variables
- `DUST_API_KEY`: Authentication key for Dust API
- `DUST_WORKSPACE_ID`: ID of the workspace containing the agents
- `DUST_AGENT_IDs`: List of agent IDs to be made available
- `DUST_DOMAIN`: API endpoint domain (default: https://dust.tt)

#### User Context
- User identification information can be passed to agents
- Timezone and locale settings for contextual responses
- Optional user preferences for agent behavior

## Decision
Based on the research, we will:

1. Implement a secure configuration system for storing Dust API credentials
2. Create a flexible agent management system that supports multiple agents
3. Design a robust error handling mechanism for API interactions
4. Support both synchronous and streaming responses from agents
5. Implement proper user context management for personalized interactions

## Consequences
- The MCP server will require proper environment configuration before use
- We'll need to implement proper error handling for API rate limits
- The architecture must support streaming responses for real-time interactions
- User context will need to be managed and passed to agents appropriately

## Open Questions
- How will we handle agent-specific configuration beyond the basic settings?
- What's the best approach for managing conversation history across sessions?
- How should we handle authentication failures or API outages?

## References
- [Dust SDK GitHub Repository](https://github.com/dust-tt/dust-sdk-js)
- [Dust API Documentation](https://dust.tt/api/docs)
