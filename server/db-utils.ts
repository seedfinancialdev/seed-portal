// Database utility functions for error handling and retries
import { db, checkDatabaseHealth } from "./db";

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds
};

// Check if error is retryable
function isRetryableError(error: any): boolean {
  const retryableErrors = [
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'connection',
    'timeout',
    'network',
    'WebSocket',
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  return retryableErrors.some(pattern => 
    errorMessage.includes(pattern.toLowerCase()) || 
    errorCode === pattern
  );
}

// Calculate retry delay with exponential backoff
function calculateDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generic database operation wrapper with retry logic
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Check database health before retrying (except on first attempt)
      if (attempt > 0) {
        console.log(`Checking database health before retry ${attempt} for ${operationName}`);
        const isHealthy = await checkDatabaseHealth();
        if (!isHealthy) {
          console.warn(`Database health check failed on retry ${attempt}`);
          // Continue anyway - the operation might still work
        }
      }
      
      const result = await operation();
      
      // Log successful retry
      if (attempt > 0) {
        console.log(`${operationName} succeeded on retry ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Log the error
      console.error(`${operationName} failed on attempt ${attempt + 1}:`, error);
      
      // Don't retry if this is the last attempt or if error is not retryable
      if (attempt >= RETRY_CONFIG.maxRetries || !isRetryableError(error)) {
        break;
      }
      
      // Wait before retrying
      const delay = calculateDelay(attempt);
      console.log(`Retrying ${operationName} in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  // All retries failed
  console.error(`${operationName} failed after ${RETRY_CONFIG.maxRetries + 1} attempts`);
  throw lastError;
}

// Database query wrapper for common operations
export async function safeDbQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string = 'query'
): Promise<T> {
  return withDatabaseRetry(queryFn, queryName);
}

// Health check with retry
export async function ensureDatabaseConnection(): Promise<boolean> {
  try {
    await withDatabaseRetry(
      () => checkDatabaseHealth().then(healthy => {
        if (!healthy) {
          throw new Error('Database health check failed');
        }
        return healthy;
      }),
      'database health check'
    );
    return true;
  } catch (error) {
    console.error('Failed to establish database connection after retries:', error);
    return false;
  }
}