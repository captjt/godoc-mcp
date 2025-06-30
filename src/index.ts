#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GoDocFetcher } from './fetcher/index.js';
import { ModuleIndexFetcher } from './fetcher/module-index.js';
import { DocumentationCache } from './cache/index.js';
import { logger } from './utils/logger.js';

// Initialize components
const cache = new DocumentationCache({
  stdTTL: parseInt(process.env.GODOC_MCP_CACHE_TTL || '3600'),
  maxKeys: parseInt(process.env.GODOC_MCP_CACHE_SIZE || '1000'),
});

const fetcher = new GoDocFetcher({
  timeout: parseInt(process.env.GODOC_MCP_REQUEST_TIMEOUT || '30') * 1000,
});

const moduleIndex = new ModuleIndexFetcher(
  parseInt(process.env.GODOC_MCP_REQUEST_TIMEOUT || '30') * 1000
);

// Create MCP server
const server = new Server(
  {
    name: 'godoc-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Error handler helper
function handleError(error: any): McpError {
  logger.error('Tool error:', error);

  if (error.code === 'NOT_FOUND') {
    return new McpError(ErrorCode.InvalidRequest, error.message);
  }

  if (error.code === 'TIMEOUT') {
    return new McpError(ErrorCode.InternalError, 'Request timeout');
  }

  return new McpError(ErrorCode.InternalError, 'An error occurred while fetching documentation');
}

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_package_doc',
      description: 'Get comprehensive documentation for a Go package',
      inputSchema: {
        type: 'object',
        properties: {
          package: {
            type: 'string',
            description: 'Package path',
          },
          version: {
            type: 'string',
            description: 'Optional version',
          },
        },
        required: ['package'],
      },
    },
    {
      name: 'get_function_doc',
      description: 'Get documentation for a specific function in a Go package',
      inputSchema: {
        type: 'object',
        properties: {
          package: {
            type: 'string',
            description: 'Package path',
          },
          function: {
            type: 'string',
            description: 'Function name',
          },
          version: {
            type: 'string',
            description: 'Optional version',
          },
        },
        required: ['package', 'function'],
      },
    },
    {
      name: 'get_type_doc',
      description: 'Get documentation for a type and its methods',
      inputSchema: {
        type: 'object',
        properties: {
          package: {
            type: 'string',
            description: 'Package path',
          },
          type: {
            type: 'string',
            description: 'Type name',
          },
          version: {
            type: 'string',
            description: 'Optional version',
          },
        },
        required: ['package', 'type'],
      },
    },
    {
      name: 'search_packages',
      description: 'Search for Go packages by name or description',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 10)',
            minimum: 1,
            maximum: 50,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_package_examples',
      description: 'Get example code for a Go package',
      inputSchema: {
        type: 'object',
        properties: {
          package: {
            type: 'string',
            description: 'Package path',
          },
        },
        required: ['package'],
      },
    },
    {
      name: 'get_package_versions',
      description: 'Get all available versions of a Go package',
      inputSchema: {
        type: 'object',
        properties: {
          package: {
            type: 'string',
            description: 'Package path',
          },
        },
        required: ['package'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
  }

  try {
    switch (name) {
      case 'get_package_doc': {
        const packagePath = args.package as string;
        let version = args.version as string | undefined;

        // Handle "latest" version
        if (version === 'latest') {
          version = (await moduleIndex.getLatestVersion(packagePath)) || undefined;
        }

        const cacheKey = version ? `package:${packagePath}@${version}` : `package:${packagePath}`;

        // Check cache first
        let doc = cache.get(cacheKey);
        if (!doc) {
          doc = await fetcher.getPackageDoc(packagePath, version);
          cache.set(cacheKey, doc);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(doc, null, 2),
            },
          ],
        };
      }

      case 'get_function_doc': {
        const packagePath = args.package as string;
        const functionName = args.function as string;
        let version = args.version as string | undefined;

        if (version === 'latest') {
          version = (await moduleIndex.getLatestVersion(packagePath)) || undefined;
        }

        const cacheKey = version
          ? `function:${packagePath}@${version}:${functionName}`
          : `function:${packagePath}:${functionName}`;

        let doc = cache.get(cacheKey);
        if (!doc) {
          doc = await fetcher.getFunctionDoc(packagePath, functionName, version);
          cache.set(cacheKey, doc);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(doc, null, 2),
            },
          ],
        };
      }

      case 'get_type_doc': {
        const packagePath = args.package as string;
        const typeName = args.type as string;
        let version = args.version as string | undefined;

        if (version === 'latest') {
          version = (await moduleIndex.getLatestVersion(packagePath)) || undefined;
        }

        const cacheKey = version
          ? `type:${packagePath}@${version}:${typeName}`
          : `type:${packagePath}:${typeName}`;

        let doc = cache.get(cacheKey);
        if (!doc) {
          doc = await fetcher.getTypeDoc(packagePath, typeName, version);
          cache.set(cacheKey, doc);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(doc, null, 2),
            },
          ],
        };
      }

      case 'search_packages': {
        const query = args.query as string;
        const limit = (args.limit as number) || 10;
        const cacheKey = `search:${query}:${limit}`;

        let results = cache.get(cacheKey);
        if (!results) {
          results = await fetcher.searchPackages(query, limit);
          cache.set(cacheKey, results, 300); // Cache search results for 5 minutes
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_package_examples': {
        const packagePath = args.package as string;
        let version = args.version as string | undefined;

        if (version === 'latest') {
          version = (await moduleIndex.getLatestVersion(packagePath)) || undefined;
        }

        const cacheKey = version ? `examples:${packagePath}@${version}` : `examples:${packagePath}`;

        let examples = cache.get(cacheKey);
        if (!examples) {
          examples = await fetcher.getPackageExamples(packagePath, version);
          cache.set(cacheKey, examples);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(examples, null, 2),
            },
          ],
        };
      }

      case 'get_package_versions': {
        const packagePath = args.package as string;
        const cacheKey = `versions:${packagePath}`;

        let versions = cache.get(cacheKey);
        if (!versions) {
          versions = await moduleIndex.getPackageVersions(packagePath);
          cache.set(cacheKey, versions, 300); // Cache for 5 minutes
        }

        if (!versions) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `No versions found for package: ${packagePath}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(versions, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    throw handleError(error);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('godoc-mcp server started');

  // Log cache stats periodically in debug mode
  if (process.env.LOG_LEVEL === 'debug') {
    setInterval(() => {
      logger.debug('Cache stats:', cache.getStats());
    }, 60000); // Every minute
  }
}

main().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});
