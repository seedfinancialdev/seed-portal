// BullMQ Queue and Worker setup
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis connection for queues
let queueRedis: Redis | null = null;
let aiInsightsQueue: Queue | null = null;
let aiInsightsQueueEvents: QueueEvents | null = null;

export async function initializeQueue(): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log('[Queue] No REDIS_URL found, skipping queue initialization');
    return;
  }

  try {
    queueRedis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      retryDelayOnFailover: 100,
    });
    
    await queueRedis.ping();
    console.log('[Queue] ✅ Redis connection established for queues');
    
    // Only create queues after Redis connection is established
    aiInsightsQueue = new Queue('ai-insights', {
      connection: queueRedis,
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
    aiInsightsQueueEvents = new QueueEvents('ai-insights', {
      connection: queueRedis,
    });
    
    console.log('[Queue] ✅ BullMQ queues initialized');
  } catch (error) {
    console.error('[Queue] ❌ Failed to connect to Redis:', error);
    queueRedis = null;
    aiInsightsQueue = null;
    aiInsightsQueueEvents = null;
  }
}

// Export function to get queue (only when ready)
export function getAIInsightsQueue(): Queue | null {
  return aiInsightsQueue;
}

export function getAIInsightsQueueEvents(): QueueEvents | null {
  return aiInsightsQueueEvents;
}

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

// Don't initialize automatically on import - wait for explicit call