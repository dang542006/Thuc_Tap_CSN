import { categoryService } from '../services/category.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listCategories = asyncHandler(async (_req, res) => {
  const data = await categoryService.list();
  res.status(200).json({ success: true, message: 'Categories loaded successfully', data });
});
