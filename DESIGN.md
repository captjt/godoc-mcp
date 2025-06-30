# Go Documentation MCP Server Design Document

## Overview

The Go Documentation MCP (Model Context Protocol) Server provides real-time access to the latest Go package documentation from pkg.go.dev. This server bridges the gap between LLMs and up-to-date Go ecosystem documentation by leveraging Google's Go Module Mirror, Index, and Checksum database.

## Problem Statement

- LLMs often have outdated or incomplete knowledge of Go packages and their APIs
- Go's ecosystem is rapidly evolving with frequent updates to popular packages
- Developers need accurate, current documentation when working with Go packages
- Manual lookup of documentation interrupts the development flow

## Solution

An MCP server that:
1. Fetches real-time documentation from pkg.go.dev
2. Provides structured access to package documentation, including:
   - Package overview and descriptions
   - Function signatures and documentation
   - Type definitions and methods
   - Constants and variables
   - Examples and usage patterns
3. Integrates seamlessly with MCP-compatible LLM clients

## Architecture

### Components

1. **MCP Server Core**
   - Implements the MCP protocol specification
   - Handles client connections and requests
   - Routes requests to appropriate handlers

2. **Documentation Fetcher**
   - Interfaces with pkg.go.dev API
   - Caches responses for performance
   - Handles rate limiting and retries

3. **Parser/Transformer**
   - Extracts relevant documentation from HTML/JSON responses
   - Structures data for LLM consumption
   - Handles different documentation formats

4. **Cache Layer**
   - In-memory cache for frequently accessed packages
   - TTL-based expiration for freshness
   - Optional persistent cache for offline access

### Data Flow

```
Client Request → MCP Server → Cache Check → 
  ↓ (cache miss)
  Documentation Fetcher → pkg.go.dev API →
  ↓
  Parser/Transformer → Cache Update →
  ↓
  Formatted Response → Client
```

## API Design

### Tools/Functions

1. **get_package_doc**
   - Input: package path (e.g., "fmt", "github.com/gin-gonic/gin")
   - Output: Package overview, description, and basic info

2. **get_function_doc**
   - Input: package path, function name
   - Output: Function signature, documentation, examples

3. **get_type_doc**
   - Input: package path, type name
   - Output: Type definition, methods, documentation

4. **search_packages**
   - Input: search query
   - Output: List of matching packages with descriptions

5. **get_package_examples**
   - Input: package path
   - Output: Code examples for the package

### Response Format

The actual implementation returns JSON responses for each tool:

#### get_package_doc
```json
{
  "name": "fmt",
  "importPath": "fmt",
  "synopsis": "Package fmt implements formatted I/O with functions analogous to C's printf and scanf.",
  "overview": "<html content>",
  "readme": "<html content if available>",
  "subdirectories": ["internal"],
  "imports": ["errors", "io", "math", "os", "reflect", "strconv", "sync", "unicode/utf8"]
}
```

#### get_function_doc
```json
{
  "name": "Printf",
  "signature": "func Printf(format string, a ...any) (n int, err error)",
  "documentation": "Printf formats according to a format specifier and writes to standard output.",
  "examples": [
    {
      "name": "Example",
      "code": "fmt.Printf(\"Binary: %b\\n\", 255)",
      "output": "Binary: 11111111"
    }
  ],
  "packagePath": "fmt"
}
```

#### get_type_doc
```json
{
  "name": "Stringer",
  "definition": "type Stringer interface {\n    String() string\n}",
  "documentation": "Stringer is implemented by any value that has a String method...",
  "methods": [
    {
      "name": "String",
      "signature": "String() string",
      "documentation": "String returns a string representation of the value.",
      "receiver": "Stringer"
    }
  ],
  "packagePath": "fmt"
}
```

## Implementation Decisions

### HTML Parsing Approach
We chose HTML parsing over waiting for an official API because:
- pkg.go.dev doesn't currently offer a public API
- HTML structure is relatively stable and well-organized
- Cheerio makes parsing straightforward and maintainable
- Can be updated if/when an official API becomes available

### Caching Strategy
- **In-memory caching** using node-cache for simplicity and performance
- **Configurable TTL** with 1-hour default for package documentation
- **Shorter TTL** (5 minutes) for search results to ensure freshness
- **Cache key structure**: Prefixed keys (e.g., `package:`, `function:`, `type:`) for easy management

### Error Handling
- **Typed errors** with specific error codes (NOT_FOUND, PARSE_ERROR, NETWORK_ERROR, TIMEOUT)
- **Graceful degradation**: Return cached data when available during failures
- **Detailed logging** for debugging while keeping user-facing errors simple

