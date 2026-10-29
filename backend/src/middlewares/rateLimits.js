import { rateLimit } from 'express-rate-limit';

function limiter(max, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(_req, res) {
      res.status(429).json({ success: false, message, data: null });
    },
  });
}

export const authRateLimit = limiter(10, 'Too many authentication attempts. Please try again later.');
export const imageUploadRateLimit = limiter(30, 'Too many image uploads. Please try again later.');
