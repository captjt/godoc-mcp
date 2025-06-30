import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentationCache } from '../../src/cache/index.js';
import { GoDocFetcher } from '../../src/fetcher/index.js';
import { delay } from '../utils/testHelpers.js';

describe('Cache Integration Tests', () => {
  let cache: DocumentationCache;
  let fetcher: GoDocFetcher;

  beforeEach(() => {
    cache = new DocumentationCache({
      stdTTL: 2, // 2 seconds for testing
      checkperiod: 1,
      maxKeys: 10
    });
    fetcher = new GoDocFetcher({ timeout: 10000 });
  });

  describe('Basic caching behavior', () => {
    it('should cache and retrieve package documentation', async () => {
      const packagePath = 'fmt';
      const cacheKey = `package:${packagePath}`;

      // First fetch - should hit network
      const doc1 = await fetcher.getPackageDoc(packagePath);
      cache.set(cacheKey, doc1);

      // Second fetch - should hit cache
      const doc2 = cache.get(cacheKey);

      expect(doc2).toBeDefined();
      expect(doc2).toEqual(doc1);
    });

    it('should respect TTL and expire entries', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      cache.set(key, value, 1); // 1 second TTL
      
      // Should exist immediately
      expect(cache.get(key)).toEqual(value);
      
      // Wait for expiration
      await delay(1500);
      
      // Should be expired
      expect(cache.get(key)).toBeUndefined();
    });

    it('should handle cache stats correctly', async () => {
      const stats1 = cache.getStats();
      expect(stats1.keys).toBe(0);
      expect(stats1.hits).toBe(0);
      expect(stats1.misses).toBe(0);

      // Add some entries
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // Some hits and misses
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key3'); // miss

      const stats2 = cache.getStats();
      expect(stats2.keys).toBe(2);
      expect(stats2.hits).toBe(2);
      expect(stats2.misses).toBe(1);
    });
  });

  describe('Real-world caching scenarios', () => {
    it('should cache multiple package lookups efficiently', async () => {
      const packages = ['fmt', 'strings', 'io'];
      const fetchTimes: number[] = [];
      const cacheTimes: number[] = [];

      // First pass - fetch from network
      for (const pkg of packages) {
        const start = Date.now();
        const doc = await fetcher.getPackageDoc(pkg);
        fetchTimes.push(Date.now() - start);
        cache.set(`package:${pkg}`, doc);
      }

      // Second pass - fetch from cache
      for (const pkg of packages) {
        const start = Date.now();
        const doc = cache.get(`package:${pkg}`);
        cacheTimes.push(Date.now() - start);
        expect(doc).toBeDefined();
      }

      // Cache should be significantly faster
      const avgFetchTime = fetchTimes.reduce((a, b) => a + b, 0) / fetchTimes.length;
      const avgCacheTime = cacheTimes.reduce((a, b) => a + b, 0) / cacheTimes.length;
      
      expect(avgCacheTime).toBeLessThan(avgFetchTime / 10); // At least 10x faster
    });

    it('should handle versioned package caching', async () => {
      const packagePath = 'github.com/stretchr/testify';
      const version1 = 'v1.8.0';
      const version2 = 'v1.8.4';

      // Fetch two different versions
      const doc1 = await fetcher.getPackageDoc(packagePath, version1);
      const doc2 = await fetcher.getPackageDoc(packagePath, version2);

      // Cache them with version-specific keys
      cache.set(`package:${packagePath}@${version1}`, doc1);
      cache.set(`package:${packagePath}@${version2}`, doc2);

      // Retrieve and verify they're different
      const cached1 = cache.get(`package:${packagePath}@${version1}`);
      const cached2 = cache.get(`package:${packagePath}@${version2}`);

      expect(cached1).toBeDefined();
      expect(cached2).toBeDefined();
      expect(cached1).toEqual(doc1);
      expect(cached2).toEqual(doc2);
    });

    it('should handle cache eviction when max keys reached', async () => {
      // Create cache with small limit
      const smallCache = new DocumentationCache({
        stdTTL: 60,
        maxKeys: 3
      });

      // Add more than max keys
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      smallCache.set('key4', 'value4'); // Should evict oldest

      // Check that we have exactly maxKeys
      const stats = smallCache.getStats();
      expect(stats.keys).toBeLessThanOrEqual(3);
    });
  });

  describe('Cache invalidation scenarios', () => {
    it('should allow manual cache clearing', () => {
      // Add some entries
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      expect(cache.getStats().keys).toBe(2);
      
      // Clear cache
      cache.clear();
      
      expect(cache.getStats().keys).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should allow selective cache deletion', () => {
      cache.set('keep-this', 'value1');
      cache.set('delete-this', 'value2');
      
      expect(cache.has('keep-this')).toBe(true);
      expect(cache.has('delete-this')).toBe(true);
      
      cache.delete('delete-this');
      
      expect(cache.has('keep-this')).toBe(true);
      expect(cache.has('delete-this')).toBe(false);
    });
  });

  describe('Concurrent access patterns', () => {
    it('should handle concurrent reads safely', async () => {
      const key = 'concurrent-key';
      const value = { data: 'test' };
      cache.set(key, value);

      // Simulate concurrent reads
      const promises = Array(10).fill(null).map(() => 
        Promise.resolve(cache.get(key))
      );

      const results = await Promise.all(promises);
      
      // All should return the same value
      results.forEach(result => {
        expect(result).toEqual(value);
      });
    });

    it('should handle mixed read/write operations', async () => {
      const operations = Array(20).fill(null).map((_, i) => {
        if (i % 2 === 0) {
          // Write operation
          return Promise.resolve(cache.set(`key${i}`, `value${i}`));
        } else {
          // Read operation
          return Promise.resolve(cache.get(`key${i-1}`));
        }
      });

      const results = await Promise.all(operations);
      
      // Verify some reads found their values
      const readResults = results.filter((_, i) => i % 2 === 1);
      const foundValues = readResults.filter(r => r !== undefined);
      expect(foundValues.length).toBeGreaterThan(0);
    });
  });
});