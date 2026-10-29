import { Router } from 'express';
import { getMyMembership, listMembershipTiers } from '../controllers/membership.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();
router.get('/tiers', listMembershipTiers);
router.get('/me', authenticate, getMyMembership);

export default router;
