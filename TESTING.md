# Testing Guide for godoc-mcp

## Overview

The test suite includes both unit and integration tests. Integration tests interact with real pkg.go.dev endpoints and the Go module index, which can sometimes cause failures due to:

1. **Rate limiting** - pkg.go.dev aggressively rate limits requests (HTTP 429)
2. **HTML structure changes** - The website's HTML may change over time
3. **Network issues** - Timeouts or connectivity problems
4. **Module index updates** - The module index is constantly updating

## Current Status

⚠️ **Important**: Due to aggressive rate limiting from pkg.go.dev, most integration tests that hit real endpoints will fail. This is expected behavior and does not indicate a problem with the MCP server itself.

## Running Tests

### Recommended: Run Core Tests Only
```bash
# Run tests that don't require network access (RECOMMENDED)
npm run test:core
```

### Other Test Commands
```bash
# Run all tests (will likely fail due to rate limiting)
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/core-functionality.test.ts
```

## Common Test Failures and Solutions

### 1. Rate Limiting (HTTP 429)
**Error**: `Network error: HTTP 429: Too Many Requests`

**Solution**: 
- Wait a few minutes before running tests again
- Run tests individually with delays
- Use the basic functionality test suite which has built-in delays

### 2. HTML Structure Changes
**Error**: `Function Printf not found in fmt` or similar

**Cause**: pkg.go.dev's HTML structure has changed

**Solution**:
- The fetcher uses multiple fallback selectors
- If tests fail consistently, the selectors may need updating
- Check `tests/check-structure.cjs` to inspect current HTML

### 3. Search Functionality
**Issue**: Search tests may return empty results

**Cause**: Search functionality on pkg.go.dev can be unreliable or change

**Solution**: Tests are written to handle empty search results gracefully

### 4. Module Index Issues
**Error**: Timeout or parsing errors with module index

**Solution**: 
- The module index is large (2000+ entries) and may take time to fetch
- Tests cache the index for subsequent calls
- Network issues may cause timeouts

## Test Structure

### Unit Tests (`tests/unit/`)
- Test individual components in isolation
- No network calls
- Always reliable

### Integration Tests (`tests/integration/`)
- `basic-functionality.test.ts` - Core features with delays to avoid rate limiting
- `cache.test.ts` - Cache behavior and performance
- `fetcher.test.ts` - Full fetcher functionality (may hit rate limits)
- `module-index.test.ts` - Module index integration
- `end-to-end.test.ts` - Complete workflows (most prone to failures)

## Best Practices

1. **Run unit tests first** to ensure basic functionality
2. **Use delays** between integration tests to avoid rate limiting
3. **Run integration tests individually** if you encounter rate limits
4. **Check HTML structure** if parsing tests fail consistently
5. **Mock external calls** when testing business logic

## Debugging Failed Tests

### Check Current HTML Structure
```bash
node tests/check-structure.cjs
```

### Run Single Test with Verbose Output
```bash
npx vitest run -t "test name" --reporter=verbose
```

### Inspect Network Requests
Set `LOG_LEVEL=debug` to see all network requests:
```bash
LOG_LEVEL=debug npm test
```

## CI/CD Considerations

For continuous integration:

1. **Separate test runs**: Run unit and integration tests separately
2. **Add retries**: Integration tests may need retries due to transient failures
3. **Cache module index**: Cache the Go module index between runs
4. **Use longer timeouts**: Network requests may be slower in CI environments
5. **Consider mocking**: For critical paths, consider mocking external services

## Updating Tests

When pkg.go.dev changes its HTML structure:

1. Run `node tests/check-structure.cjs` to inspect current HTML
2. Update selectors in `src/fetcher/index.ts`
3. Update test expectations if needed
4. Document the changes in this file

## Summary

The test suite is designed to be resilient to external changes, but integration tests will occasionally fail due to factors outside our control. The basic functionality tests provide a reliable baseline, while the full test suite ensures comprehensive coverage when external services are cooperating.