import { newsletterService } from '../services/newsletter.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const subscribe = asyncHandler(async (req, res) => {
  const data = await newsletterService.subscribe(req.body.email);
  res.status(200).json({ success: true, message: 'Subscription saved', data });
});
