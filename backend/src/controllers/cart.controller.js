import { cartService } from '../services/cart.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCart = asyncHandler(async (req, res) => {
  const data = await cartService.getCart(req.user.id);
  res.status(200).json({ success: true, message: 'Cart loaded successfully', data });
});

export const addCartItem = asyncHandler(async (req, res) => {
  const data = await cartService.addToCart(req.user.id, req.body.bookId, req.body.quantity, req.body.selectedOptions);
  res.status(201).json({ success: true, message: 'Book added to cart', data });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const data = await cartService.updateQuantity(req.user.id, req.params.itemId, req.body.quantity);
  res.status(200).json({ success: true, message: 'Cart quantity updated', data });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const data = await cartService.removeFromCart(req.user.id, req.params.itemId);
  res.status(200).json({ success: true, message: 'Cart item removed', data });
});

export const clearCart = asyncHandler(async (req, res) => {
  const data = await cartService.clearCart(req.user.id);
  res.status(200).json({ success: true, message: 'Cart cleared', data });
});
