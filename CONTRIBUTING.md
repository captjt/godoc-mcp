# Contributing to godoc-mcp

Thank you for your interest in contributing to godoc-mcp! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run tests: `npm run test:core`

## Code Style and Quality

This project uses several tools to maintain code quality and consistency:

### ESLint

- Enforces TypeScript best practices and code quality rules
- Run: `npm run lint`
- Auto-fix: `npm run lint:fix`

### Prettier

- Ensures consistent code formatting
- Run: `npm run format`
- Check: `npm run format:check`

### TypeScript

- Strict type checking is enabled
- Run: `npm run typecheck`

### Pre-commit Hooks

- Automatically runs linting and formatting on staged files
- Powered by Husky and lint-staged
- Runs before each commit

### All Checks

Run all quality checks at once:

```bash
npm run check
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or modifications
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test files

### Examples

```bash
feat(fetcher): add support for generic types
fix(cache): handle expired entries correctly
docs: update installation instructions
test: add integration tests for module index
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the code style guidelines
3. Add or update tests as needed
4. Ensure all tests pass: `npm run test:core`
5. Ensure code passes all checks: `npm run check`
6. Commit your changes using conventional commits
7. Push to your fork and create a pull request

## Testing

### Running Tests

```bash
# Run core tests (no network calls)
npm run test:core

# Run unit tests only
npm run test:unit

# Run all tests (may fail due to rate limiting)
npm test

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

- Place unit tests in `tests/unit/`
- Place integration tests in `tests/integration/`
- Mock external dependencies when possible
- Focus on testing business logic

## Project Structure

```
src/
├── index.ts           # MCP server entry point
├── fetcher/          # pkg.go.dev fetching logic
├── cache/            # Caching implementation
├── types/            # TypeScript type definitions
└── utils/            # Utility functions

tests/
├── unit/             # Unit tests
├── integration/      # Integration tests
└── utils/            # Test utilities
```

## Editor Setup

### VS Code

The project includes VS Code settings and recommended extensions:

- Install recommended extensions when prompted
- Format on save is enabled
- ESLint auto-fix on save is enabled

### Other Editors

- Install EditorConfig plugin for consistent formatting
- Configure your editor to use Prettier for formatting
- Enable ESLint integration

## Questions?

If you have questions or need help, please:

1. Check existing issues and pull requests
2. Create a new issue with your question
3. Be as specific as possible

Thank you for contributing!
