import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

const server = http.createServer(app);

const startServer = async (): Promise<void> => {
  try {
    // 1. Establish PostgreSQL connection via Prisma
    await connectDatabase();

    // 2. Start listening on configured port
    server.listen(env.PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Server listening on port: ${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🩺 Health check URL: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('❌ Failed to start server due to database connection failure:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
let isShuttingDown = false;
const handleShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  const forceTimeout = setTimeout(() => {
    console.error('⚠️ Could not complete graceful shutdown in time, forcefully exiting');
    process.exit(1);
  }, 10000);
  forceTimeout.unref();

  server.close(async (err) => {
    if (err) {
      console.error('❌ Error while closing HTTP server:', err);
    } else {
      console.log('✅ HTTP server closed gracefully.');
    }

    // Disconnect Prisma database client
    await disconnectDatabase();
    process.exit(err ? 1 : 0);
  });
};

process.on('SIGINT', () => {
  void handleShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void handleShutdown('SIGTERM');
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('💥 Unhandled Rejection at Promise:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('💥 Uncaught Exception thrown:', error);
  process.exit(1);
});

void startServer();
