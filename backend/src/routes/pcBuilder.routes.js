import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middlewares/validate.js';
import { advisePcBuild, checkPcBuild, getPcBuilderCatalog } from '../controllers/pcBuilder.controller.js';
import { pcBuildAdviceSchema, pcBuildCheckSchema } from '../validators/pcBuilder.validator.js';

const router = Router();
router.get('/catalog', getPcBuilderCatalog);
router.post('/check', validate(pcBuildCheckSchema), checkPcBuild);
router.post('/advice', rateLimit({ windowMs: 60000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }), validate(pcBuildAdviceSchema), advisePcBuild);
export default router;
