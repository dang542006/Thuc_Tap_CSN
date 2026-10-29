import { Router } from 'express';
import { cancelOrder, checkout, getOrder, listOrders } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { checkoutSchema } from '../validators/customer.validator.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { orderService } from '../services/order.service.js';

const router = Router();
router.get('/track', asyncHandler(async (req, res) => {
  const data = await orderService.track(req.query.orderNumber, req.query.phone);
  res.status(200).json({ success: true, data });
}));
router.use(authenticate);
router.get('/', listOrders);
router.post('/', validate(checkoutSchema), checkout);
router.get('/:orderId', getOrder);
router.post('/:orderId/cancel', cancelOrder);

export default router;
