# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.1   | :x:                |

## Reporting a Vulnerability

### Security Issues

If you discover a security vulnerability in Dust MCP Server, please report it by creating a new security advisory in the [GitHub Security Advisories](https://github.com/Ma3u/dust-mcp-server/security/advisories/new) page.

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

### What to Include

When reporting a vulnerability, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- The impact of the vulnerability
- Any potential mitigations or workarounds
- Your contact information

### Response Time

We will make a best effort to respond to security reports within 48 hours. If the issue is confirmed, we will release a patch as soon as possible depending on complexity but historically within a few days.

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.x) for the current minor version. We recommend always running the latest patch version of Dust MCP Server.

## Security Best Practices

### For Users

- Always keep your dependencies up to date
- Run the server with the minimum required permissions
- Use environment variables for sensitive configuration
- Regularly rotate API keys and credentials
- Monitor server logs for suspicious activity

### For Developers

- Follow secure coding practices
- Never commit sensitive information to version control
- Use parameterized queries to prevent SQL injection
- Validate and sanitize all user inputs
- Keep dependencies up to date and monitor for security advisories

## Responsible Disclosure

We follow responsible disclosure practices. Please allow us a reasonable amount of time to correct the issue before publishing any information about the vulnerability.
