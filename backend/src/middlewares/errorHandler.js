import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

function normalizeError(error) {
  if (error instanceof AppError) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return new AppError('A record with this value already exists', 409, 'CONFLICT');
    if (error.code === 'P2025') return new AppError('The requested record was not found', 404, 'NOT_FOUND');
    if (error.code === 'P2003') return new AppError('The request conflicts with related records', 409, 'RELATION_CONFLICT');
    if (error.code === 'P2034') return new AppError('The data changed while processing this request. Please retry.', 409, 'TRANSACTION_CONFLICT');
  }

  if (error?.type === 'entity.parse.failed') return new AppError('Invalid JSON request body', 400, 'INVALID_JSON');
  return new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
}

export function errorHandler(error, req, res, _next) {
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    logger.error({ err: error, method: req.method, path: req.path }, 'Request failed');
  } else {
    logger.warn({ code: normalized.code, method: req.method, path: req.path }, normalized.message);
  }

  const message = normalized.statusCode >= 500 && env.NODE_ENV === 'production'
    ? 'Internal server error'
    : normalized.message;

  return res.status(normalized.statusCode).json({
    success: false,
    message,
    data: null,
  });
}
