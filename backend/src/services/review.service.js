import { customerRepository } from '../repositories/customer.repository.js';
import { AppError } from '../utils/AppError.js';

export const reviewService = {
  async listPublic(query = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 10));
    let bookId = query.bookId ? String(query.bookId) : undefined;
    if (bookId) {
      const book = await customerRepository.findBook(bookId);
      if (!book || book.status !== 'ACTIVE') throw new AppError('Book was not found', 404, 'BOOK_NOT_FOUND');
      bookId = book.id;
    }
    const [items, total] = await Promise.all([
      customerRepository.listReviews({ bookId, skip: (page - 1) * limit, take: limit }),
      customerRepository.countReviews(bookId ? { bookId } : {}),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async listMine(userId, query = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 10));
    const [items, total] = await Promise.all([
      customerRepository.listReviews({ userId, skip: (page - 1) * limit, take: limit, includeInactive: true }),
      customerRepository.countReviews({ userId }, true),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async create(userId, { bookId, rating, comment }) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError('Rating must be an integer from 1 to 5', 422, 'INVALID_RATING');
    const book = await customerRepository.findBookForReview(bookId);
    if (!book || book.status !== 'ACTIVE') throw new AppError('Không tìm thấy sách đang hoạt động với mã hoặc ISBN này.', 404, 'BOOK_NOT_FOUND');
    const purchased = await customerRepository.hasDeliveredBookPurchase(userId, book.id);
    if (!purchased) throw new AppError('Bạn chỉ có thể đánh giá sách đã mua trong đơn hàng được giao thành công.', 403, 'PURCHASE_REQUIRED');
    return customerRepository.upsertReview({ userId, bookId: book.id, rating, comment });
  },
};
