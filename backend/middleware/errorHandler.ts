import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] ${err.message}`, err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
      code: err.statusCode
    });
  }

  // Handle SyntaxError (JSON parse error)
  if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
          error: 'Invalid JSON payload',
          code: 400
      });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    code: 500
  });
};
