import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { advisorSchema } from '../validators/advisor.validator.js';
import { validate } from '../middlewares/validate.js';
import { adviseBooks } from '../controllers/advisor.controller.js';

const router = Router();
router.post('/', rateLimit({ windowMs: 60000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau một phút.', data: null } }), validate(advisorSchema), adviseBooks);
export default router;
