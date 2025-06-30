export interface PackageDoc {
  name: string;
  importPath: string;
  version?: string;
  synopsis: string;
  overview?: string;
  readme?: string;
  subdirectories?: string[];
  imports?: string[];
}

export interface FunctionDoc {
  name: string;
  signature: string;
  documentation: string;
  examples?: CodeExample[];
  packagePath: string;
}

export interface TypeDoc {
  name: string;
  definition: string;
  documentation: string;
  methods?: MethodDoc[];
  packagePath: string;
}

export interface MethodDoc {
  name: string;
  signature: string;
  documentation: string;
  receiver?: string;
}

export interface CodeExample {
  name: string;
  code: string;
  output?: string;
}

export interface SearchResult {
  path: string;
  name: string;
  synopsis: string;
  score?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface FetcherOptions {
  timeout?: number;
  userAgent?: string;
}

export interface GoDocError extends Error {
  code: 'NOT_FOUND' | 'PARSE_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT';
  details?: any;
}

// New types for module index
export interface ModuleVersion {
  path: string;
  version: string;
  timestamp: string;
}

export interface PackageVersions {
  path: string;
  versions: Array<{
    version: string;
    timestamp: string;
  }>;
  latest?: string;
}