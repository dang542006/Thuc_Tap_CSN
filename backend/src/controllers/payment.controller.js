import { orderService } from '../services/order.service.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

export const vnpayIpn = asyncHandler(async (req, res) => {
  try {
    const result = await orderService.resolveVnpayResult(req.query);
    res.status(200).json({ RspCode: '00', Message: result.success ? 'Confirm Success' : 'Payment failed recorded' });
  } catch (error) {
    const code = error.statusCode === 404 ? '01' : error.code === 'INVALID_VNPAY_SIGNATURE' ? '97' : '99';
    res.status(200).json({ RspCode: code, Message: error.message || 'Unknown error' });
  }
});

export const vnpayReturn = asyncHandler(async (req, res) => {
  let result = { success: false };
  try { result = await orderService.resolveVnpayResult(req.query); }
  catch { /* A failed signature or unavailable order is shown as a failed payment result. */ }
  const params = new URLSearchParams({ status: result.success ? 'success' : 'failed', orderNumber: String(req.query.vnp_TxnRef ?? '') });
  res.redirect(`${env.FRONTEND_URL}/payment-result?${params}`);
});
