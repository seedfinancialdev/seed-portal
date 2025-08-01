import { promisify } from 'util';
import { log } from './vite';

console.log('[Redis] Module loading...');

// Redis configuration for different use cases
export interface RedisConfig {
  sessionRedis: any;
  cacheRedis: any;
  queueRedis: any;
}

// Create Redis connections with appropriate configurations
async function createRedisConnections(): Promise<RedisConfig | null> {
  console.log('[createRedisConnections] Starting...');
  const redisUrl = process.env.REDIS_URL;
  console.log('[createRedisConnections] REDIS_URL:', redisUrl ? 'Found' : 'Missing');
  
  // If no Redis URL provided, return null
  if (!redisUrl) {
    console.log('Redis URL not provided, skipping Redis connections');
    return null;
  }
  
  try {
    console.log('[createRedisConnections] Creating Redis clients...');
    
    // Use dynamic import to avoid ES module issues
    const redis = await import('redis');
    const redisModule = redis.default || redis;
    
    // Parse Redis URL to get connection details
    const url = new URL(redisUrl);
    const baseConfig = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
      retry_strategy: (options: any) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      },
      enable_offline_queue: true,
      db: 0,
    };

    // Session Redis - no prefix, connect-redis will handle prefixing
    const sessionRedis = redisModule.createClient(baseConfig);

    // Cache Redis - using key prefix for isolation
    const cacheRedis = redisModule.createClient({
      ...baseConfig,
      prefix: 'cache:',
    });

    // Queue Redis - no prefix for BullMQ compatibility
    const queueRedis = redisModule.createClient({
      ...baseConfig,
      prefix: 'queue:',
    });

    // Add promisified methods for cache operations
    cacheRedis.getAsync = promisify(cacheRedis.get).bind(cacheRedis);
    cacheRedis.setAsync = promisify(cacheRedis.set).bind(cacheRedis);
    cacheRedis.delAsync = promisify(cacheRedis.del).bind(cacheRedis);
    cacheRedis.existsAsync = promisify(cacheRedis.exists).bind(cacheRedis);

    // Monitor Redis memory usage
    const checkMemoryUsage = async () => {
      try {
        const infoAsync = promisify(sessionRedis.info).bind(sessionRedis);
        const info = await infoAsync('memory');
        const usedMemoryMatch = info.match(/used_memory_human:(.+)/);
        const maxMemoryMatch = info.match(/maxmemory_human:(.+)/);
        
        if (usedMemoryMatch && maxMemoryMatch) {
          const used = parseMemoryString(usedMemoryMatch[1]);
          const max = parseMemoryString(maxMemoryMatch[1]);
          
          if (max > 0) {
            const usagePercent = (used / max) * 100;
            if (usagePercent > 60) {
              console.warn(`⚠️ Redis memory usage at ${usagePercent.toFixed(1)}% - consider increasing memory or evicting keys`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check Redis memory:', error);
      }
    };

    // Check memory usage every 5 minutes
    setInterval(checkMemoryUsage, 5 * 60 * 1000);

    // Set up event handlers
    sessionRedis.on('error', (err) => {
      console.error('Session Redis error:', err);
    });

    cacheRedis.on('error', (err) => {
      console.error('Cache Redis error:', err);
    });

    queueRedis.on('error', (err) => {
      console.error('Queue Redis error:', err);
    });

    sessionRedis.on('connect', () => {
      log('Session Redis connected');
    });

    cacheRedis.on('connect', () => {
      log('Cache Redis connected');
    });

    queueRedis.on('connect', () => {
      log('Queue Redis connected');
    });

    console.log('[createRedisConnections] All Redis clients created');
    return { sessionRedis, cacheRedis, queueRedis };
  } catch (error: any) {
    console.error('[createRedisConnections] Failed to create Redis connections:', error);
    console.error('[createRedisConnections] Error details:', error.message, error.stack);
    return null;
  }
}

// Helper function to parse memory strings
function parseMemoryString(str: string): number {
  const trimmed = str.trim();
  const match = trimmed.match(/^([\d.]+)([KMGT]?)$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'K':
      return value * 1024;
    case 'M':
      return value * 1024 * 1024;
    case 'G':
      return value * 1024 * 1024 * 1024;
    case 'T':
      return value * 1024 * 1024 * 1024 * 1024;
    default:
      return value;
  }
}

// Initialize Redis connections
let redisConnections: RedisConfig | null = null;
let initPromise: Promise<void> | null = null;

// Initialize Redis on first access
async function initializeRedis() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    console.log('[Redis] About to create connections...');
    redisConnections = await createRedisConnections();
    console.log('[Redis] Connections created:', redisConnections ? 'Success' : 'Failed');
  })();
  
  return initPromise;
}

// Initialize immediately
initializeRedis().catch(err => {
  console.error('[Redis] Failed to initialize:', err);
});

// Export getter for Redis connections
export function getRedis(): RedisConfig | null {
  return redisConnections;
}

// Also export as 'redis' for compatibility
export const redis = redisConnections;

// Graceful shutdown
process.on('SIGINT', () => {
  if (redis) {
    console.log('Closing Redis connections...');
    redis.sessionRedis.quit();
    redis.cacheRedis.quit();
    redis.queueRedis.quit();
  }
});