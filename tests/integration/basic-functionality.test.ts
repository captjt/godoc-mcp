import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoDocFetcher } from '../../src/fetcher/index.js';
import { ModuleIndexFetcher } from '../../src/fetcher/module-index.js';
import { DocumentationCache } from '../../src/cache/index.js';
import { delay } from '../utils/testHelpers.js';

describe('Basic Functionality Tests', () => {
  let fetcher: GoDocFetcher;
  let moduleIndex: ModuleIndexFetcher;
  let cache: DocumentationCache;

  beforeEach(async () => {
    // Add delay to avoid rate limiting
    await delay(2000);

    fetcher = new GoDocFetcher({ timeout: 10000 });
    moduleIndex = new ModuleIndexFetcher(10000);
    cache = new DocumentationCache({ stdTTL: 300 });
  });

  describe('Core functionality', () => {
    it('should fetch and cache a standard library package', async () => {
      const packagePath = 'errors'; // Small standard library package

      // Fetch package
      const doc = await fetcher.getPackageDoc(packagePath);
      expect(doc).toBeDefined();
      expect(doc.name).toBe('errors');
      expect(doc.importPath).toBe('errors');
      expect(doc.synopsis).toBeTruthy();

      // Cache it
      const cacheKey = `package:${packagePath}`;
      cache.set(cacheKey, doc);

      // Verify cache works
      const cached = cache.get(cacheKey);
      expect(cached).toEqual(doc);
    });

    it('should handle package not found gracefully', async () => {
      try {
        await fetcher.getPackageDoc('this-definitely-does-not-exist-12345');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toContain('not found');
      }
    });

    it('should fetch module versions', async () => {
      const versions = await moduleIndex.getPackageVersions('golang.org/x/text');

      if (versions) {
        expect(versions.path).toBe('golang.org/x/text');
        expect(versions.versions).toBeInstanceOf(Array);
        expect(versions.versions.length).toBeGreaterThan(0);
        expect(versions.latest).toBeTruthy();
      } else {
        console.warn('Module index returned no versions - may be a temporary issue');
      }
    });
  });

  describe('Caching behavior', () => {
    it('should demonstrate cache performance improvement', async () => {
      const packagePath = 'path'; // Another small package

      // First fetch - from network
      const start1 = Date.now();
      const doc1 = await fetcher.getPackageDoc(packagePath);
      const networkTime = Date.now() - start1;

      // Cache it
      cache.set(`package:${packagePath}`, doc1);

      // Second fetch - from cache
      const start2 = Date.now();
      const doc2 = cache.get(`package:${packagePath}`);
      const cacheTime = Date.now() - start2;

      expect(doc2).toEqual(doc1);
      expect(cacheTime).toBeLessThan(networkTime);
      console.log(
        `Network: ${networkTime}ms, Cache: ${cacheTime}ms, Speedup: ${Math.round(networkTime / cacheTime)}x`
      );
    });

    it('should handle cache expiration', async () => {
      const key = 'test-expiry';
      const value = { test: 'data' };

      // Set with 1 second TTL
      cache.set(key, value, 1);
      expect(cache.get(key)).toEqual(value);

      // Wait for expiration
      await delay(1500);
      expect(cache.get(key)).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutFetcher = new GoDocFetcher({ timeout: 1 }); // 1ms timeout

      try {
        await timeoutFetcher.getPackageDoc('fmt');
        expect.fail('Should have timed out');
      } catch (error: any) {
        expect(error.code).toBe('TIMEOUT');
      }
    });

    it('should handle HTML parsing errors gracefully', async () => {
      // This test uses mocked fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html>Invalid HTML</html>',
      });

      global.fetch = mockFetch as any;

      const doc = await fetcher.getPackageDoc('test');
      expect(doc).toBeDefined();
      expect(doc.name).toBe('test');
      expect(doc.synopsis).toBe('No description available');

      // Restore fetch
      vi.restoreAllMocks();
    });
  });
});
