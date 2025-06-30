import NodeCache from 'node-cache';
import { CacheEntry } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class DocumentationCache {
  private cache: NodeCache;
  private defaultTTL: number;

  constructor(options?: { stdTTL?: number; checkperiod?: number; maxKeys?: number }) {
    this.defaultTTL = options?.stdTTL || 3600; // 1 hour default
    this.cache = new NodeCache({
      stdTTL: this.defaultTTL,
      checkperiod: options?.checkperiod || 600, // Check every 10 minutes
      maxKeys: options?.maxKeys || 1000,
      useClones: false, // For performance
    });

    this.cache.on('expired', (key) => {
      logger.debug(`Cache entry expired: ${key}`);
    });

    this.cache.on('evicted', (key) => {
      logger.debug(`Cache entry evicted: ${key}`);
    });
  }

  get<T>(key: string): T | undefined {
    try {
      const entry = this.cache.get<CacheEntry<T>>(key);
      if (entry) {
        logger.debug(`Cache hit: ${key}`);
        return entry.data;
      }
      logger.debug(`Cache miss: ${key}`);
      return undefined;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      };
      const success = this.cache.set(key, entry, ttl || this.defaultTTL);
      if (success) {
        logger.debug(`Cache set: ${key} (TTL: ${ttl || this.defaultTTL}s)`);
      }
      return success;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const deleted = this.cache.del(key) > 0;
    if (deleted) {
      logger.debug(`Cache delete: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }

  getStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      ksize: this.cache.getStats().ksize,
      vsize: this.cache.getStats().vsize,
    };
  }
}
