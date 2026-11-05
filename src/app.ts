import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { rootRouter } from './routes';
import { chatRoutes } from './routes/chat.routes';
import { userRoutes } from './routes/user.routes';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';

const app: Application = express();

// Global Middlewares
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API routes under /api
app.use(env.API_PREFIX, rootRouter);

// Also mount /chat and /user directly at root level
app.use('/chat', chatRoutes);
app.use('/user', userRoutes);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
