import { Router } from 'express';
import { subscribe } from '../controllers/newsletter.controller.js';
import { validate } from '../middlewares/validate.js';
import { authRateLimit } from '../middlewares/rateLimits.js';
import { newsletterSubscribeSchema } from '../validators/newsletter.validator.js';

const router = Router();
router.post('/subscribe', authRateLimit, validate(newsletterSubscribeSchema), subscribe);

export default router;