### Performance Optimizations
- **Request timeout**: 30-second default to prevent hanging requests
- **Cache-first approach**: Always check cache before making network requests
- **Efficient parsing**: Only extract required data from HTML
- **No request coalescing** in initial version (can be added if needed)

### Security Considerations
- **Input validation**: Package paths are validated by pkg.go.dev
- **No arbitrary URL fetching**: Only pkg.go.dev URLs are accessed
- **Read-only operations**: No data modification or storage beyond caching
- **Rate limiting**: Handled by cache layer naturally

### Development Experience
- **TypeScript strict mode**: Ensures type safety throughout
- **Structured logging**: Easy debugging with Winston
- **Hot reloading**: tsx for rapid development
- **Clear separation of concerns**: Fetcher, cache, and server logic are isolated

## Technical Stack

### Language Choice: TypeScript

While Go would have been a natural choice for a Go documentation server, we chose TypeScript for several compelling reasons:

1. **MCP SDK Support**: The official MCP SDK has excellent TypeScript support with full type definitions
2. **HTML Parsing**: Cheerio provides jQuery-like server-side DOM manipulation, making it easier to parse pkg.go.dev's HTML
3. **Ecosystem**: Rich ecosystem of packages for caching (node-cache), logging (winston), and HTTP handling
4. **Development Speed**: Faster iteration with tools like tsx for hot reloading during development
5. **Cross-platform**: Node.js ensures consistent behavior across different operating systems

### Core Dependencies

- **@modelcontextprotocol/sdk**: Official MCP SDK for protocol implementation
- **cheerio**: HTML parsing and scraping from pkg.go.dev
- **node-cache**: In-memory caching with TTL support
- **winston**: Structured logging with multiple log levels
- **TypeScript**: Type safety and better developer experience

### Configuration

- Environment variables for runtime configuration
- Sensible defaults for all settings
- No configuration files required for basic usage

## Module Index Integration

We've integrated the official Go module index (`https://index.golang.org/index`) which provides:

1. **Version Discovery**: Complete list of all versions for any Go module
2. **Latest Version Detection**: Automatically determine the latest stable version
3. **Timestamp Information**: Know when each version was published
4. **Enhanced Search**: Search across all indexed modules

### Implementation Details

- **ModuleIndexFetcher**: Separate class that fetches and caches the module index
- **Version-aware URLs**: All documentation URLs support `@version` syntax
- **Smart Version Resolution**: "latest" keyword resolves to the newest stable version
- **Efficient Caching**: Module index cached for 1 hour, individual lookups for 5 minutes

## Future Enhancements

1. **API Integration**: Migrate to official pkg.go.dev API when available ✓ (Partially done with module index)
2. **Version Support**: Allow querying specific versions of packages ✓ (Implemented)
3. **Batch Operations**: Support fetching multiple packages/functions in a single request
4. **Smart Caching**: Pre-fetch commonly used packages and their dependencies
5. **Offline Mode**: Download and index popular packages for offline access
6. **Code Analysis**: Provide insights on best practices and common patterns
7. **Dependency Graph**: Visualize and explore package dependencies using module index
8. **Private Modules**: Support for private module proxies with authentication
9. **Incremental Updates**: Watch for package updates and refresh cache accordingly
10. **WebSocket Support**: Real-time updates for package changes
11. **Diff View**: Compare documentation between versions
12. **Module Proxy Support**: Use alternative module proxies for different regions

## Success Metrics

- Response time < 50ms for cached requests
- Response time < 2s for uncached requests (including pkg.go.dev fetch)
- Cache hit rate > 80% for popular packages
- Support for 100% of public Go packages on pkg.go.dev
- Zero downtime during pkg.go.dev outages (for cached content)
- Memory usage < 100MB for typical usage (1000 cached packages)
- Successful parsing rate > 99% for standard package documentation

## Lessons Learned

1. **HTML Parsing is Fragile**: While Cheerio makes it manageable, HTML structure changes could break parsing. Need to monitor and update selectors as needed.

2. **TypeScript + MCP = Great DX**: The TypeScript MCP SDK provides excellent type safety and makes development much smoother than implementing the protocol from scratch.

3. **Caching is Critical**: pkg.go.dev can be slow for complex packages. Aggressive caching dramatically improves user experience.

4. **Error Messages Matter**: Clear, actionable error messages help users understand issues (e.g., "Package not found" vs generic "Error occurred").

5. **Simple is Better**: Starting with HTML parsing instead of waiting for an API allowed us to deliver value immediately. Can always migrate later.