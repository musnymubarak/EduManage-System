import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Handle Prisma Errors
  if (err.code && err.code.startsWith('P')) {
    let message = 'Database error occurred';
    let statusCode = 400;

    switch (err.code) {
      case 'P2002':
        const target = err.meta?.target || 'field';
        message = `A record with this ${target} already exists.`;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed. Related record not found.';
        break;
      case 'P2025':
        message = 'Record not found.';
        statusCode = 404;
        break;
    }

    res.status(statusCode).json({
      status: 'error',
      message,
      code: err.code,
    });
    return;
  }

  // Log unexpected errors
  console.error('ERROR 💥:', err);

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;

  res.status(500).json({
    status: 'error',
    message,
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
};
