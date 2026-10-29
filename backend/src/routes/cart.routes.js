import { Router } from 'express';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from '../controllers/cart.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { cartAddSchema, cartQuantitySchema } from '../validators/customer.validator.js';

const router = Router();
router.use(authenticate);
router.get('/', getCart);
router.post('/items', validate(cartAddSchema), addCartItem);
router.patch('/items/:itemId', validate(cartQuantitySchema), updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/', clearCart);

export default router;
