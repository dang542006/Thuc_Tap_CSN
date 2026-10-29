import { AppError } from '../utils/AppError.js';
import { parsePriceFilter } from '../utils/priceFilter.js';
import { customerRepository } from '../repositories/customer.repository.js';

const MAX_PAGE_SIZE = 48;

function ratingSummary(book) {
  const ratings = book.reviews ?? [];
  const averageRating = ratings.length
    ? Math.round((ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length) * 10) / 10
    : null;
  const { reviews: _reviews, ...publicBook } = book;
  return { ...publicBook, rating: averageRating, reviewCount: ratings.length };
}

function buildOrderBy(sort) {
  switch (sort) {
    case 'price_asc': return { price: 'asc' };
    case 'price_desc': return { price: 'desc' };
    case 'title_asc': return { title: 'asc' };
    default: return { createdAt: 'desc' };
  }
}

export const bookService = {
  async list(query) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(query.limit, 10) || 12));
    const skip = (page - 1) * limit;
    const where = { status: 'ACTIVE' };
    const search = String(query.q ?? query.search ?? '').trim();
    if (search) where.OR = [
      { title: { contains: search } },
      { author: { contains: search } },
      { brand: { contains: search } },
      { description: { contains: search } },
    ];
    const categoryId = query.categoryId || query.categorySlug || query.category
      ? String(query.categoryId || query.categorySlug || query.category)
      : undefined;
    const categoryIds = categoryId ? await customerRepository.categoryIdsIncludingChildren(categoryId) : undefined;
    if (categoryId) where.categoryId = { in: categoryIds };
    const brand = String(query.brand ?? '').trim();
    if (brand) where.brand = { contains: brand };
    const validMinPrice = parsePriceFilter(query.minPrice);
    const validMaxPrice = parsePriceFilter(query.maxPrice);
    if (validMinPrice !== undefined && validMaxPrice !== undefined && validMinPrice > validMaxPrice) {
      throw new AppError('Giá tối thiểu không được lớn hơn giá tối đa.', 422, 'INVALID_PRICE_RANGE');
    }
    const minRating = Number(query.rating);
    const validMinRating = Number.isFinite(minRating) && minRating >= 1 && minRating <= 5
      ? Math.floor(minRating)
      : undefined;

    const requestedSort = query.featured === 'true' ? 'best_selling' : query.sort;
    const bestSelling = requestedSort === 'best_selling';
    const priceSort = ['price_asc', 'price_desc'].includes(requestedSort) ? requestedSort : undefined;
    const needsComputedFilters = validMinPrice !== undefined || validMaxPrice !== undefined || validMinRating !== undefined || priceSort || bestSelling;
    let rows;
    let total;

    if (needsComputedFilters) {
      const matchingBooks = await customerRepository.findCatalogBookIds({
        search,
        categoryId,
        categoryIds,
        brand,
        minPrice: validMinPrice,
        maxPrice: validMaxPrice,
        minRating: validMinRating,
        priceSort,
        bestSelling,
      });
      const matchingIds = matchingBooks.map((book) => book.id);
      total = matchingIds.length;

      if (priceSort || bestSelling) {
        const pageIds = matchingIds.slice(skip, skip + limit);
        if (pageIds.length) {
          const pageRows = await customerRepository.listBooks({
            where: { ...where, id: { in: pageIds } },
            orderBy: { createdAt: 'desc' },
            skip: 0,
            take: pageIds.length,
          });
          const rowById = new Map(pageRows.map((book) => [book.id, book]));
          rows = pageIds.map((id) => rowById.get(id)).filter(Boolean);
        } else {
          rows = [];
        }
      } else if (matchingIds.length) {
        rows = await customerRepository.listBooks({
          where: { ...where, id: { in: matchingIds } },
          orderBy: buildOrderBy(requestedSort),
          skip,
          take: limit,
        });
      } else {
        rows = [];
      }
    } else {
      [rows, total] = await Promise.all([
        customerRepository.listBooks({ where, orderBy: buildOrderBy(requestedSort), skip, take: limit }),
        customerRepository.countBooks(where),
      ]);
    }
    return { items: rows.map(ratingSummary), total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async get(idOrSlug) {
    const book = await customerRepository.findBook(idOrSlug);
    if (!book || book.status !== 'ACTIVE') throw new AppError('Book was not found', 404, 'BOOK_NOT_FOUND');
    return ratingSummary(book);
  },

  async related(idOrSlug) {
    const book = await customerRepository.findBook(idOrSlug);
    if (!book || book.status !== 'ACTIVE') throw new AppError('Book was not found', 404, 'BOOK_NOT_FOUND');
    const result = await customerRepository.listBooks({
      where: { status: 'ACTIVE', categoryId: book.categoryId, NOT: { id: book.id } },
      orderBy: { createdAt: 'desc' }, skip: 0, take: 8,
    });
    return result.map(ratingSummary);
  },
};
