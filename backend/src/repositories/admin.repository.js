import { prisma } from '../config/database.js';

export const adminRepository = {
  orderStatusCounts() {
    return prisma.order.groupBy({ by: ['orderStatus'], _count: { _all: true } });
  },
  categoryDistribution() {
    return prisma.category.findMany({ select: { id: true, name: true, _count: { select: { books: { where: { status: 'ACTIVE' } } } } }, orderBy: { name: 'asc' } });
  },
  lowStockCount(threshold) {
    return prisma.book.count({ where: { status: 'ACTIVE', stock: { lte: threshold } } });
  },
  dashboardCounts() {
    return Promise.all([
      prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.book.count({ where: { status: 'ACTIVE' } }),
    ]);
  },
  lowStockBooks(threshold, take = 8) {
    return prisma.book.findMany({ where: { status: 'ACTIVE', stock: { lte: threshold } }, orderBy: { stock: 'asc' }, take, include: { category: { select: { name: true } } } });
  },
  bestSellerItems(take = 5) {
    return prisma.orderItem.groupBy({
      by: ['bookId'],
      where: { order: { orderStatus: 'DELIVERED' } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take,
    });
  },
  findBooksByIds(ids) { return prisma.book.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, slug: true, author: true, stock: true, price: true, image: true } }); },

  listBooks({ where, orderBy, skip, take }) {
    return prisma.book.findMany({ where, orderBy, skip, take, include: { category: { select: { id: true, name: true, slug: true } } } });
  },
  countBooks(where) { return prisma.book.count({ where }); },
  findBook(id) { return prisma.book.findUnique({ where: { id }, include: { category: true, optionGroups: { include: { items: true } } } }); },
  createBook(data) { return prisma.book.create({ data, include: { category: true, optionGroups: { include: { items: true } } } }); },
  updateBook(id, data) { return prisma.book.update({ where: { id }, data, include: { category: true, optionGroups: { include: { items: true } } } }); },
  countBookReferences(id) {
    return Promise.all([
      prisma.cartItem.count({ where: { bookId: id } }),
      prisma.orderItem.count({ where: { bookId: id } }),
      prisma.review.count({ where: { bookId: id } }),
      prisma.favorite.count({ where: { bookId: id } }),
    ]).then(([cartItems, orderItems, reviews, favorites]) => ({ cartItems, orderItems, reviews, favorites }));
  },
  deleteBook(id) { return prisma.book.delete({ where: { id } }); },

  listCategories({ where, skip, take }) { return prisma.category.findMany({ where, orderBy: { name: 'asc' }, skip, take, include: { _count: { select: { books: true } } } }); },
  countCategories(where) { return prisma.category.count({ where }); },
  findCategory(id) { return prisma.category.findUnique({ where: { id }, include: { _count: { select: { books: true } } } }); },
  countCategoryBooks(id) { return prisma.book.count({ where: { categoryId: id } }); },
  createCategory(data) { return prisma.category.create({ data }); },
  updateCategory(id, data) { return prisma.category.update({ where: { id }, data }); },
  deleteCategory(id) { return prisma.category.delete({ where: { id } }); },

  listOrders({ where, skip, take }) { return prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { user: { select: { id: true, name: true, email: true } }, _count: { select: { items: true } } } }); },
  countOrders(where) { return prisma.order.count({ where }); },
  findOrder(id) { return prisma.order.findUnique({ where: { id }, include: { user: { select: { id: true, name: true, email: true, phone: true } }, items: true, payments: true, promotion: true, statusHistory: { orderBy: { createdAt: 'asc' } } } }); },

  listCustomers({ where, skip, take }) { return prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: customerSelect }); },
  countCustomers(where) { return prisma.user.count({ where }); },
  findCustomer(id) { return prisma.user.findUnique({ where: { id }, select: { ...customerSelect, role: true } }); },
  setCustomerStatus(id, status) { return prisma.user.update({ where: { id }, data: { status }, select: customerSelect }); },

  listReviews({ where, skip, take }) { return prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { user: { select: { id: true, name: true, email: true } }, book: { select: { id: true, title: true, slug: true } } } }); },
  countReviews(where) { return prisma.review.count({ where }); },
  findReview(id) { return prisma.review.findUnique({ where: { id } }); },
  updateReviewStatus(id, status) { return prisma.review.update({ where: { id }, data: { status } }); },
  deleteReview(id) { return prisma.review.delete({ where: { id } }); },

  listPromotions({ where, skip, take }) { return prisma.promotion.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }); },
  countPromotions(where) { return prisma.promotion.count({ where }); },
  findPromotion(id) { return prisma.promotion.findUnique({ where: { id } }); },
  createPromotion(data) { return prisma.promotion.create({ data }); },
  updatePromotion(id, data) { return prisma.promotion.update({ where: { id }, data }); },
  deletePromotion(id) { return prisma.promotion.delete({ where: { id } }); },

  listMemberships({ where, skip, take }) { return prisma.membership.findMany({ where, orderBy: { minPoints: 'asc' }, skip, take }); },
  countMemberships(where) { return prisma.membership.count({ where }); },
  createMembership(data) { return prisma.membership.create({ data }); },
  findMembership(id) { return prisma.membership.findUnique({ where: { id } }); },
  countCustomersWithMembershipLevel(level) { return prisma.user.count({ where: { role: 'CUSTOMER', membershipLevel: level } }); },
  updateMembership(id, data) { return prisma.membership.update({ where: { id }, data }); },
  revenueReportSince(since) {
    return prisma.$queryRaw`
      SELECT DATE_FORMAT(createdAt, '%Y-%m') AS period,
             COALESCE(SUM(total), 0) AS revenue,
             COUNT(*) AS orders
      FROM \`Order\`
      WHERE paymentStatus = 'PAID' AND createdAt >= ${since}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY period
    `;
  },
  reportBetween(since, until, type) {
    if (type === 'day') return prisma.$queryRaw`
      SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS period,
             COALESCE(SUM(CASE WHEN paymentStatus = 'PAID' THEN total ELSE 0 END), 0) AS revenue,
             COUNT(*) AS orders,
             SUM(CASE WHEN paymentStatus = 'PAID' THEN 1 ELSE 0 END) AS successfulOrders
      FROM \`Order\` WHERE createdAt >= ${since} AND createdAt < ${until}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d') ORDER BY period`;
    return prisma.$queryRaw`
      SELECT DATE_FORMAT(createdAt, '%Y-%m') AS period,
             COALESCE(SUM(CASE WHEN paymentStatus = 'PAID' THEN total ELSE 0 END), 0) AS revenue,
             COUNT(*) AS orders,
             SUM(CASE WHEN paymentStatus = 'PAID' THEN 1 ELSE 0 END) AS successfulOrders
      FROM \`Order\` WHERE createdAt >= ${since} AND createdAt < ${until}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m') ORDER BY period`;
  },
  listGiftCards({ where, skip, take }) { return prisma.giftCard.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }); },
  countGiftCards(where) { return prisma.giftCard.count({ where }); },
  findGiftCard(id) { return prisma.giftCard.findUnique({ where: { id } }); },
  createGiftCard(data) { return prisma.giftCard.create({ data }); },
  updateGiftCard(id, data) { return prisma.giftCard.update({ where: { id }, data }); },
  listGifts({ where, skip, take }) { return prisma.gift.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }); },
  countGifts(where) { return prisma.gift.count({ where }); },
  findGift(id) { return prisma.gift.findUnique({ where: { id } }); },
  createGift(data) { return prisma.gift.create({ data }); },
  updateGift(id, data) { return prisma.gift.update({ where: { id }, data }); },
};

const customerSelect = {
  id: true, name: true, email: true, phone: true, address: true, status: true,
  points: true, membershipLevel: true, createdAt: true, updatedAt: true,
  _count: { select: { orders: true, reviews: true } },
};
