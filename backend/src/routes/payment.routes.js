import { Router } from 'express';
import { vnpayIpn, vnpayReturn } from '../controllers/payment.controller.js';

const router = Router();
router.get('/vnpay/return', vnpayReturn);
router.get('/vnpay/ipn', vnpayIpn);

export default router;
