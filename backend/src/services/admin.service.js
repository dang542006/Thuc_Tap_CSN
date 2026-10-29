import { adminRepository } from '../repositories/admin.repository.js';
import { orderService } from './order.service.js';
import { AppError } from '../utils/AppError.js';
import { slugify } from '../utils/slugify.js';

const LOW_STOCK_THRESHOLD = 5;
const MAX_PAGE_SIZE = 100;

function pagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function paged(items, total, page, limit) {
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

function containsFilter(value, fields) {
  const q = String(value ?? '').trim();
  return q ? { OR: fields.map((field) => ({ [field]: { contains: q } })) } : {};
}

async function assertActiveBookCategory(categoryId) {
  const category = await adminRepository.findCategory(categoryId);
  if (!category) throw new AppError('Danh mục sản phẩm không tồn tại.', 404, 'CATEGORY_NOT_FOUND');
  if (category.status !== 'ACTIVE') {
    throw new AppError('Danh mục đã ngừng hoạt động. Hãy chọn một danh mục đang hoạt động.', 409, 'CATEGORY_INACTIVE');
  }
  return category;
}

function bookOrderBy(sort) {
  if (sort === 'price_asc') return { price: 'asc' };
  if (sort === 'price_desc') return { price: 'desc' };
  if (sort === 'stock_asc') return { stock: 'asc' };
  if (sort === 'title_asc') return { title: 'asc' };
  return { createdAt: 'desc' };
}

export const adminService = {
  async dashboard() {
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const [[revenue, orders, customers, books], lowStock, bestSellerGroups, trend, statuses, categories, lowStockCount] = await Promise.all([
      adminRepository.dashboardCounts(),
      adminRepository.lowStockBooks(LOW_STOCK_THRESHOLD),
      adminRepository.bestSellerItems(5),
      adminRepository.revenueReportSince(since),
      adminRepository.orderStatusCounts(),
      adminRepository.categoryDistribution(),
      adminRepository.lowStockCount(LOW_STOCK_THRESHOLD),
    ]);
    const bestSellerBooks = await adminRepository.findBooksByIds(bestSellerGroups.map((item) => item.bookId));
    const bookById = new Map(bestSellerBooks.map((book) => [book.id, book]));
    const bestSellers = bestSellerGroups.map((item, index) => ({
      ...bookById.get(item.bookId),
      rank: index + 1,
      quantitySold: item._sum.quantity ?? 0,
      revenue: item._sum.subtotal ?? 0,
    }));
    return {
      metrics: {
        revenue: revenue._sum.total ?? 0,
        orders,
        customers,
        books,
        lowStock: lowStockCount,
      },
      lowStock,
      bestSellers,
      revenueTrend: Array.from({ length: 12 }, (_, index) => {
        const period = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + index, 1)).toISOString().slice(0, 7);
        const row = trend.find((item) => item.period === period);
        return { period, revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
      }),
      orderStatuses: statuses.map((row) => ({ status: row.orderStatus, count: row._count._all })),
      categoryDistribution: categories.map((row) => ({ id: row.id, name: row.name, count: row._count.books })),
      generatedAt: now.toISOString(),
    };
  },

  async listBooks(query) {
    const { page, limit, skip, take } = pagination(query);
    const where = { ...containsFilter(query.q, ['title', 'author', 'brand']), ...(query.categoryId ? { categoryId: query.categoryId } : {}) };
    if (query.brand) where.brand = { contains: String(query.brand).trim() };
    if (query.status) where.status = query.status;
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice !== undefined && query.minPrice !== '') {
        const minPrice = Number(query.minPrice);
        if (!Number.isFinite(minPrice) || minPrice < 0) throw new AppError('Mức giá tối thiểu không hợp lệ.', 422, 'INVALID_MIN_PRICE');
        where.price.gte = minPrice;
      }
      if (query.maxPrice !== undefined && query.maxPrice !== '') {
        const maxPrice = Number(query.maxPrice);
        if (!Number.isFinite(maxPrice) || maxPrice < 0) throw new AppError('Mức giá tối đa không hợp lệ.', 422, 'INVALID_MAX_PRICE');
        where.price.lte = maxPrice;
      }
      if (where.price.gte !== undefined && where.price.lte !== undefined && where.price.gte > where.price.lte) {
        throw new AppError('Giá tối thiểu không được lớn hơn giá tối đa.', 422, 'INVALID_PRICE_RANGE');
      }
    }
    const [items, total] = await Promise.all([
      adminRepository.listBooks({ where, orderBy: bookOrderBy(query.sort), skip, take }),
      adminRepository.countBooks(where),
    ]);
    return paged(items, total, page, limit);
  },

  async getBook(id) {
    const book = await adminRepository.findBook(id);
    if (!book) throw new AppError('Book was not found', 404, 'BOOK_NOT_FOUND');
    return book;
  },

  async getCategory(id) {
    const category = await adminRepository.findCategory(id);
    if (!category) throw new AppError('Category was not found', 404, 'CATEGORY_NOT_FOUND');
    return category;
  },

  async createBook(payload) {
    if (Array.isArray(payload.optionGroups)) {
      payload.optionGroups = { create: payload.optionGroups.map(({ items, ...group }) => ({ ...group, items: { create: items } })) };
    }
    await assertActiveBookCategory(payload.categoryId);
    const data = { ...payload, author: payload.brand || payload.author || 'Chưa cập nhật', slug: payload.slug ? slugify(payload.slug) : slugify(payload.title) };
    return adminRepository.createBook(data);
  },

  async updateBook(id, payload) {
    const optionGroups = payload.optionGroups;
    delete payload.optionGroups;
    const data = { ...payload };
    const existing = await this.getBook(id);
    if (data.categoryId && data.categoryId !== existing.categoryId) {
      await assertActiveBookCategory(data.categoryId);
    } else if (data.status === 'ACTIVE' && existing.category.status !== 'ACTIVE') {
      await assertActiveBookCategory(existing.categoryId);
    }
    if (Object.hasOwn(data, 'discountPrice') || Object.hasOwn(data, 'price')) {
      const regularPrice = Number(data.price ?? existing.price);
      const discountPrice = data.discountPrice === undefined ? Number(existing.discountPrice) : Number(data.discountPrice);
      if (!Number.isFinite(regularPrice) || (Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice >= regularPrice)) {
        throw new AppError('Discount price must be lower than the regular price', 422, 'INVALID_DISCOUNT_PRICE');
      }
    }
    if (data.title && !data.slug) data.slug = slugify(data.title);
    else if (data.slug) data.slug = slugify(data.slug);
    if (data.brand) data.author = data.brand;
    if (optionGroups) data.optionGroups = { deleteMany: {}, create: optionGroups.map(({ items, ...group }) => ({ ...group, items: { create: items } })) };
    return adminRepository.updateBook(id, data);
  },

  async deleteBook(id) {
    await this.getBook(id);
    const references = await adminRepository.countBookReferences(id);
    const blockers = [
      [references.orderItems, 'đơn hàng'],
      [references.reviews, 'đánh giá'],
      [references.cartItems, 'giỏ hàng'],
      [references.favorites, 'danh sách yêu thích'],
    ].filter(([count]) => count > 0).map(([, label]) => label);
    if (blockers.length) {
      throw new AppError(
        `Không thể xóa sách vì đang được tham chiếu bởi ${blockers.join(', ')}. Hãy dùng chức năng Ẩn sách để giữ nguyên dữ liệu liên quan.`,
        409,
        'BOOK_IN_USE',
      );
    }
    try {
      return await adminRepository.deleteBook(id);
    } catch (error) {
      if (error?.code === 'P2003') {
        throw new AppError('Không thể xóa sách vì dữ liệu khác đang tham chiếu. Hãy dùng chức năng Ẩn sách.', 409, 'BOOK_IN_USE');
      }
      throw error;
    }
  },

  async listCategories(query) {
    const { page, limit, skip, take } = pagination(query);
    const where = containsFilter(query.q, ['name', 'slug']);
    if (query.status) where.status = query.status;
    const [items, total] = await Promise.all([adminRepository.listCategories({ where, skip, take }), adminRepository.countCategories(where)]);
    return paged(items.map(({ _count, ...item }) => ({ ...item, bookCount: _count.books })), total, page, limit);
  },

  async createCategory(payload) {
    return adminRepository.createCategory({ ...payload, slug: slugify(payload.slug || payload.name) });
  },

  async updateCategory(id, payload) {
    const data = { ...payload };
    if (data.slug || data.name) data.slug = slugify(data.slug || data.name);
    return adminRepository.updateCategory(id, data);
  },

  async deleteCategory(id) {
    const category = await adminRepository.findCategory(id);
    if (!category) throw new AppError('Category was not found', 404, 'CATEGORY_NOT_FOUND');
    const bookCount = await adminRepository.countCategoryBooks(id);
    if (bookCount > 0) {
      throw new AppError(
        `Không thể xóa danh mục vì đang có ${bookCount} sách thuộc danh mục này. Hãy dùng chức năng Ẩn danh mục để giữ nguyên dữ liệu sách.`,
        409,
        'CATEGORY_IN_USE',
      );
    }
    try {
      return await adminRepository.deleteCategory(id);
    } catch (error) {
      if (error?.code === 'P2003') {
        throw new AppError('Không thể xóa danh mục vì dữ liệu khác đang tham chiếu. Hãy dùng chức năng Ẩn danh mục.', 409, 'CATEGORY_IN_USE');
      }
      throw error;
    }
  },

  async listOrders(query) {
    const { page, limit, skip, take } = pagination(query);
    const where = {};
    if (query.status) where.orderStatus = query.status;
    if (query.q) {
      const q = String(query.q).trim();
      where.OR = [{ orderNumber: { contains: q } }, { user: { name: { contains: q } } }, { user: { email: { contains: q } } }];
    }
    const [items, total] = await Promise.all([adminRepository.listOrders({ where, skip, take }), adminRepository.countOrders(where)]);
    return paged(items.map(({ user, _count, ...order }) => ({ ...order, customerName: user.name, customerEmail: user.email, itemCount: _count.items })), total, page, limit);
  },

  async getOrder(id) {
    const order = await adminRepository.findOrder(id);
    if (!order) throw new AppError('Order was not found', 404, 'ORDER_NOT_FOUND');
    return order;
  },

  updateOrderStatus(id, status) { return orderService.updateStatusAsAdmin(id, status); },

  async listCustomers(query) {
    const { page, limit, skip, take } = pagination(query);
    const where = { role: 'CUSTOMER', ...containsFilter(query.q, ['name', 'email', 'phone']) };
    if (query.status) where.status = query.status;
    if (query.membershipLevel) where.membershipLevel = query.membershipLevel;
    const [items, total] = await Promise.all([adminRepository.listCustomers({ where, skip, take }), adminRepository.countCustomers(where)]);
    return paged(items.map(({ _count, ...user }) => ({ ...user, orderCount: _count.orders, reviewCount: _count.reviews })), total, page, limit);
  },

  async getCustomer(id) {
    const customer = await adminRepository.findCustomer(id);
    if (!customer || customer.role !== 'CUSTOMER') throw new AppError('Customer was not found', 404, 'CUSTOMER_NOT_FOUND');
    const { _count, ...data } = customer;
    return { ...data, orderCount: _count.orders, reviewCount: _count.reviews };
  },

  async setCustomerStatus(id, status) {
    await this.getCustomer(id);
    return adminRepository.setCustomerStatus(id, status);
  },

  async listReviews(query) {
    const { page, limit, skip, take } = pagination(query);
    const where = {};
    if (query.status) where.status = query.status;
    if (query.rating) where.rating = Number(query.rating);
    if (query.q) {
      const q = String(query.q).trim();
      where.OR = [{ comment: { contains: q } }, { book: { title: { contains: q } } }, { user: { name: { contains: q } } }];
    }
    const [items, total] = await Promise.all([adminRepository.listReviews({ where, skip, take }), adminRepository.countReviews(where)]);
    return paged(items, total, page, limit);
  },

  async setReviewStatus(id, status) {
    const review = await adminRepository.findReview(id);
    if (!review) throw new AppError('Review was not found', 404, 'REVIEW_NOT_FOUND');
    return adminRepository.updateReviewStatus(id, status);
  },

  async deleteReview(id) {
    const review = await adminRepository.findReview(id);
    if (!review) throw new AppError('Review was not found', 404, 'REVIEW_NOT_FOUND');
    return adminRepository.deleteReview(id);
  },

  async listPromotions(query) {
    const { page, limit, skip, take } = pagination(query);
    const where = containsFilter(query.q, ['code', 'name']);
    if (query.status) where.status = query.status;
    const [items, total] = await Promise.all([adminRepository.listPromotions({ where, skip, take }), adminRepository.countPromotions(where)]);
    return paged(items, total, page, limit);
  },

  createPromotion(payload) { return adminRepository.createPromotion(payload); },
  async updatePromotion(id, payload) {
    const existing = await adminRepository.findPromotion(id);
    if (!existing) throw new AppError('Promotion was not found', 404, 'PROMOTION_NOT_FOUND');
    const startsAt = payload.startsAt ?? existing.startsAt;
    const endsAt = payload.endsAt ?? existing.endsAt;
    const discountType = payload.discountType ?? existing.discountType;
    const discountValue = Number(payload.discountValue ?? existing.discountValue);
    if (endsAt <= startsAt) throw new AppError('End date must be after start date', 422, 'INVALID_PROMOTION_DATES');
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      throw new AppError('Percentage cannot exceed 100', 422, 'INVALID_PROMOTION_DISCOUNT');
    }
    return adminRepository.updatePromotion(id, payload);
  },
  async deletePromotion(id) {
    const promotion = await adminRepository.findPromotion(id);
    if (!promotion) throw new AppError('Promotion was not found', 404, 'PROMOTION_NOT_FOUND');
    if (promotion.usedCount > 0) return adminRepository.updatePromotion(id, { status: 'INACTIVE' });
    return adminRepository.deletePromotion(id);
  },
  async setPromotionStatus(id, status) {
    const promotion = await adminRepository.findPromotion(id);
    if (!promotion) throw new AppError('Promotion was not found', 404, 'PROMOTION_NOT_FOUND');
    return adminRepository.updatePromotion(id, { status });
  },

  async listMembership(query = {}) {
    const { page, limit, skip, take } = pagination(query);
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      adminRepository.listMemberships({ where, skip, take }),
      adminRepository.countMemberships(where),
    ]);
    return paged(items, total, page, limit);
  },

  createMembership(payload) { return adminRepository.createMembership(payload); },

  async updateMembership(id, payload) {
    const membership = await adminRepository.findMembership(id);
    if (!membership) throw new AppError('Membership tier was not found', 404, 'MEMBERSHIP_NOT_FOUND');
    if (payload.level && payload.level !== membership.level) {
      if (membership.level === 'BRONZE') throw new AppError('The BRONZE level code is reserved as the membership fallback', 409, 'MEMBERSHIP_BASE_TIER_REQUIRED');
      const assignedCustomers = await adminRepository.countCustomersWithMembershipLevel(membership.level);
      if (assignedCustomers > 0) throw new AppError('Cannot change the level code while customers are assigned to this tier', 409, 'MEMBERSHIP_TIER_IN_USE');
    }
    return adminRepository.updateMembership(id, payload);
  },

  async deleteMembership(id) {
    const membership = await adminRepository.findMembership(id);
    if (!membership) throw new AppError('Membership tier was not found', 404, 'MEMBERSHIP_NOT_FOUND');
    if (membership.level === 'BRONZE') throw new AppError('The BRONZE level must remain active as the membership fallback', 409, 'MEMBERSHIP_BASE_TIER_REQUIRED');
    const assignedCustomers = await adminRepository.countCustomersWithMembershipLevel(membership.level);
    if (assignedCustomers > 0) throw new AppError('Cannot deactivate a membership tier currently assigned to customers', 409, 'MEMBERSHIP_TIER_IN_USE');
    return adminRepository.updateMembership(id, { status: 'INACTIVE' });
  },

  async reports(query = {}) {
    const type = query.type === 'day' ? 'day' : 'month';
    const parseDate = (value, fallback) => {
      if (!value) return fallback;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new AppError('Ngày báo cáo phải có định dạng YYYY-MM-DD.', 422, 'INVALID_REPORT_DATE');
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new AppError('Ngày báo cáo không hợp lệ.', 422, 'INVALID_REPORT_DATE');
      return date;
    };
    const today = new Date();
    const defaultFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
    const since = parseDate(query.from, defaultFrom);
    const untilDate = parseDate(query.to, new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
    if (untilDate < since) throw new AppError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.', 422, 'INVALID_REPORT_RANGE');
    const until = new Date(untilDate.getTime() + 24 * 60 * 60 * 1000);
    const report = await adminRepository.reportBetween(since, until, type);
    const items = report.map((row) => {
      const item = { period: row.period, revenue: Number(row.revenue), orders: Number(row.orders), successfulOrders: Number(row.successfulOrders) };
      return {
      ...item,
      averageOrderValue: item.successfulOrders ? item.revenue / item.successfulOrders : 0,
      };
    });
    return { items, from: since.toISOString().slice(0, 10), to: untilDate.toISOString().slice(0, 10), type, totals: items.reduce((sum, item) => ({ revenue: sum.revenue + item.revenue, orders: sum.orders + item.orders, successfulOrders: sum.successfulOrders + item.successfulOrders }), { revenue: 0, orders: 0, successfulOrders: 0 }), total: items.length, page: 1, limit: items.length || 1, totalPages: 1 };
  },

  async listGiftCards(query = {}) {
    const { page, limit, skip, take } = pagination(query);
    const where = { ...(query.status ? { status: query.status } : {}) };
    if (query.q) where.code = { contains: String(query.q).trim() };
    const [items, total] = await Promise.all([
      adminRepository.listGiftCards({ where, skip, take }),
      adminRepository.countGiftCards(where),
    ]);
    return paged(items, total, page, limit);
  },

  async createGiftCard(payload) {
    const balance = payload.balance ?? payload.initialValue;
    if (balance > payload.initialValue) throw new AppError('Balance cannot exceed the initial value', 422, 'INVALID_GIFT_CARD_BALANCE');
    return adminRepository.createGiftCard({ ...payload, balance });
  },

  async updateGiftCard(id, payload) {
    const existing = await adminRepository.findGiftCard(id);
    if (!existing) throw new AppError('Gift card was not found', 404, 'GIFT_CARD_NOT_FOUND');
    const initialValue = Number(payload.initialValue ?? existing.initialValue);
    const balance = Number(payload.balance ?? existing.balance);
    if (balance > initialValue) throw new AppError('Balance cannot exceed the initial value', 422, 'INVALID_GIFT_CARD_BALANCE');
    return adminRepository.updateGiftCard(id, payload);
  },

  async deleteGiftCard(id) {
    const existing = await adminRepository.findGiftCard(id);
    if (!existing) throw new AppError('Gift card was not found', 404, 'GIFT_CARD_NOT_FOUND');
    return adminRepository.updateGiftCard(id, { status: 'INACTIVE' });
  },

  async listGifts(query = {}) {
    const { page, limit, skip, take } = pagination(query);
    const where = { ...(query.status ? { status: query.status } : {}) };
    if (query.q) where.name = { contains: String(query.q).trim() };
    const [items, total] = await Promise.all([
      adminRepository.listGifts({ where, skip, take }),
      adminRepository.countGifts(where),
    ]);
    return paged(items, total, page, limit);
  },

  createGift(payload) { return adminRepository.createGift(payload); },

  async updateGift(id, payload) {
    const existing = await adminRepository.findGift(id);
    if (!existing) throw new AppError('Gift was not found', 404, 'GIFT_NOT_FOUND');
    return adminRepository.updateGift(id, payload);
  },

  async deleteGift(id) {
    const existing = await adminRepository.findGift(id);
    if (!existing) throw new AppError('Gift was not found', 404, 'GIFT_NOT_FOUND');
    return adminRepository.updateGift(id, { status: 'INACTIVE' });
  },
};
