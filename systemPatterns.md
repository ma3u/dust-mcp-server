# System Patterns

## Memory Management

### Internal Memory
- **decisionLog.md**: Track all project decisions with context
- **progress.md**: Current project status and milestones
- **systemPatterns.md**: This file - system architecture and patterns
- **activeContext.md**: Current focus and active work items
- **productContext.md**: Product requirements and user stories

### External Memory (GitHub)
- **Code**: Source code and configuration
- **CI/CD**: GitHub Actions workflows
- **Documentation**: Public-facing docs in `/docs`
- **Issues/PRs**: Track work and collaboration
- **Wiki**: Project knowledge base

## Development Workflow

### Branching Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features and enhancements
- `bugfix/*`: Bug fixes
- `release/*`: Release preparation

### Commit Message Format
```
:emoji: [JIRA-123] Brief description

Detailed explanation of changes
- Bullet points for multiple changes
- Reference related issues/PRs
```

### Code Review Process
1. Create a feature/bugfix branch
2. Make changes with atomic commits
3. Run tests and linters locally
4. Push branch and create PR
5. Address review comments
6. Squash and merge when approved

## CI/CD Pipeline

### CI Workflow
- Run on every push and PR
- Lint and type-check code
- Run unit and integration tests
- Build the application
- Report test coverage

### CD Workflow
- Triggered on push to `main`
- Build production artifacts
- Run end-to-end tests
- Deploy to production
- Notify on success/failure

## Error Handling

### Client Errors (4xx)
- Return appropriate HTTP status codes
- Include error details in response body
- Log at warning level

### Server Errors (5xx)
- Return generic error message to client
- Log detailed error information
- Alert on-call engineer

## Logging

### Levels
- `error`: System is in an error state
- `warn`: Unexpected but handled condition
- `info`: Important business events
- `debug`: Detailed debug information
- `trace`: Very detailed debug information

### Format
```json
{
  "timestamp": "ISO-8601 timestamp",
  "level": "info",
  "message": "User logged in",
  "userId": "123",
  "requestId": "abc123"
}
```

## Testing

### Unit Tests
- Test individual functions in isolation
- Mock external dependencies
- Fast and focused

### Integration Tests
- Test component interactions
- Use test databases
- Test API endpoints

### E2E Tests
- Test complete user flows
- Run against staging environment
- Include critical paths only

## Security

### Authentication
- Use JWT for stateless auth
- Set secure, httpOnly cookies
- Implement refresh token rotation

### Authorization
- Role-based access control (RBAC)
- Principle of least privilege
- Validate all user inputs

### Secrets Management
- Never commit secrets to version control
- Use environment variables
- Rotate secrets regularly

## Performance

### Caching
- Cache static assets
- Implement API response caching
- Use ETags for conditional requests

### Database
- Optimize queries with indexes
- Use connection pooling
- Monitor slow queries

### Monitoring
- Track key metrics
- Set up alerts
- Monitor error rates and latencies
