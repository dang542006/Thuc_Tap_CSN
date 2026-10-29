import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

function createRepository(db) {
  return {
    findCatalogBookIds({ search, categoryId, categoryIds, brand, minPrice, maxPrice, minRating, priceSort, bestSelling }) {
      const conditions = [Prisma.sql`b.status = 'ACTIVE'`];
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(Prisma.sql`(b.title LIKE ${pattern} OR b.author LIKE ${pattern} OR b.brand LIKE ${pattern} OR b.description LIKE ${pattern})`);
      }
      if (categoryId) conditions.push(categoryIds?.length
        ? Prisma.sql`b.categoryId IN (${Prisma.join(categoryIds)})`
        : Prisma.sql`b.categoryId = ${categoryId}`);
      if (brand) conditions.push(Prisma.sql`b.brand LIKE ${`%${brand}%`}`);

      const effectivePrice = Prisma.sql`CASE
        WHEN b.discountPrice IS NOT NULL AND b.discountPrice > 0 AND b.discountPrice < b.price
        THEN b.discountPrice ELSE b.price END`;
      if (minPrice !== undefined) conditions.push(Prisma.sql`${effectivePrice} >= ${minPrice}`);
      if (maxPrice !== undefined) conditions.push(Prisma.sql`${effectivePrice} <= ${maxPrice}`);

      const having = minRating === undefined
        ? Prisma.empty
        : Prisma.sql`HAVING ROUND(AVG(r.rating), 1) >= ${minRating}`;
      const priceOrder = bestSelling
        ? Prisma.sql`ORDER BY (SELECT COALESCE(SUM(oi.quantity), 0) FROM OrderItem oi JOIN \`Order\` o ON o.id = oi.orderId WHERE oi.bookId = b.id AND o.orderStatus = 'DELIVERED' AND o.paymentStatus NOT IN ('REFUNDED', 'FAILED')) DESC, b.id ASC`
        : priceSort === 'price_asc'
        ? Prisma.sql`ORDER BY effectivePrice ASC, b.id ASC`
        : priceSort === 'price_desc'
          ? Prisma.sql`ORDER BY effectivePrice DESC, b.id ASC`
          : Prisma.empty;

      return db.$queryRaw(Prisma.sql`
        SELECT b.id AS id, ${effectivePrice} AS effectivePrice
        FROM Book AS b
        LEFT JOIN Review AS r ON r.bookId = b.id AND r.status = 'ACTIVE'
        WHERE ${Prisma.join(conditions, ' AND ')}
        GROUP BY b.id, b.price, b.discountPrice
        ${having}
        ${priceOrder}
      `);
    },
    listBooks({ where, orderBy, skip, take }) {
      return db.book.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          reviews: { where: { status: 'ACTIVE' }, select: { rating: true } },
          _count: { select: { reviews: { where: { status: 'ACTIVE' } } } },
        },
      });
    },
    countBooks(where) { return db.book.count({ where }); },
    async findBookForReview(reference) {
      const value = String(reference).trim();
      const exact = await db.book.findFirst({
        where: { OR: [{ id: value }, { slug: value }, { isbn: value }] },
        select: { id: true, status: true },
      });
      if (exact) return exact;
      const isbn = value.replace(/[\s\-\u2010-\u2015]/g, '').toUpperCase();
      if (!/^(?:\d{13}|\d{9}[\dX])$/.test(isbn)) return null;
      const books = await db.$queryRaw(Prisma.sql`
        SELECT id, status FROM Book
        WHERE UPPER(REPLACE(REPLACE(isbn, '-', ''), ' ', '')) = ${isbn}
        LIMIT 2
      `);
      // Never associate a review with an arbitrary edition if legacy ISBNs collide.
      return books.length === 1 ? books[0] : null;
    },
    findBook(idOrSlug) {
      return db.book.findFirst({
        where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          reviews: { where: { status: 'ACTIVE' }, select: { rating: true } },
          _count: { select: { reviews: { where: { status: 'ACTIVE' } } } },
          optionGroups: { include: { items: true }, orderBy: { createdAt: 'asc' } },
        },
      });
    },
    findCategoryById(id) { return db.category.findUnique({ where: { id } }); },
    listCategories() {
      return db.$queryRaw(Prisma.sql`
        SELECT c.id, c.name, c.slug, c.description, c.parentId,
          CAST(COUNT(b.id) AS UNSIGNED) AS directCount
        FROM Category c
        LEFT JOIN Book b ON b.categoryId = c.id AND b.status = 'ACTIVE'
        WHERE c.status = 'ACTIVE'
        GROUP BY c.id, c.name, c.slug, c.description, c.parentId
        ORDER BY c.name ASC
      `).then((rows) => rows.map(({ directCount, ...category }) => ({
        ...category, _count: { books: Number(directCount) },
      })));
    },
    async categoryIdsIncludingChildren(reference) {
      const categories = await db.$queryRaw(Prisma.sql`SELECT id, parentId, slug FROM Category WHERE status = 'ACTIVE'`);
      const selected = categories.find((category) => category.id === reference || category.slug === reference);
      if (!selected) return [reference];
      const ids = new Set([selected.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const category of categories) {
          if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
            ids.add(category.id);
            changed = true;
          }
        }
      }
      return [...ids];
    },
    findCartByUser(userId) {
      return db.cart.findUnique({
        where: { userId },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
            include: {
              book: { include: { category: { select: { id: true, name: true, slug: true } }, optionGroups: { include: { items: true } } } },
            },
          },
        },
      });
    },
    createCart(userId) { return db.cart.create({ data: { userId } }); },
    findCartItems(cartId, bookId) { return db.cartItem.findMany({ where: { cartId, bookId }, orderBy: { createdAt: 'asc' } }); },
    createCartItem(data) { return db.cartItem.create({ data }); },
    updateCartItem(id, quantity) { return db.cartItem.update({ where: { id }, data: { quantity } }); },
    deleteCartItem(id) { return db.cartItem.delete({ where: { id } }); },
    clearCartItems(cartId) { return db.cartItem.deleteMany({ where: { cartId } }); },
    clearCartBooks(cartId, bookIds) { return db.cartItem.deleteMany({ where: { cartId, bookId: { in: bookIds } } }); },
    clearCartItemIds(cartId, itemIds) { return db.cartItem.deleteMany({ where: { cartId, id: { in: itemIds } } }); },
    findBookForPurchase(id) { return db.book.findUnique({ where: { id }, include: { optionGroups: { include: { items: true } } } }); },
    findPromotionByCode(code) { return db.promotion.findUnique({ where: { code } }); },
    listActivePromotions(now) {
      return db.promotion.findMany({
        where: { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gte: now } },
        orderBy: { endsAt: 'asc' },
        select: { id: true, code: true, name: true, description: true, discountType: true, discountValue: true, minOrderAmount: true, startsAt: true, endsAt: true },
      });
    },
    reservePromotion(id, usageLimit) {
      const where = { id, status: 'ACTIVE' };
      if (usageLimit !== null) where.usedCount = { lt: usageLimit };
      return db.promotion.updateMany({
        where,
        data: { usedCount: { increment: 1 } },
      });
    },
    releasePromotion(id) {
      return db.promotion.updateMany({ where: { id, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    },
    decrementStock(bookId, quantity) {
      return db.book.updateMany({ where: { id: bookId, status: 'ACTIVE', stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
    },
    incrementStock(bookId, quantity) {
      return db.book.update({ where: { id: bookId }, data: { stock: { increment: quantity } } });
    },
    createOrder(data) { return db.order.create({ data, include: { items: true, payments: true } }); },
    createPayment(data) { return db.payment.create({ data }); },
    findOrderForUser(id, userId) {
      return db.order.findFirst({ where: { id, userId }, include: { items: true, payments: true, promotion: true, statusHistory: { orderBy: { createdAt: 'asc' } } } });
    },
    findOrderById(id) {
      return db.order.findUnique({ where: { id }, include: { items: true, payments: true, promotion: true } });
    },
    findOrderByNumber(orderNumber) {
      return db.order.findUnique({ where: { orderNumber }, include: { items: true, payments: true, promotion: true } });
    },
    findOrderForTracking(orderNumber, phone) {
      return db.order.findFirst({
        where: { orderNumber, receiverPhone: phone },
        select: { orderNumber: true, orderStatus: true, paymentStatus: true, paymentMethod: true, total: true, receiverName: true, receiverPhone: true, shippingAddress: true, createdAt: true, updatedAt: true, items: true, statusHistory: { orderBy: { createdAt: 'asc' }, select: { status: true, description: true, createdAt: true } } },
      });
    },
    createOrderStatusHistory(data) { return db.orderStatusHistory.create({ data }); },
    updatePaymentResult(orderId, status, transactionRef) {
      return db.payment.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status, ...(transactionRef ? { transactionRef } : {}), ...(status === 'PAID' ? { paidAt: new Date() } : {}) },
      });
    },
    listOrdersForUser(userId, { skip, take }) {
      return db.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take, include: { items: true } });
    },
    countOrdersForUser(userId) { return db.order.count({ where: { userId } }); },
    updateOrder(id, data) { return db.order.update({ where: { id }, data, include: { items: true, payments: true } }); },
    updateOrderPaymentsStatus(orderId, status) { return db.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status } }); },
    hasDeliveredBookPurchase(userId, bookId) {
      return db.orderItem.findFirst({ where: { bookId, order: { userId, orderStatus: 'DELIVERED' } }, select: { id: true } });
    },
    listReviews({ bookId, userId, skip, take, includeInactive = false }) {
      return db.review.findMany({
        where: { ...(!includeInactive ? { status: 'ACTIVE' } : {}), ...(bookId ? { bookId } : {}), ...(userId ? { userId } : {}) },
        orderBy: { createdAt: 'desc' }, skip, take,
        include: { user: { select: { id: true, name: true } }, book: { select: { id: true, title: true, slug: true } } },
      });
    },
    countReviews(where, includeInactive = false) { return db.review.count({ where: { ...where, ...(!includeInactive ? { status: 'ACTIVE' } : {}) } }); },
    upsertReview({ userId, bookId, rating, comment }) {
      return db.review.upsert({
        where: { userId_bookId: { userId, bookId } },
        create: { userId, bookId, rating, comment, status: 'INACTIVE' },
        update: { rating, comment: comment ?? null, status: 'INACTIVE' },
        include: { book: { select: { id: true, title: true, slug: true } } },
      });
    },
    findUser(id) { return db.user.findUnique({ where: { id } }); },
    findPublicUser(id) { return db.user.findUnique({ where: { id }, select: publicUserSelect }); },
    listAddresses(userId) { return db.address.findMany({ where: { userId }, orderBy: [{ defaultAddress: 'desc' }, { createdAt: 'asc' }] }); },
    defaultAddress(userId) { return db.address.findFirst({ where: { userId, defaultAddress: true } }); },
    findAddress(userId, id) { return db.address.findFirst({ where: { id, userId } }); },
    createAddress(userId, data) { return db.address.create({ data: { ...data, userId } }); },
    updateAddress(userId, id, data) { return db.address.update({ where: { id, userId }, data }); },
    deleteAddress(userId, id) { return db.address.delete({ where: { id, userId } }); },
    clearDefaultAddresses(userId) { return db.address.updateMany({ where: { userId, defaultAddress: true }, data: { defaultAddress: false } }); },
    firstAddress(userId) { return db.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }); },
    findReview(userId, bookId) { return db.review.findUnique({ where: { userId_bookId: { userId, bookId } } }); },
    listFavorites(userId) {
      return db.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { book: { include: { category: { select: { id: true, name: true, slug: true } } } } } });
    },
    findFavorite(userId, bookId) { return db.favorite.findUnique({ where: { userId_bookId: { userId, bookId } } }); },
    createFavorite(userId, bookId) { return db.favorite.create({ data: { userId, bookId } }); },
    deleteFavorite(userId, bookId) { return db.favorite.delete({ where: { userId_bookId: { userId, bookId } } }); },
    updateUser(id, data) {
      return db.user.update({ where: { id }, data, select: publicUserSelect });
    },
    getMembership(userId) {
      return db.user.findUnique({
        where: { id: userId },
        select: { id: true, points: true, membershipLevel: true },
      });
    },
    listMembershipTiers() { return db.membership.findMany({ where: { status: 'ACTIVE' }, orderBy: { minPoints: 'asc' } }); },
    updateMembershipPoints(userId, points, membershipLevel) {
      return db.user.update({ where: { id: userId }, data: { points, membershipLevel } });
    },
    transaction(callback) {
      return db.$transaction((tx) => callback(createRepository(tx)), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },
  };
}

const publicUserSelect = {
  id: true, name: true, email: true, phone: true, address: true, role: true,
  status: true, points: true, membershipLevel: true, createdAt: true, updatedAt: true,
};

export const customerRepository = createRepository(prisma);
