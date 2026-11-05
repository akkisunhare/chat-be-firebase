import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { env } from '../config/env';
import { checkDatabaseHealth, DatabaseHealthStatus } from '../config/database';
import { FirestoreService, FirestoreHealthStatus } from '../services/firestore.service';

export interface HealthCheckData {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
  database: DatabaseHealthStatus;
  firestore: FirestoreHealthStatus;
  memoryUsage: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

export const getHealthStatus = async (_req: Request, res: Response): Promise<void> => {
  const memory = process.memoryUsage();
  const dbHealth = await checkDatabaseHealth();
  const firestoreHealth = await FirestoreService.verifyConnectivity();

  const isPostgresConnected = dbHealth.status === 'connected';
  const isFirestoreOk =
    firestoreHealth.status === 'connected' || firestoreHealth.status === 'not_configured';

  const isHealthy = isPostgresConnected && isFirestoreOk;

  const healthData: HealthCheckData = {
    status: isHealthy ? 'healthy' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: dbHealth,
    firestore: firestoreHealth,
    memoryUsage: {
      heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
    },
  };

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(
    ApiResponse.success(
      isHealthy
        ? 'Backend services are healthy and operational'
        : 'One or more backend services are degraded or disconnected',
      healthData
    )
  );
};
