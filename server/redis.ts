import Redis from 'ioredis';
import { log } from './vite';

// Redis configuration for different use cases
export interface RedisConfig {
  sessionRedis: Redis;
  cacheRedis: Redis;
  queueRedis: Redis;
}

// Create Redis connections with appropriate configurations
function createRedisConnections(): RedisConfig | null {
  const redisUrl = process.env.REDIS_URL;
  
  // If no Redis URL provided, return null
  if (!redisUrl) {
    console.log('Redis URL not provided, skipping Redis connections');
    return null;
  }
  
  // Parse Redis URL to get connection details
  const url = new URL(redisUrl);
  const baseConfig = {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || undefined,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  };

  // Session Redis - no prefix, connect-redis will handle prefixing
  const sessionRedis = new Redis({
    ...baseConfig,
    db: 0, // Use default database
    commandTimeout: 5000,
    showFriendlyErrorStack: true,
  });
  
  // Debug Redis commands to find syntax error
  sessionRedis.monitor((err, monitor) => {
    if (err) {
      console.error('Could not enable Redis monitor:', err);
      return;
    }
    monitor.on('monitor', (time, args, source) => {
      if (args[0] === 'EXPIRE' || args[0] === 'SET' || args[0] === 'GET') {
        console.log(`[REDIS CMD] ${args.join(' ')}`);
      }
    });
  });

  // Cache Redis - using key prefix for isolation
  const cacheRedis = new Redis({
    ...baseConfig,
    db: 0, // Use default database
    keyPrefix: 'cache:',
    commandTimeout: 3000,
  });

  // Queue Redis - no prefix for BullMQ compatibility
  const queueRedis = new Redis({
    ...baseConfig,
    db: 0, // Use default database
    keyPrefix: 'queue:', // Add prefix to avoid collisions
    commandTimeout: 10000,
  });

  // Monitor Redis memory usage
  const checkMemoryUsage = async () => {
    try {
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

  return { sessionRedis, cacheRedis, queueRedis };
}

// Helper function to parse memory strings like "1.5M" or "500K"
function parseMemoryString(memStr: string): number {
  const match = memStr.match(/^([\d.]+)([KMG]?)$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'K': return value * 1024;
    case 'M': return value * 1024 * 1024;
    case 'G': return value * 1024 * 1024 * 1024;
    default: return value;
  }
}

// Create a stub Redis config for when Redis is not available
const stubRedisConfig: RedisConfig = {
  sessionRedis: null as any,
  cacheRedis: null as any,
  queueRedis: null as any,
};

// Create and export Redis connections
export const redis = createRedisConnections() || stubRedisConfig;

// Configure Redis settings for each use case
export async function configureRedis() {
  if (!redis.sessionRedis) {
    log('Redis not configured - skipping Redis configuration');
    return;
  }
  
  try {
    // Configure cache Redis with volatile-lru eviction
    await redis.cacheRedis.config('SET', 'maxmemory-policy', 'volatile-lru');
    
    // Configure queue Redis with AOF persistence
    await redis.queueRedis.config('SET', 'appendonly', 'yes');
    await redis.queueRedis.config('SET', 'appendfsync', 'everysec');
    
    log('Redis configuration applied successfully');
  } catch (error) {
    console.error('Failed to configure Redis:', error);
    // Continue anyway - Redis might not allow CONFIG commands
  }
}

// Graceful shutdown
export async function closeRedisConnections() {
  if (!redis.sessionRedis) {
    return;
  }
  
  await Promise.all([
    redis.sessionRedis.quit(),
    redis.cacheRedis.quit(),
    redis.queueRedis.quit(),
  ]);
  log('Redis connections closed');
}