import { Router } from 'express';
import { createReview, listMyReviews, listReviews } from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { reviewSchema } from '../validators/customer.validator.js';

const router = Router();
router.get('/', listReviews);
router.get('/mine', authenticate, listMyReviews);
router.post('/', authenticate, validate(reviewSchema), createReview);

export default router;
