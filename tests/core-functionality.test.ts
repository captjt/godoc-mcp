import { describe, it, expect, vi } from 'vitest';
import { DocumentationCache } from '../src/cache/index.js';
import { GoDocFetcher } from '../src/fetcher/index.js';
import { ModuleIndexFetcher } from '../src/fetcher/module-index.js';

describe('Core Functionality (No Network)', () => {
  describe('Cache', () => {
    it('should store and retrieve values', () => {
      const cache = new DocumentationCache();
      const key = 'test';
      const value = { data: 'test' };
      
      expect(cache.set(key, value)).toBe(true);
      expect(cache.get(key)).toEqual(value);
    });

    it('should handle TTL', async () => {
      const cache = new DocumentationCache({ stdTTL: 1 });
      cache.set('key', 'value');
      
      expect(cache.get('key')).toBe('value');
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(cache.get('key')).toBeUndefined();
    });

    it('should provide stats', () => {
      const cache = new DocumentationCache();
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      
      const stats = cache.getStats();
      expect(stats.keys).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('Fetcher with mocked responses', () => {
    it('should parse package documentation', async () => {
      const mockHTML = `
        <html>
          <head>
            <meta name="description" content="Package test provides testing utilities">
          </head>
          <body>
            <div class="Documentation-overview">
              <p>Package test provides testing utilities for Go programs.</p>
            </div>
          </body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHTML
      });

      const fetcher = new GoDocFetcher();
      const doc = await fetcher.getPackageDoc('test');
      
      expect(doc.name).toBe('test');
      expect(doc.importPath).toBe('test');
      expect(doc.synopsis).toContain('testing utilities');
    });

    it('should handle 404 errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const fetcher = new GoDocFetcher();
      
      await expect(fetcher.getPackageDoc('not-found'))
        .rejects.toThrow('Package not found');
    });
  });

  describe('Module Index with mocked responses', () => {
    it('should parse module index', async () => {
      const mockIndex = `{"Path":"fmt","Version":"v1.0.0","Timestamp":"2023-01-01T00:00:00Z"}
{"Path":"errors","Version":"v1.0.0","Timestamp":"2023-01-01T00:00:00Z"}`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockIndex
      });

      const indexFetcher = new ModuleIndexFetcher();
      const index = await indexFetcher.getIndex();
      
      expect(index).toHaveLength(2);
      expect(index[0].path).toBe('fmt');
      expect(index[1].path).toBe('errors');
    });

    it('should find package versions', async () => {
      const mockIndex = `{"Path":"test/pkg","Version":"v1.0.0","Timestamp":"2023-01-01T00:00:00Z"}
{"Path":"test/pkg","Version":"v1.1.0","Timestamp":"2023-06-01T00:00:00Z"}
{"Path":"test/pkg","Version":"v2.0.0","Timestamp":"2023-12-01T00:00:00Z"}`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockIndex
      });

      const indexFetcher = new ModuleIndexFetcher();
      const versions = await indexFetcher.getPackageVersions('test/pkg');
      
      expect(versions).toBeDefined();
      expect(versions?.versions).toHaveLength(3);
      expect(versions?.latest).toBe('v2.0.0');
    });
  });

  describe('Integration without network', () => {
    it('should demonstrate caching workflow', async () => {
      const cache = new DocumentationCache();
      const mockDoc = {
        name: 'fmt',
        importPath: 'fmt',
        synopsis: 'Package fmt implements formatted I/O'
      };

      // Simulate fetching and caching
      cache.set('package:fmt', mockDoc);
      
      // Retrieve from cache
      const cached = cache.get('package:fmt');
      expect(cached).toEqual(mockDoc);
      
      // Cache hit should be recorded
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
    });
  });
});