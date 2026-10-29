import { Router } from 'express';
import { listActivePromotions, validatePromotion } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { z } from 'zod';

const router = Router();
router.get('/active', listActivePromotions);
router.post('/validate', authenticate, validate(z.object({ code: z.string().trim().min(1).max(40) }).strict()), validatePromotion);

export default router;
