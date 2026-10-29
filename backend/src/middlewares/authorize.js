import { AppError } from '../utils/AppError.js';

export function authorize(...allowedRoles) {
  return function roleAuthorization(req, _res, next) {
    if (!req.user) {
      return next(new AppError('Authentication is required', 401, 'UNAUTHENTICATED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to access this resource', 403, 'FORBIDDEN'));
    }

    return next();
  };
}
