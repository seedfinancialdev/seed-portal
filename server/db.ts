import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for proper WebSocket usage
neonConfig.webSocketConstructor = ws;

// Enable more detailed logging for debugging
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration with better error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Slightly increase pool size for stability
  min: 1, // Keep minimum connections alive
  idleTimeoutMillis: 30000, // Increase idle timeout
  connectionTimeoutMillis: 10000, // Increase connection timeout
  maxUses: 100, // Limit connection reuse to prevent stale connections
  allowExitOnIdle: false, // Keep connections alive
});

// Add error handling for pool events
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

// Create database instance with enhanced error handling
export const db = drizzle({ client: pool, schema });

// Database health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
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
    await pool.end();
    console.log('Database connections closed gracefully');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}