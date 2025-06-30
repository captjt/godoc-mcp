import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoDocFetcher } from '../../src/fetcher/index.js';
import { mockFetchResponse, samplePackageHTML } from '../utils/testHelpers.js';

describe('GoDocFetcher Integration Tests', () => {
  let fetcher: GoDocFetcher;

  beforeEach(() => {
    fetcher = new GoDocFetcher({ timeout: 5000 });
    vi.clearAllMocks();
  });

  describe('Real pkg.go.dev Integration', () => {
    it('should fetch real package documentation for fmt', async () => {
      const doc = await fetcher.getPackageDoc('fmt');
      
      expect(doc).toBeDefined();
      expect(doc.name).toBe('fmt');
      expect(doc.importPath).toBe('fmt');
      expect(doc.synopsis).toContain('formatted I/O');
      expect(doc.imports).toBeInstanceOf(Array);
    });

    it('should fetch real function documentation', async () => {
      const doc = await fetcher.getFunctionDoc('fmt', 'Printf');
      
      expect(doc).toBeDefined();
      expect(doc.name).toBe('Printf');
      expect(doc.signature).toContain('func Printf');
      expect(doc.signature).toContain('format string');
      expect(doc.documentation).toBeTruthy();
      expect(doc.packagePath).toBe('fmt');
    });

    it('should fetch real type documentation', async () => {
      const doc = await fetcher.getTypeDoc('fmt', 'Stringer');
      
      expect(doc).toBeDefined();
      expect(doc.name).toBe('Stringer');
      expect(doc.definition).toContain('type Stringer interface');
      expect(doc.definition).toContain('String() string');
      expect(doc.documentation).toBeTruthy();
      expect(doc.packagePath).toBe('fmt');
    });

    it('should handle package not found error', async () => {
      await expect(fetcher.getPackageDoc('this-package-definitely-does-not-exist-12345'))
        .rejects.toThrow('Package not found');
    });

    it('should handle function not found error', async () => {
      await expect(fetcher.getFunctionDoc('fmt', 'ThisFunctionDoesNotExist'))
        .rejects.toThrow('Function ThisFunctionDoesNotExist not found');
    });

    it('should search for packages', async () => {
      const results = await fetcher.searchPackages('json', 5);
      
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);
      
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('path');
      expect(firstResult).toHaveProperty('name');
      expect(firstResult).toHaveProperty('synopsis');
    });

    it('should fetch package examples', async () => {
      const examples = await fetcher.getPackageExamples('fmt');
      
      expect(examples).toBeInstanceOf(Array);
      if (examples.length > 0) {
        const example = examples[0];
        expect(example).toHaveProperty('name');
        expect(example).toHaveProperty('code');
        expect(example.code).toBeTruthy();
      }
    });
  });

  describe('Version-specific fetching', () => {
    it('should fetch versioned package documentation', async () => {
      // Using a known versioned package
      const doc = await fetcher.getPackageDoc('github.com/stretchr/testify', 'v1.8.0');
      
      expect(doc).toBeDefined();
      expect(doc.name).toBe('testify');
      expect(doc.importPath).toBe('github.com/stretchr/testify');
      // Version might be extracted from the page
      if (doc.version) {
        expect(doc.version).toContain('v1.8');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle network timeouts', async () => {
      // Create fetcher with very short timeout
      const timeoutFetcher = new GoDocFetcher({ timeout: 1 });
      
      await expect(timeoutFetcher.getPackageDoc('golang.org/x/tools'))
        .rejects.toThrow('timeout');
    });
  });

  describe('Mocked responses', () => {
    beforeEach(() => {
      // Mock fetch for controlled testing
      global.fetch = vi.fn();
    });

    it('should parse HTML correctly', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        mockFetchResponse(samplePackageHTML)
      );

      const doc = await fetcher.getPackageDoc('fmt');
      
      expect(doc.name).toBe('fmt');
      expect(doc.synopsis).toContain('formatted I/O');
    });

    it('should handle malformed HTML gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        mockFetchResponse('<html><body>Invalid content</body></html>')
      );

      const doc = await fetcher.getPackageDoc('test');
      
      expect(doc.name).toBe('test');
      expect(doc.synopsis).toBe('No description available');
    });
  });
});