import { getRedis } from './redis';
import { createHash } from 'crypto';
import { logger } from './logger';
import { promisify } from 'util';

const cacheLogger = logger.child({ module: 'cache' });

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
  skipCache?: boolean; // Skip cache for this request
}

export class CacheService {
  private getCacheRedis() {
    const redis = getRedis();
    return redis?.cacheRedis;
  }
  private defaultTTL = 300; // 5 minutes default

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
        cacheLogger.debug({ key }, 'Cache hit');
        return JSON.parse(cached);
      }
      cacheLogger.debug({ key }, 'Cache miss');
      return null;
    } catch (error) {
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
  async del(pattern: string): Promise<void> {
    const cacheRedis = this.getCacheRedis();
    if (!cacheRedis) {
      return;
    }

    try {
      // Find all keys matching the pattern
      const keysAsync = promisify(cacheRedis.keys).bind(cacheRedis);
      const keys = await keysAsync(`cache:${pattern}*`);
      if (keys.length > 0) {
        // Delete the keys directly (with their full key names including prefix)
        await cacheRedis.delAsync(...keys);
        cacheLogger.debug({ pattern, count: keys.length }, 'Cache invalidated');
      }
    } catch (error) {
      cacheLogger.error({ error, pattern }, 'Cache delete error');
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