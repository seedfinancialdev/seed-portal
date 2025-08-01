// AI Insights Worker for processing expensive AI operations
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { AIInsightsJobData, JobResult, updateQueueMetrics } from '../queue.js';

let workerRedis: Redis | null = null;

async function initializeWorkerRedis(): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log('[Worker] No REDIS_URL found, worker will not start');
    return;
  }

  try {
    workerRedis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      retryDelayOnFailover: 100,
    });
    
    await workerRedis.ping();
    console.log('[Worker] ✅ Redis connection established for worker');
  } catch (error) {
    console.error('[Worker] ❌ Failed to connect to Redis:', error);
    workerRedis = null;
  }
}

// Process AI Insights Job
async function processAIInsights(job: Job<AIInsightsJobData>): Promise<JobResult> {
  const startTime = Date.now();
  console.log(`[Worker] 🔄 Processing AI insights job ${job.id} for contact ${job.data.contactId}`);
  
  try {
    const { clientData } = job.data;
    
    // Import services dynamically to avoid circular dependencies
    const { clientIntelEngine } = await import('../services/client-intel.js');
    
    // Update job progress
    await job.updateProgress(25);
    
    // Generate AI insights using the intelligence engine (expensive operations)
    const painPointsPromise = clientIntelEngine.extractPainPoints(clientData);
    await job.updateProgress(50);
    
    const serviceGapsPromise = clientIntelEngine.detectServiceGaps(clientData);
    await job.updateProgress(75);
    
    const riskScorePromise = clientIntelEngine.calculateRiskScore(clientData);
    
    // Wait for all AI operations to complete
    const [painPoints, serviceGaps, riskScore] = await Promise.all([
      painPointsPromise,
      serviceGapsPromise,
      riskScorePromise
    ]);
    
    await job.updateProgress(100);
    
    const result: JobResult = {
      painPoints,
      upsellOpportunities: serviceGaps.map((signal: any) => 
        `${signal.title} - ${signal.estimatedValue || 'Pricing TBD'}`
      ),
      riskScore,
      lastAnalyzed: new Date().toISOString(),
      signals: serviceGaps
    };
    
    const processingTime = Date.now() - startTime;
    updateQueueMetrics(processingTime, false);
    
    console.log(`[Worker] ✅ AI insights completed for contact ${job.data.contactId} in ${processingTime}ms`);
    return result;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    updateQueueMetrics(processingTime, true);
    
    console.error(`[Worker] ❌ AI insights failed for contact ${job.data.contactId}:`, error);
    throw error;
  }
}

// Create and start the worker
export async function startAIInsightsWorker(): Promise<Worker | null> {
  await initializeWorkerRedis();
  
  if (!workerRedis) {
    console.log('[Worker] No Redis connection, worker not started');
    return null;
  }

  const worker = new Worker('ai-insights', processAIInsights, {
    connection: workerRedis,
    concurrency: 2, // Process up to 2 jobs concurrently
    removeOnComplete: 10,
    removeOnFail: 25,
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] ✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  console.log('[Worker] 🚀 AI Insights worker started successfully');
  return worker;
}

// Graceful shutdown
export async function stopAIInsightsWorker(worker: Worker): Promise<void> {
  if (worker) {
    await worker.close();
    console.log('[Worker] AI Insights worker stopped');
  }
}