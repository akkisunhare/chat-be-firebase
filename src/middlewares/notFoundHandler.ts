import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found on this server`,
    404
  );
  next(error);
};

