# godoc-mcp

A Model Context Protocol (MCP) server that provides real-time access to Go package documentation from pkg.go.dev, ensuring LLMs always have the latest and most accurate Go ecosystem information.

## Features

- 🚀 **Real-time Documentation**: Fetches the latest documentation directly from pkg.go.dev
- 📦 **Comprehensive Coverage**: Access any public Go package documentation
- 🔍 **Smart Search**: Search for packages by name or functionality
- 📌 **Version Support**: Query specific versions or get the latest stable version
- 📊 **Module Index Integration**: Uses official Go module index for version discovery
- ⚡ **Performance Optimized**: Intelligent caching for fast responses
- 🛡️ **Reliable**: Graceful handling of network issues with fallback to cached data
- 🔧 **Easy Integration**: Works with any MCP-compatible LLM client

## Why godoc-mcp?

Large Language Models often have outdated knowledge about Go packages and their APIs. The Go ecosystem moves fast, with popular packages receiving frequent updates. This MCP server bridges that gap by providing:

- Current function signatures and documentation
- Up-to-date type definitions and methods
- Latest best practices and examples
- Real-time access to new packages as they're published

## Installation

```bash
# Clone the repository
git clone https://github.com/captjt/godoc-mcp.git
cd godoc-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

### Quick Start

1. Build the project:
   ```bash
   npm run build
   ```

2. Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "godoc": {
         "command": "node",
         "args": ["/absolute/path/to/godoc-mcp/dist/index.js"]
       }
     }
   }
   ```

3. Restart Claude Desktop

4. Test it by asking Claude about Go packages:
   - "Show me the documentation for the fmt package"
   - "What functions are available in the strings package?"
   - "Search for Go web frameworks"

## Usage

### Starting the Server

```bash
# Run in production mode
npm start

# Run in development mode (with auto-reload)
npm run dev

# Run with debug logging
LOG_LEVEL=debug npm start
```

### Configuration

Configure the server using environment variables:

```bash
# Server configuration
export GODOC_MCP_PORT=8080
export GODOC_MCP_HOST=localhost

# Cache configuration
export GODOC_MCP_CACHE_TTL=3600  # Cache TTL in seconds
export GODOC_MCP_CACHE_SIZE=1000  # Max number of cached packages

# Performance tuning
export GODOC_MCP_MAX_CONCURRENT_REQUESTS=10
export GODOC_MCP_REQUEST_TIMEOUT=30
```

### MCP Client Configuration

