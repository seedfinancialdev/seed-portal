import { getRedis } from './redis';
import { createHash } from 'crypto';
import { logger } from './logger';

const cacheLogger = logger.child({ module: 'cache' });

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
  skipCache?: boolean; // Skip cache for this request
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
  totalOperations: number;
  lastReset: string;
}

export class CacheService {
  private getCacheRedis() {
    const redis = getRedis();
    return redis?.cacheRedis;
  }
  private defaultTTL = 300; // 5 minutes default
  
  // Helper: fetch configured keyPrefix from ioredis client
  private getKeyPrefix(): string {
    const cacheRedis = this.getCacheRedis();
    return (cacheRedis?.options?.keyPrefix as string) || '';
  }

  // Helper: ensure the Redis SCAN/KEYS pattern includes the physical key prefix
  private normalizePattern(pattern: string): string {
    const prefix = this.getKeyPrefix();
    if (!prefix) return pattern;
    return pattern.startsWith(prefix) ? pattern : `${prefix}${pattern}`;
  }

  // Helper: strip the physical key prefix from returned keys to logical keys
  private stripPrefixFromKeys(keys: string[]): string[] {
    const prefix = this.getKeyPrefix();
    if (!prefix) return keys;
    return keys.map(k => (k.startsWith(prefix) ? k.slice(prefix.length) : k));
  }
  
  // Cache metrics tracking
  private stats = {
    hits: 0,
    misses: 0,
    totalOperations: 0,
    lastReset: new Date().toISOString()
  };

  /**
   * Generate a cache key from function name and arguments
   */
  generateKey(prefix: string, identifier: string | object): string {
    const hash = createHash('md5')
      .update(typeof identifier === 'string' ? identifier : JSON.stringify(identifier))
      .digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheRedis = this.getCacheRedis();
    if (!cacheRedis) {
      return null;
    }

    try {
      const cached = await cacheRedis.getAsync(key);
      if (cached) {
        this.stats.hits++;
        this.stats.totalOperations++;
        cacheLogger.debug({ key }, 'Cache hit');
        return JSON.parse(cached);
      }
      this.stats.misses++;
      this.stats.totalOperations++;
      cacheLogger.debug({ key }, 'Cache miss');
      return null;
    } catch (error) {
      this.stats.misses++;
      this.stats.totalOperations++;
      cacheLogger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheRedis = this.getCacheRedis();
    if (!cacheRedis) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const expiryTime = ttl || this.defaultTTL;
      
      await cacheRedis.setAsync(key, serialized, 'EX', expiryTime);
      cacheLogger.debug({ key, ttl: expiryTime }, 'Cache set');
    } catch (error) {
      cacheLogger.error({ error, key }, 'Cache set error');
    }
  }

  /**
   * Delete value from cache
   */
  async del(patternOrKey: string, ...rest: string[]): Promise<void> {
    const cacheRedis = this.getCacheRedis();
    if (!cacheRedis) {
      return;
    }

    try {
      // If multiple args provided, treat them as exact logical keys
      if (rest.length > 0) {
        const keys = [patternOrKey, ...rest];
        const normalized = this.stripPrefixFromKeys(keys);
        if (normalized.length > 0) {
          await cacheRedis.delAsync(...normalized);
          cacheLogger.debug({ count: normalized.length }, 'Cache keys deleted');
        }
        return;
      }

      const single = patternOrKey;
      const isPattern = single.includes('*') || single.includes('?');
      if (isPattern) {
        const keys = await this.keys(single);
        if (keys.length > 0) {
          await cacheRedis.delAsync(...keys);
          cacheLogger.debug({ pattern: single, count: keys.length }, 'Cache invalidated by pattern');
        }
        return;
      }

      // Exact single key
      const [key] = this.stripPrefixFromKeys([single]);
      await cacheRedis.delAsync(key);
      cacheLogger.debug({ key }, 'Cache key deleted');
    } catch (error) {
      cacheLogger.error({ error, input: [patternOrKey, ...rest] }, 'Cache delete error');
    }
  }

