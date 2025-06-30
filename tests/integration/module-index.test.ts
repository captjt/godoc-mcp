import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModuleIndexFetcher } from '../../src/fetcher/module-index.js';
import { mockFetchResponse, sampleModuleIndex } from '../utils/testHelpers.js';

describe('Module Index Integration Tests', () => {
  let indexFetcher: ModuleIndexFetcher;

  beforeEach(() => {
    indexFetcher = new ModuleIndexFetcher(5000);
    vi.clearAllMocks();
  });

  describe('Real module index integration', () => {
    it('should fetch the real module index', async () => {
      const index = await indexFetcher.getIndex();

      expect(index).toBeInstanceOf(Array);
      expect(index.length).toBeGreaterThan(1000); // Should have many modules

      // Check structure of first few entries
      const sample = index.slice(0, 5);
      sample.forEach((module) => {
        expect(module).toHaveProperty('path');
        expect(module).toHaveProperty('version');
        expect(module).toHaveProperty('timestamp');
        expect(module.path).toBeTruthy();
        expect(module.version).toBeTruthy();
        expect(module.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    it('should find versions for popular packages', async () => {
      const packages = [
        'github.com/gin-gonic/gin',
        'github.com/stretchr/testify',
        'golang.org/x/text',
      ];

      for (const pkg of packages) {
        const versions = await indexFetcher.getPackageVersions(pkg);

        expect(versions).toBeDefined();
        expect(versions?.path).toBe(pkg);
        expect(versions?.versions).toBeInstanceOf(Array);
        expect(versions?.versions.length).toBeGreaterThan(0);
        expect(versions?.latest).toBeTruthy();

        // Latest should be a valid version
        expect(versions?.latest).toMatch(/^v?\d+\.\d+\.\d+/);
      }
    });

    it('should return null for non-existent packages', async () => {
      const versions = await indexFetcher.getPackageVersions('this/package/does/not/exist/12345');
      expect(versions).toBeNull();
    });

    it('should search for packages', async () => {
      const results = await indexFetcher.searchPackages('json');

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(50);

      results.forEach((result) => {
        expect(result).toHaveProperty('path');
        expect(result).toHaveProperty('latest');
        expect(result.path.toLowerCase()).toContain('json');
      });
    });
  });

  describe('Caching behavior', () => {
    it('should cache the module index', async () => {
      const start1 = Date.now();
      const index1 = await indexFetcher.getIndex();
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const index2 = await indexFetcher.getIndex();
      const time2 = Date.now() - start2;

      // Second call should be much faster (cached)
      expect(time2).toBeLessThan(time1 / 10);
      expect(index2).toEqual(index1);
    });
  });

  describe('Mocked module index tests', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should parse module index correctly', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(mockFetchResponse(sampleModuleIndex));

      const index = await indexFetcher.getIndex();

      expect(index).toHaveLength(5);
      expect(index[0]).toEqual({
        path: 'fmt',
        version: 'v1.0.0',
        timestamp: '2023-01-01T00:00:00Z',
      });
    });

    it('should determine latest version correctly', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(mockFetchResponse(sampleModuleIndex));

      const versions = await indexFetcher.getPackageVersions('github.com/gin-gonic/gin');

      expect(versions).toBeDefined();
      expect(versions?.latest).toBe('v1.9.1');
      expect(versions?.versions).toHaveLength(3);
      expect(versions?.versions[0].version).toBe('v1.9.1'); // Most recent first
    });

    it('should prefer stable versions over pre-releases', async () => {
      const indexWithPrerelease = `{"Path":"test/pkg","Version":"v2.0.0-beta.1","Timestamp":"2023-12-01T00:00:00Z"}
{"Path":"test/pkg","Version":"v1.9.0","Timestamp":"2023-11-01T00:00:00Z"}
{"Path":"test/pkg","Version":"v2.0.0-alpha.1","Timestamp":"2023-10-01T00:00:00Z"}`;

      vi.mocked(global.fetch).mockResolvedValueOnce(mockFetchResponse(indexWithPrerelease));

      const versions = await indexFetcher.getPackageVersions('test/pkg');

      expect(versions?.latest).toBe('v1.9.0'); // Should pick stable version
    });

    it('should handle malformed lines gracefully', async () => {
      const malformedIndex = `{"Path":"good/package","Version":"v1.0.0","Timestamp":"2023-01-01T00:00:00Z"}
this is not json
{"Path":"another/package","Version":"v1.0.0","Timestamp":"2023-01-01T00:00:00Z"}`;

      vi.mocked(global.fetch).mockResolvedValueOnce(mockFetchResponse(malformedIndex));

      const index = await indexFetcher.getIndex();

      expect(index).toHaveLength(2); // Should skip the malformed line
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(indexFetcher.getIndex()).rejects.toThrow('Failed to fetch module index');
    });

    it('should handle timeout', async () => {
      const timeoutFetcher = new ModuleIndexFetcher(1); // 1ms timeout

      await expect(timeoutFetcher.getIndex()).rejects.toThrow(); // Just check it throws, don't check specific message
    });

    it('should handle HTTP errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

      await expect(indexFetcher.getIndex()).rejects.toThrow('HTTP 404');
    });
  });
});
