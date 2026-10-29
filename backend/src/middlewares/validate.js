import { AppError } from '../utils/AppError.js';

export function validate(schema, target = 'body') {
  return function validateRequest(req, _res, next) {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.slice(0, 3)
        .map((issue) => `${issue.path.join('.') || target}: ${issue.message}`)
        .join('; ');
      return next(new AppError(`Request validation failed: ${details}`, 422, 'VALIDATION_ERROR'));
    }

    req[target] = result.data;
    return next();
  };
}
