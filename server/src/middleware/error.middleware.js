import { ZodError } from 'zod';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `File too large. Maximum allowed size is ${Math.round(env.MAX_FILE_SIZE / (1024 * 1024))}MB`;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected file field '${err.field}'. Expected form-data field name 'file'`;
    } else {
      message = `File upload error: ${err.message}`;
    }
    errors = [{ code: err.code, message }];
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = err.meta?.target ? ` (${err.meta.target})` : '';
      message = `A record with this unique value already exists${target}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested record not found';
    } else {
      statusCode = 400;
      message = `Database query error [${err.code}]`;
    }
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  // Log the error
  const logContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    statusCode,
    userId: req.user?.id || 'unauthenticated',
    errors: errors.length > 0 ? errors : undefined,
  };

  if (statusCode >= 500) {
    if (env.NODE_ENV === 'production') {
      message = 'Internal Server Error';
    }
    logger.error(`Exception occurred: ${message}`, { ...logContext, stack: err.stack });
  } else {
    logger.warn(`Handled error [${statusCode}]: ${message}`, logContext);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

