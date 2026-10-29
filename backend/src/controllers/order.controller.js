import { orderService } from '../services/order.service.js';
import { promotionService } from '../services/promotion.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const checkout = asyncHandler(async (req, res) => {
  const data = await orderService.checkout(req.user.id, req.body, req.ip);
  res.status(201).json({ success: true, message: 'Order created successfully', data });
});

export const listOrders = asyncHandler(async (req, res) => {
  const data = await orderService.list(req.user.id, req.query);
  res.status(200).json({ success: true, message: 'Orders loaded successfully', data });
});

export const getOrder = asyncHandler(async (req, res) => {
  const data = await orderService.get(req.user.id, req.params.orderId);
  res.status(200).json({ success: true, message: 'Order loaded successfully', data });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const data = await orderService.cancel(req.user.id, req.params.orderId);
  res.status(200).json({ success: true, message: 'Order cancelled successfully', data });
});

export const validatePromotion = asyncHandler(async (req, res) => {
  const data = await orderService.validatePromotion(req.user.id, req.body.code);
  res.status(200).json({ success: true, message: 'Promotion is valid', data });
});

export const listActivePromotions = asyncHandler(async (_req, res) => {
  const data = await promotionService.listActive();
  res.status(200).json({ success: true, message: 'Active promotions loaded successfully', data });
});
