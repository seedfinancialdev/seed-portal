// BullMQ Queue and Worker setup
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis connection for queues (with queue: prefix)
let queueRedis: Redis | null = null;

export async function initializeQueue(): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log('[Queue] No REDIS_URL found, skipping queue initialization');
    return;
  }

  try {
    queueRedis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      retryDelayOnFailover: 100,
      db: 0, // Use same database as sessions/cache
    });
    
    await queueRedis.ping();
    console.log('[Queue] ✅ Redis connection established for queues');
  } catch (error) {
    console.error('[Queue] ❌ Failed to connect to Redis:', error);
    queueRedis = null;
  }
}

// AI Insights Queue
export const aiInsightsQueue = new Queue('ai-insights', {
  connection: queueRedis || undefined,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 25,     // Keep last 25 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Queue Events for monitoring
export const aiInsightsQueueEvents = new QueueEvents('ai-insights', {
  connection: queueRedis || undefined,
});

// Job Types
export interface AIInsightsJobData {
  contactId: string;
  clientData: any;
  userId: number;
  timestamp: number;
}

export interface JobResult {
  painPoints: any[];
  upsellOpportunities: string[];
  riskScore: number;
  lastAnalyzed: string;
  signals: any[];
}

// Queue metrics
let queueMetrics = {
  jobsProcessed: 0,
  jobsFailed: 0,
  averageProcessingTime: 0,
  lastProcessedAt: null as Date | null,
};

export function getQueueMetrics() {
  return { ...queueMetrics };
}

export function updateQueueMetrics(processingTime: number, failed = false) {
  if (failed) {
    queueMetrics.jobsFailed++;
  } else {
    queueMetrics.jobsProcessed++;
    queueMetrics.averageProcessingTime = 
      (queueMetrics.averageProcessingTime * (queueMetrics.jobsProcessed - 1) + processingTime) / 
      queueMetrics.jobsProcessed;
  }
  queueMetrics.lastProcessedAt = new Date();
}

// Initialize queue on import
initializeQueue().catch(console.error);