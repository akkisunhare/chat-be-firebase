import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

interface PrismaErrorWithCode extends Error {
  code: string;
  meta?: Record<string, unknown>;
}

interface FirebaseErrorWithCode extends Error {
  code: string;
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown = undefined;

  // 1. Custom Operational AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }
  // 2. Zod Request Validation Error
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }
  // 3. Prisma Client Errors
  else if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as PrismaErrorWithCode).code === 'string' &&
    (err as PrismaErrorWithCode).code.startsWith('P')
  ) {
    const prismaErr = err as PrismaErrorWithCode;
    switch (prismaErr.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this unique identifier already exists';
        details = prismaErr.meta;
        break;
      case 'P2025':
        statusCode = 404;
        message = 'The requested database record was not found';
        break;
      default:
        statusCode = 500;
        message = 'Database operation failed';
    }
  }
  // 4. Firebase Admin Errors
  else if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as FirebaseErrorWithCode).code === 'string' &&
    (err as FirebaseErrorWithCode).code.includes('/')
  ) {
    statusCode = 502;
    message = 'Firebase service error occurred';
    details = (err as FirebaseErrorWithCode).message;
  }
  // 5. Standard JavaScript Error
  else if (err instanceof Error) {
    message = err.message || message;
  }

  // Log server errors (skip during automated test runs)
  if (env.NODE_ENV !== 'test') {
    if (statusCode >= 500) {
      console.error('💥 Unhandled Server Error:', err);
    } else {
      console.warn(`⚠️ [${statusCode}] ${message}`);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
    ...(env.NODE_ENV === 'development' && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
};
