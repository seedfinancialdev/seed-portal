import Redis from 'ioredis';
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
    
    // Create ioredis instances with better compatibility
    const baseOptions = {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 10) {
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      },
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    };

    // BullMQ-specific options (no maxRetriesPerRequest)
    const queueOptions = {
      enableReadyCheck: true,
      maxRetriesPerRequest: null, // Required for BullMQ
      retryStrategy: baseOptions.retryStrategy,
      reconnectOnError: baseOptions.reconnectOnError,
    };

    // Session Redis - no key prefix
    const sessionRedis = new Redis(redisUrl, {
      ...baseOptions,
      keyPrefix: '',
    });

    // Cache Redis - using key prefix for isolation
    const cacheRedis = new Redis(redisUrl, {
      ...baseOptions,
      keyPrefix: 'cache:',
    });

    // Queue Redis - NO keyPrefix for BullMQ compatibility  
    const queueRedis = new Redis(redisUrl, {
      ...queueOptions,
      keyPrefix: '', // BullMQ doesn't support keyPrefix in ioredis instances
    });
    
    console.log('[createRedisConnections] Waiting for Redis connections to be ready...');
    
    // Wait for all connections to be ready
    await Promise.all([
      new Promise((resolve, reject) => {
        sessionRedis.once('ready', resolve);
        sessionRedis.once('error', reject);
      }),
      new Promise((resolve, reject) => {
        cacheRedis.once('ready', resolve);
        cacheRedis.once('error', reject);
      }),
      new Promise((resolve, reject) => {
        queueRedis.once('ready', resolve);
        queueRedis.once('error', reject);
      })
    ]);
    
    console.log('[createRedisConnections] All Redis connections ready');

    // ioredis already has promise-based methods
    cacheRedis.getAsync = cacheRedis.get.bind(cacheRedis);
    cacheRedis.setAsync = cacheRedis.set.bind(cacheRedis);
    cacheRedis.delAsync = cacheRedis.del.bind(cacheRedis);
    cacheRedis.existsAsync = cacheRedis.exists.bind(cacheRedis);

    // Monitor Redis memory usage
    const checkMemoryUsage = async () => {
      try {
        // ioredis info method returns a promise directly
        const info = await sessionRedis.info('memory');
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

// Don't initialize immediately - wait for explicit call

// Export getter for Redis connections
export function getRedis(): RedisConfig | null {
  return redisConnections;
}

// Export async getter that waits for initialization
export async function getRedisAsync(): Promise<RedisConfig | null> {
  await initializeRedis();
  return redisConnections;
}

// Export function to manually initialize Redis
export async function initRedis(): Promise<RedisConfig | null> {
  await initializeRedis();
  return redisConnections;
}

// Also export as 'redis' for compatibility (will be null until initialized)
export const redis = redisConnections;

// Graceful shutdown
process.on('SIGINT', () => {
  if (redisConnections) {
    console.log('Closing Redis connections...');
    redisConnections.sessionRedis.quit();
    redisConnections.cacheRedis.quit();
    redisConnections.queueRedis.quit();
  }
});