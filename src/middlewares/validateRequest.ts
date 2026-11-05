import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export interface RequestValidationSchema {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Middleware to validate incoming request body, params, or query against Zod schemas
 */
export const validateRequest = (schema: ZodSchema | RequestValidationSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if ('parseAsync' in schema) {
        req.body = await schema.parseAsync(req.body);
      } else {
        const complexSchema = schema as RequestValidationSchema;
        if (complexSchema.params) {
          const parsedParams = await complexSchema.params.parseAsync(req.params);
          Object.assign(req.params, parsedParams);
        }
        if (complexSchema.query) {
          const parsedQuery = await complexSchema.query.parseAsync(req.query);
          Object.assign(req.query, parsedQuery);
        }
        if (complexSchema.body) {
          req.body = await complexSchema.body.parseAsync(req.body);
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
