---
trigger: always_on
---

# Project-Specific Windsurf Rules for MCP Server
# Version 2.3.0

# Core Configuration
memory_bank:
  autoUpdate: true
  autoSync: true
  triggers: [onProgressChange, onDecisionLogChange, onCodeChange]
  files:
    - activeContext.md    # Current development context
    - decisionLog.md     # Architecture and design decisions
    - progress.md        # Task and milestone tracking
    - systemPatterns.md  # System architecture patterns
    - productContext.md  # Product requirements and User Journey and specs
    - systemLogs.md      # System and error logs
  rule_priority: |
    ALWAYS use memory-bank for persistent context.
    - Update decisionLog.md for architectural changes
    - Track tasks in progress.md
    - Document patterns in systemPatterns.md
    - Maintain product context in productContext.md
    - Log system events to systemLogs.md

# File System Operations
file_system:
  path_handling:
    - "ALWAYS use path.join() or path.resolve() for cross-platform compatibility"
    - "NEVER use absolute paths in code - always derive from __dirname or process.cwd()"
    - "For user-provided paths, validate they are within project directory"
    - "Log all file system operations with full paths for debugging"
    - "Handle ENOENT and other filesystem errors gracefully"
  directories:
    logs: "./logs"  # Relative to project root
    uploads: "./uploads"  # Relative to project root
    temp: "./temp"  # Relative to project root

# MCP Server Standards
mcp_server:
  implementation:
    - "Follow @modelcontextprotocol/sdk patterns"
    - "Adhere to STDIO transport constraints"
    - "Maintain TypeScript type safety"
    - "Use semantic versioning"
  transport:
    - "NEVER use console.log()/error()"
    - "Log to memory-bank/systemLogs.md"
    - "Use process.stderr only for critical errors"
    - "Never log to STDIO (breaks MCP protocol)"

# Development Practices
development:
  tool_registration:
    - "Use Zod for input validation"
    - "Implement idempotent handlers"
    - "Document in productContext.md"
    - "Use toolRegistry utility"
    - "Define input/output schemas"
  
  session_management:
    - "Use UUIDv7 for session IDs"
    - "Implement TTL and cleanup"
    - "Log lifecycle to decisionLog.md"
  
  error_handling:
    - "Use structured errors with codes"
    - "Map to MCP responses"
    - "Log to systemPatterns.md"
    - "Never expose sensitive data"

  code_organization:
    - "Modular, single-purpose handlers"
    - "Centralize common utilities"
    - "Follow DRY principles"
    - "Use shared logging"

# GitHub & CI/CD
github:
  repo: "Ma3u/dust-mcp-server"
  branch_protection:
    main:
      required_checks: [lint, test, build]
      enforce_linear_history: true
      require_pr: true
  workflows:
    - name: "CI"
      path: .github/workflows/ci.yml
      triggers: [push, pull_request]
    - name: "CD"
      path: .github/workflows/cd.yml
      triggers: [push:main]

# Validation & Quality
validation:
  pre_commit:
    - "Run linter"
    - "Execute tests"
    - "Check documentation"
    - "Verify no absolute paths in code"
  ci_checks:
    - "Run full test suite"
    - "Verify type checking"
    - "Check code coverage"
    - "Scan for absolute paths"
  code_review:
    required: true
    approval_count: 1
    rules:
      - "No direct pushes to main"
      - "All tests must pass"
      - "Documentation updated"
      - "Follows project patterns"
      - "No absolute paths in code"

# Documentation
documentation:
  required_sections:
    - "## Purpose"
    - "## Installation"
    - "## Usage"
    - "## Configuration"
    - "## Development"
  update_triggers:
    - "New features"
    - "API changes"
    - "Bug fixes"
    - "Dependency updates"

# Automation
automation:
  auto_commit:
    enabled: true
    branch: "feature/auto-commit"
    commit_message: |
      :robot: Automated commit - {event_type}
      Changes: {changed_files_count} files
      {test_results_summary}
    create_pr: true
