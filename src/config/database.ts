import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Connect to PostgreSQL and verify connection with a ping
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('🐘 PostgreSQL connected successfully via Prisma Client');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    throw error;
  }
};

/**
 * Gracefully disconnect from PostgreSQL
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('🔌 PostgreSQL disconnected successfully');
  } catch (error) {
    console.error('❌ Error while disconnecting from PostgreSQL:', error);
  }
};

export interface DatabaseHealthStatus {
  status: 'connected' | 'disconnected';
  responseTimeMs?: number;
  error?: string;
}

/**
 * Health check ping for database connectivity
 */
export const checkDatabaseHealth = async (): Promise<DatabaseHealthStatus> => {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'connected',
      responseTimeMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Database ping failed',
    };
  }
};

