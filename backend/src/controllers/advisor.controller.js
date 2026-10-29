import { asyncHandler } from '../utils/asyncHandler.js';
import { advisorService } from '../services/advisor.service.js';

export const adviseBooks = asyncHandler(async (req, res) => {
  const data = await advisorService.reply(req.body.messages);
  res.json({ success: true, message: 'Gợi ý sản phẩm', data });
});
