import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  return res.status(201).json({ success: true, message: 'Account created successfully', data });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return res.status(200).json({ success: true, message: 'Signed in successfully', data });
});

export const me = asyncHandler(async (req, res) => {
  const data = await authService.getCurrentUser(req.user.id);
  return res.status(200).json({ success: true, message: 'Current user loaded successfully', data });
});