For Claude Desktop, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "godoc": {
      "command": "node",
      "args": ["/absolute/path/to/godoc-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Or if you've installed globally:

```json
{
  "mcpServers": {
    "godoc": {
      "command": "godoc-mcp"
    }
  }
}
```

## Available Tools

### `get_package_doc`
Retrieves comprehensive documentation for a Go package, with optional version support.

```typescript
// Example usage
get_package_doc({ package: "fmt" })
get_package_doc({ package: "github.com/gin-gonic/gin" })
get_package_doc({ package: "github.com/gin-gonic/gin", version: "v1.9.0" })
get_package_doc({ package: "github.com/gin-gonic/gin", version: "latest" })
```

### `get_function_doc`
Gets detailed documentation for a specific function, with optional version support.

```typescript
// Example usage
get_function_doc({ package: "fmt", function: "Printf" })
get_function_doc({ package: "strings", function: "Split" })
get_function_doc({ package: "strings", function: "Split", version: "latest" })
```

### `get_type_doc`
Retrieves documentation for types and their methods, with optional version support.

```typescript
// Example usage
get_type_doc({ package: "io", type: "Reader" })
get_type_doc({ package: "net/http", type: "Client" })
get_type_doc({ package: "net/http", type: "Client", version: "v1.21.0" })
```

### `search_packages`
Searches for Go packages by name or description.

```typescript
// Example usage
search_packages({ query: "web framework" })
search_packages({ query: "json parsing" })
```

### `get_package_examples`
Retrieves example code for a package, with optional version support.

```typescript
// Example usage
get_package_examples({ package: "context" })
get_package_examples({ package: "sync" })
get_package_examples({ package: "sync", version: "latest" })
```

### `get_package_versions`
Lists all available versions of a Go package from the official module index.

```typescript
// Example usage
get_package_versions({ package: "github.com/gin-gonic/gin" })
get_package_versions({ package: "golang.org/x/text" })
```

## Example Interactions

### Getting Started with a Package
```
User: "How do I use the new slog package for structured logging?"
Assistant: Let me fetch the latest documentation for the slog package...
[Uses get_package_doc and get_package_examples to provide current information]
```

### Understanding Function Signatures
```
User: "What's the signature for http.HandleFunc?"
Assistant: I'll get the current documentation for that function...
[Uses get_function_doc to show the exact, current signature]
```

### Exploring Package Capabilities
```
User: "What methods does io.Reader have?"
Assistant: Let me look up the io.Reader interface and its methods...
[Uses get_type_doc to list all current methods]
```

### Working with Versions
```
User: "What versions of gin are available?"
Assistant: I'll check the available versions of the Gin web framework...
[Uses get_package_versions to list all versions with timestamps]
```

### Version-Specific Documentation
```
User: "Show me the Router type from gin v1.8.0"
Assistant: I'll get the documentation for the Router type from Gin v1.8.0...
[Uses get_type_doc with version parameter]
```

## Development

### Project Structure
```
godoc-mcp/
├── src/
│   ├── index.ts             # MCP server entry point
│   ├── fetcher/
│   │   └── index.ts         # pkg.go.dev fetcher with HTML parsing
│   ├── cache/
│   │   └── index.ts         # In-memory caching implementation
│   ├── types/
│   │   └── index.ts         # TypeScript type definitions
│   └── utils/
│       └── logger.ts        # Winston logger configuration
├── dist/                    # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── README.md
├── DESIGN.md
└── example-config.json      # Example MCP configuration
```

### Running Tests

The project includes comprehensive integration tests that verify the fetching and caching behavior:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test suites
./run-tests.sh fetcher      # Test package fetching from pkg.go.dev
./run-tests.sh cache        # Test caching behavior and performance
./run-tests.sh module-index # Test Go module index integration
./run-tests.sh e2e          # Test end-to-end workflows
```

#### Test Structure

- **Integration Tests** (`tests/integration/`): Test real interactions with pkg.go.dev and caching behavior
  - `fetcher.test.ts`: Tests fetching documentation from pkg.go.dev
  - `cache.test.ts`: Tests caching performance and behavior
  - `module-index.test.ts`: Tests Go module index integration
  - `end-to-end.test.ts`: Tests complete user workflows

- **Unit Tests** (`tests/unit/`): Test individual components in isolation
  - `cache.test.ts`: Tests cache operations without external dependencies

#### Key Test Scenarios

1. **Package Fetching**: Verifies correct parsing of pkg.go.dev HTML
2. **Caching Performance**: Demonstrates 100x+ speed improvement with caching
3. **Version Support**: Tests fetching specific package versions
4. **Error Handling**: Ensures graceful degradation when pkg.go.dev is unavailable
5. **Concurrent Access**: Verifies thread-safe cache operations

### Development Workflow

```bash
# Build the project
npm run build

# Type check
npm run typecheck

# Run in development mode
npm run dev

# Clean build artifacts
npm run clean
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [x] Core MCP server implementation
- [x] pkg.go.dev integration with HTML parsing
- [x] Intelligent caching system
- [x] Search functionality
- [x] Example code extraction
- [ ] Improved error handling for edge cases
- [ ] Support for Go module versions
- [ ] Offline mode support
- [ ] Private module proxy support
- [ ] Version comparison tools
- [ ] Dependency analysis features
- [ ] Unit tests
- [ ] Integration with pkg.go.dev API (when available)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- The Go team for pkg.go.dev and the module proxy
- The MCP protocol creators for enabling LLM tool integration
- The Go community for building amazing packages worth documenting
