import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Using node-postgres (pg) for DB connectivity. Neon WS client is not used.

// Support Doppler/Supabase fallbacks for connection string (prefer DIRECT_URL for migrations)
const CONNECTION_URL = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const DB_DISABLED = !CONNECTION_URL;
if (DB_DISABLED) {
  console.warn('[DB] Missing database URL (DIRECT_URL / SUPABASE_DB_URL / DATABASE_URL). Database will be DISABLED.');
}

// Enhanced pool configuration with better error handling
const useSSL = !DB_DISABLED && (process.env.PG_SSL === '1' || /supabase\.co/.test(CONNECTION_URL!));
export const pool: Pool | null = DB_DISABLED
  ? null
  : new Pool({
      connectionString: CONNECTION_URL!,
      max: 3,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      maxUses: 100,
      allowExitOnIdle: false,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    });

// Add error handling for pool events
if (pool) {
  pool.on('error', (err) => {
    console.error('Database pool error:', err);
    // Don't throw here - let individual queries handle errors
  });

  pool.on('connect', () => {
    console.log('Database connection established');
  });

  pool.on('remove', () => {
    console.log('Database connection removed from pool');
  });
}

// Create database instance with enhanced error handling, or a disabled proxy
function createDisabledDbProxy(): any {
  const thrower = (..._args: any[]) => {
    throw new Error('Database disabled: missing connection URL');
  };
  // Return a proxy object that throws for any property access (methods become throwing functions)
  return new Proxy({}, {
    get: () => thrower,
  });
}

export const db: any = DB_DISABLED ? createDisabledDbProxy() : drizzle(pool!, { schema });

// Database health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!pool) return false;
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown handler
export async function closeDatabaseConnections(): Promise<void> {
  try {
    if (pool) {
      await pool.end();
      console.log('Database connections closed gracefully');
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}