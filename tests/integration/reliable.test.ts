import { describe, it, expect, beforeEach } from 'vitest';
import { GoDocFetcher } from '../../src/fetcher/index.js';
import { ModuleIndexFetcher } from '../../src/fetcher/module-index.js';
import { DocumentationCache } from '../../src/cache/index.js';
import { withRateLimit } from '../utils/rateLimitHelper.js';

describe('Reliable Integration Tests', () => {
  let fetcher: GoDocFetcher;
  let moduleIndex: ModuleIndexFetcher;
  let cache: DocumentationCache;

  beforeEach(() => {
    fetcher = new GoDocFetcher({ timeout: 10000 });
    moduleIndex = new ModuleIndexFetcher(10000);
    cache = new DocumentationCache({ stdTTL: 300 });
  });

  describe('Package Documentation', () => {
    it('should fetch standard library packages', async () => {
      const packages = ['errors', 'path', 'strings'];
      
      for (const pkg of packages) {
        const doc = await withRateLimit(() => fetcher.getPackageDoc(pkg));
        expect(doc).toBeDefined();
        expect(doc.name).toBe(pkg);
        expect(doc.importPath).toBe(pkg);
        expect(doc.synopsis).toBeTruthy();
      }
    });

    it('should handle 404 errors correctly', async () => {
      await expect(
        withRateLimit(() => fetcher.getPackageDoc('this-does-not-exist-99999'))
      ).rejects.toThrow();
    });
  });

  describe('Module Index', () => {
    it('should fetch module index successfully', async () => {
      const index = await moduleIndex.getIndex();
      expect(index).toBeInstanceOf(Array);
      expect(index.length).toBeGreaterThan(100); // Should have many modules
    });

    it('should find versions for well-known packages', async () => {
      const pkg = 'golang.org/x/text';
      const versions = await moduleIndex.getPackageVersions(pkg);
      
      if (versions) {
        expect(versions.path).toBe(pkg);
        expect(versions.versions).toBeInstanceOf(Array);
        expect(versions.latest).toBeTruthy();
      }
    });
  });

  describe('Caching', () => {
    it('should cache and retrieve values', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cache.set(key, value);
      const retrieved = cache.get(key);
      
      expect(retrieved).toEqual(value);
    });

    it('should show performance improvement', async () => {
      const pkg = 'errors';
      
      // Network fetch
      const start1 = Date.now();
      const doc = await withRateLimit(() => fetcher.getPackageDoc(pkg));
      const networkTime = Date.now() - start1;
      
      // Cache it
      cache.set(`package:${pkg}`, doc);
      
      // Cache fetch
      const start2 = Date.now();
      const cached = cache.get(`package:${pkg}`);
      const cacheTime = Date.now() - start2;
      
      expect(cached).toEqual(doc);
      expect(cacheTime).toBeLessThan(10); // Cache should be very fast
      console.log(`Network: ${networkTime}ms, Cache: ${cacheTime}ms`);
    });
  });
});