import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentationCache } from '../../src/cache/index.js';

describe('DocumentationCache Unit Tests', () => {
  let cache: DocumentationCache;

  beforeEach(() => {
    cache = new DocumentationCache({
      stdTTL: 60,
      checkperiod: 10,
      maxKeys: 5
    });
  });

  describe('Basic operations', () => {
    it('should store and retrieve values', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      const result = cache.set(key, value);
      expect(result).toBe(true);
      
      const retrieved = cache.get(key);
      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('exists', 'value');
      
      expect(cache.has('exists')).toBe(true);
      expect(cache.has('not-exists')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('to-delete', 'value');
      expect(cache.has('to-delete')).toBe(true);
      
      const deleted = cache.delete('to-delete');
      expect(deleted).toBe(true);
      expect(cache.has('to-delete')).toBe(false);
      
      // Deleting non-existent key
      const deletedAgain = cache.delete('to-delete');
      expect(deletedAgain).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      expect(cache.getStats().keys).toBe(2);
      
      cache.clear();
      
      expect(cache.getStats().keys).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL handling', () => {
    it('should respect custom TTL', () => {
      const key = 'custom-ttl';
      const value = 'test';
      const customTTL = 120; // 2 minutes
      
      cache.set(key, value, customTTL);
      expect(cache.get(key)).toBe(value);
    });

    it('should use default TTL when not specified', () => {
      const key = 'default-ttl';
      const value = 'test';
      
      cache.set(key, value);
      expect(cache.get(key)).toBe(value);
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics', () => {
      const initialStats = cache.getStats();
      expect(initialStats.keys).toBe(0);
      expect(initialStats.hits).toBe(0);
      expect(initialStats.misses).toBe(0);
      
      // Add some entries
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // Generate hits and misses
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key3'); // miss
      cache.get('key4'); // miss
      
      const stats = cache.getStats();
      expect(stats.keys).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully in get operation', () => {
      // Mock the internal cache to throw an error
      const mockCache = cache as any;
      const originalGet = mockCache.cache.get;
      mockCache.cache.get = vi.fn().mockImplementation(() => {
        throw new Error('Internal error');
      });
      
      const result = cache.get('any-key');
      expect(result).toBeUndefined();
      
      // Restore
      mockCache.cache.get = originalGet;
    });

    it('should handle errors gracefully in set operation', () => {
      const mockCache = cache as any;
      const originalSet = mockCache.cache.set;
      mockCache.cache.set = vi.fn().mockImplementation(() => {
        throw new Error('Internal error');
      });
      
      const result = cache.set('any-key', 'any-value');
      expect(result).toBe(false);
      
      // Restore
      mockCache.cache.set = originalSet;
    });
  });

  describe('Cache entry structure', () => {
    it('should store entries with metadata', () => {
      const key = 'metadata-test';
      const value = { test: 'data' };
      const ttl = 300;
      
      const beforeTimestamp = Date.now();
      cache.set(key, value, ttl);
      const afterTimestamp = Date.now();
      
      // Access internal cache to verify structure
      const mockCache = cache as any;
      const entry = mockCache.cache.get(key);
      
      expect(entry).toBeDefined();
      expect(entry.data).toEqual(value);
      expect(entry.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(entry.timestamp).toBeLessThanOrEqual(afterTimestamp);
      expect(entry.ttl).toBe(ttl);
    });
  });
});