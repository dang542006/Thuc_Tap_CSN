import { bookService } from '../services/book.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listBooks = asyncHandler(async (req, res) => {
  const data = await bookService.list(req.query);
  res.status(200).json({ success: true, message: 'Books loaded successfully', data });
});

export const getBook = asyncHandler(async (req, res) => {
  const data = await bookService.get(req.params.idOrSlug);
  res.status(200).json({ success: true, message: 'Book loaded successfully', data });
});

export const getRelatedBooks = asyncHandler(async (req, res) => {
  const data = await bookService.related(req.params.idOrSlug);
  res.status(200).json({ success: true, message: 'Related books loaded successfully', data });
});
