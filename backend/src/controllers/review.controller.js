import { reviewService } from '../services/review.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listReviews = asyncHandler(async (req, res) => {
  const data = await reviewService.listPublic(req.query);
  res.status(200).json({ success: true, message: 'Reviews loaded successfully', data });
});

export const listMyReviews = asyncHandler(async (req, res) => {
  const data = await reviewService.listMine(req.user.id, req.query);
  res.status(200).json({ success: true, message: 'Your reviews loaded successfully', data });
});

export const createReview = asyncHandler(async (req, res) => {
  const data = await reviewService.create(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Đánh giá đã được gửi và đang chờ quản trị viên duyệt.', data });
});
