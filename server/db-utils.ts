/**
 * Database utility functions for safe database operations with enhanced error handling
 */

import { pool } from './db';

/**
 * Wrapper function for safe database queries with retry logic and error handling
 */
export async function safeDbQuery<T>(
  operation: () => Promise<T>, 
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Log the error with context
      console.error(`Database operation '${operationName}' failed (attempt ${attempt}/${maxRetries}):`, {
        error: error.message,
        code: error.code,
        stack: error.stack?.split('\n')[0] // Just the first line of stack
      });
      
      // Don't retry for certain types of errors
      if (
        error.code === '23505' || // Unique constraint violation
        error.code === '23503' || // Foreign key constraint violation
        error.code === '42P01' || // Undefined table
        error.message?.includes('syntax error') ||
        error.message?.includes('column') ||
        attempt === maxRetries
      ) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  console.error(`Database operation '${operationName}' failed after ${maxRetries} attempts. Final error:`, lastError);
  throw new Error(`Database operation failed: ${lastError.message}`);
}

/**
 * Check if database connection is healthy
 */
export async function isDbHealthy(): Promise<boolean> {
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

/**
 * Safe database transaction wrapper
 */
export async function withTransaction<T>(
  operation: (client: any) => Promise<T>,
  operationName: string = 'transaction'
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction '${operationName}' failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}