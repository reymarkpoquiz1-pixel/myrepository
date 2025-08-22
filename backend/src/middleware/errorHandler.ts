import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Custom error class
export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  // Log error for debugging
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    message = 'Resource conflict';
  } else if (error.name === 'TooManyRequestsError') {
    statusCode = 429;
    message = 'Too many requests';
  }

  // Handle database errors
  if (error.message?.includes('duplicate key')) {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.message?.includes('foreign key')) {
    statusCode = 400;
    message = 'Invalid reference';
  }

  // Handle file upload errors
  if (error.message?.includes('File too large')) {
    statusCode = 413;
    message = 'File size exceeds limit';
  } else if (error.message?.includes('Invalid file type')) {
    statusCode = 400;
    message = 'Invalid file type';
  }

  // Production error response (hide stack trace)
  const errorResponse = {
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  };

  // Development error response (include stack trace)
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = {
      ...errorResponse.error,
      message,
      stack: error.stack,
      details: error.message
    };
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const validationErrorHandler = (errors: any[]) => {
  const error = new CustomError('Validation failed', 400);
  error.message = 'Validation Error';
  error.name = 'ValidationError';
  return error;
};

// Database error handler
export const databaseErrorHandler = (error: any) => {
  if (error.code === '23505') { // Unique constraint violation
    return new CustomError('Resource already exists', 409);
  } else if (error.code === '23503') { // Foreign key constraint violation
    return new CustomError('Invalid reference', 400);
  } else if (error.code === '23502') { // Not null constraint violation
    return new CustomError('Required field missing', 400);
  }
  return new CustomError('Database error', 500);
};