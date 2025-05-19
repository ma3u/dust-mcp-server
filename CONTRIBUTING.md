# Contributing to Dust MCP Server

Thank you for your interest in contributing to Dust MCP Server! We appreciate your time and effort. Here's how you can contribute:

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [License](#license)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a new branch for your changes: `git checkout -b feature/your-feature-name`

## Development Workflow

1. Make your changes following the code style guidelines
2. Run tests: `npm test`
3. Ensure all tests pass
4. Commit your changes with a descriptive message
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a pull request

## Code Style

- Follow the existing code style in the project
- Use 2 spaces for indentation
- Use single quotes for strings
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Add JSDoc comments for public APIs

## Testing

- Write tests for new features and bug fixes
- Run tests: `npm test`
- Run tests in watch mode: `npm test -- --watch`
- Run coverage: `npm test -- --coverage`

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build
2. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters
3. Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent. The versioning scheme we use is [SemVer](http://semver.org/)
4. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you

## Reporting Bugs

Use the [GitHub Issues](https://github.com/Ma3u/dust-mcp-server/issues) to report bugs. Please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Any relevant error messages or logs
- Your environment (OS, Node.js version, etc.)

## Feature Requests

We welcome feature requests! Please open an issue on GitHub with:

- A clear and descriptive title
- A description of the problem you're trying to solve
- Any alternative solutions or features you've considered
- Additional context about the feature

## License

By contributing, you agree that your contributions will be licensed under the project's [LICENSE](LICENSE) file.
