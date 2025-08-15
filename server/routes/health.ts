/**
 * Health Check Routes
 * 
 * Provides health monitoring for all external services
 */

import { Router } from 'express';
import { checkServicesHealth } from '../services';
import { logger } from '../logger';

const router = Router();

// Fast liveness endpoint for Fly health checks
router.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness endpoint - aggregated health of dependencies
router.get('/readyz', async (req, res) => {
  try {
    const healthResult = await checkServicesHealth();
    
    const status = healthResult.healthy ? 200 : 503;
    
    // Log unhealthy services to Sentry
    Object.entries(healthResult.services).forEach(([serviceName, serviceHealth]) => {
      if (serviceHealth.status !== 'healthy') {
        logger.error('Service unhealthy', {
          service: serviceName,
          status: serviceHealth.status,
          message: serviceHealth.message,
          responseTime: serviceHealth.responseTime
        });
      }
    });

    res.status(status).json({
      status: healthResult.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: healthResult.services
    });
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Individual service readiness checks
router.get('/readyz/:service', async (req, res) => {
  const { service } = req.params;
  
  try {
    const healthResult = await checkServicesHealth();
    const serviceHealth = healthResult.services[service];
    
    if (!serviceHealth) {
      return res.status(404).json({
        status: 'not_found',
        message: `Service '${service}' not found`
      });
    }

    const status = serviceHealth.status === 'healthy' ? 200 : 503;
    
    res.status(status).json({
      service,
      ...serviceHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Service health check failed', { service, error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Service health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as healthRoutes };