import { customerRepository } from '../repositories/customer.repository.js';
import { AppError } from '../utils/AppError.js';

export const favoriteService = {
  async list(userId) {
    const favorites = await customerRepository.listFavorites(userId);
    return favorites.map(({ book }) => book);
  },
  async toggle(userId, bookId) {
    return customerRepository.transaction(async (repository) => {
      const existing = await repository.findFavorite(userId, bookId);
      if (existing) {
        await repository.deleteFavorite(userId, bookId);
        return { bookId, isFavorite: false };
      }
      const book = await repository.findBookForPurchase(bookId);
      if (!book || book.status !== 'ACTIVE') throw new AppError('Sách không còn được mở bán.', 404, 'BOOK_NOT_FOUND');
      await repository.createFavorite(userId, bookId);
      return { bookId, isFavorite: true };
    });
  },
};