  /**
   * List cache keys matching a logical pattern (without physical prefix)
   */
  async keys(pattern: string): Promise<string[]> {
    const cacheRedis = this.getCacheRedis();
    if (!cacheRedis) {
      return [];
    }

    try {
      const match = this.normalizePattern(pattern);
      let cursor = '0';
      const results: string[] = [];
      do {
        const [nextCursor, batch] = await cacheRedis.scan(cursor, 'MATCH', match, 'COUNT', 1000);
        results.push(...this.stripPrefixFromKeys(batch));
        cursor = nextCursor;
      } while (cursor !== '0');
      return results;
    } catch (error) {
      cacheLogger.error({ error, pattern }, 'Cache keys scan error');
      return [];
    }
  }

  /**
   * Wrap a function with caching
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cacheRedis = this.getCacheRedis();
    // Skip cache if requested or Redis not available
    if (options.skipCache || !cacheRedis) {
      return await fn();
    }

    // Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, options.ttl);
    
    return result;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const cacheRedis = this.getCacheRedis();
    let totalKeys = 0;
    let memoryUsage = '0MB';

    if (cacheRedis) {
      try {
        // Get Redis INFO for memory usage
        const info = await cacheRedis.info('memory');
        const memoryMatch = info.match(/used_memory_human:(.*)/);
        if (memoryMatch) {
          memoryUsage = memoryMatch[1].trim();
        }

        // Count cache keys via SCAN to avoid blocking
        const keys = await this.keys('*');
        totalKeys = keys.length;
      } catch (error) {
        cacheLogger.error({ error }, 'Failed to get cache stats');
      }
    }

    const hitRate = this.stats.totalOperations > 0 
      ? (this.stats.hits / this.stats.totalOperations) * 100 
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalKeys,
      memoryUsage,
      totalOperations: this.stats.totalOperations,
      lastReset: this.stats.lastReset
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalOperations: 0,
      lastReset: new Date().toISOString()
    };
    cacheLogger.info('Cache statistics reset');
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    const cacheRedis = this.getCacheRedis();
    if (!cacheRedis) {
      return;
    }

    try {
      const keys = await this.keys('*');
      if (keys.length > 0) {
        await this.del(keys[0], ...keys.slice(1));
        cacheLogger.info({ count: keys.length }, 'Cache cleared');
      }
    } catch (error) {
      cacheLogger.error({ error }, 'Failed to clear cache');
    }
  }
}

// Export singleton instance
export const cache = new CacheService();

// Cache TTL configurations for different services
export const CacheTTL = {
  // HubSpot cache times
  HUBSPOT_DEALS: 300, // 5 minutes
  HUBSPOT_METRICS: 300, // 5 minutes
  HUBSPOT_CONTACT: 900, // 15 minutes
  HUBSPOT_COMPANY: 900, // 15 minutes
  
  // OpenAI cache times
  OPENAI_ANALYSIS: 3600, // 1 hour
  OPENAI_ENRICHMENT: 3600, // 1 hour
  
  // General cache times
  USER_PROFILE: 600, // 10 minutes
  WEATHER_DATA: 1800, // 30 minutes
  GEOCODING: 86400, // 24 hours
};

// Cache key prefixes
export const CachePrefix = {
  HUBSPOT_DEAL: 'hs:deal',
  HUBSPOT_DEALS_LIST: 'hs:deals',
  HUBSPOT_METRICS: 'hs:metrics',
  HUBSPOT_CONTACT: 'hs:contact',
  HUBSPOT_COMPANY: 'hs:company',
  OPENAI_ANALYSIS: 'ai:analysis',
  OPENAI_ENRICHMENT: 'ai:enrich',
  USER_PROFILE: 'user:profile',
  WEATHER: 'weather',
  GEOCODING: 'geo',
};