import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { userRepository } from '../repositories/user.repository.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authentication is required', 401, 'UNAUTHENTICATED');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired access token', 401, 'INVALID_TOKEN');
  }

  if (typeof payload !== 'object' || !payload.sub) {
    throw new AppError('Invalid or expired access token', 401, 'INVALID_TOKEN');
  }

  // Read the current account state and role so locked accounts and stale admin
  // tokens cannot continue using protected APIs.
  const user = await userRepository.findPublicById(payload.sub);
  if (!user) throw new AppError('Invalid or expired access token', 401, 'INVALID_TOKEN');
  if (user.status !== 'ACTIVE') throw new AppError('This account is disabled', 403, 'ACCOUNT_DISABLED');
  req.user = { id: user.id, role: user.role };
  next();
});
