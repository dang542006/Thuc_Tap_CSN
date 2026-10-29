import { randomUUID } from 'node:crypto';
import { customerRepository } from '../repositories/customer.repository.js';
import { FREE_SHIPPING_THRESHOLD, MEMBERSHIP_POINTS_PER_10000, ORDER_TRANSITIONS, STANDARD_SHIPPING_FEE } from '../constants/commerce.js';
import { AppError } from '../utils/AppError.js';
import { vnpayService } from './vnpay.service.js';

function toCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) throw new AppError('Invalid monetary value in catalog', 422, 'INVALID_PRICE');
  return Math.round(numeric * 100);
}

function fromCents(value) { return (value / 100).toFixed(2); }

function effectiveUnitPrice(book) {
  const base = toCents(book.price);
  const discounted = book.discountPrice == null ? null : toCents(book.discountPrice);
  return discounted !== null && discounted > 0 && discounted < base ? discounted : base;
}

function calculatePromotion(promotion, subtotalCents, now = new Date()) {
  if (!promotion || promotion.status !== 'ACTIVE' || promotion.startsAt > now || promotion.endsAt < now) {
    throw new AppError('Promotion code is invalid or expired', 422, 'INVALID_PROMOTION');
  }
  if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
    throw new AppError('Promotion usage limit has been reached', 409, 'PROMOTION_EXHAUSTED');
  }
  if (subtotalCents < toCents(promotion.minOrderAmount)) {
    throw new AppError('Order does not meet the promotion minimum amount', 422, 'PROMOTION_MINIMUM_NOT_MET');
  }
  const value = Number(promotion.discountValue);
  const amount = promotion.discountType === 'PERCENTAGE'
    ? Math.round(subtotalCents * value / 100)
    : toCents(promotion.discountValue);
  return Math.min(subtotalCents, Math.max(0, amount));
}

function nextMembershipLevel(points, tiers) {
  const tier = [...tiers].sort((a, b) => a.minPoints - b.minPoints).filter((item) => item.minPoints <= points).at(-1);
  return tier?.level ?? 'BRONZE';
}

function orderNumber() {
  return `BS-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export const orderService = {
  async checkout(userId, { receiverName, shippingAddress, receiverPhone, paymentMethod, promotionCode }, ipAddress) {
    if (paymentMethod === 'VNPAY' && !vnpayService.isConfigured()) {
      throw new AppError('Thanh toán VNPAY chưa được cấu hình. Hãy bổ sung thông tin kết nối VNPAY.', 503, 'VNPAY_NOT_CONFIGURED');
    }
    const order = await customerRepository.transaction(async (repository) => {
      const cart = await repository.findCartByUser(userId);
      if (!cart?.items?.length) throw new AppError('Your cart is empty', 422, 'EMPTY_CART');

      let subtotalCents = 0;
      const orderItems = [];
      for (const item of cart.items) {
        const book = item.book;
        if (!book || book.status !== 'ACTIVE') throw new AppError('A book in your cart is no longer available', 409, 'BOOK_UNAVAILABLE');
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new AppError('Cart contains an invalid quantity', 422, 'INVALID_QUANTITY');
        if (item.quantity > book.stock) throw new AppError(`${book.title} has only ${book.stock} copies available`, 409, 'INSUFFICIENT_STOCK');
        const requestedOptions = new Map();
        for (const selected of item.selectedOptions ?? []) {
          const current = requestedOptions.get(selected.groupId) ?? [];
          current.push(selected.optionItemId);
          requestedOptions.set(selected.groupId, current);
        }
        for (const group of book.optionGroups ?? []) {
          const ids = requestedOptions.get(group.id) ?? [];
          if (group.required && !ids.length) throw new AppError(`Choose an option for ${group.groupName} before checkout`, 409, 'REQUIRED_PRODUCT_OPTION');
          if (ids.length > group.maxChoose) throw new AppError(`Too many choices for ${group.groupName}`, 409, 'INVALID_PRODUCT_OPTION');
        }
        if ([...requestedOptions.keys()].some((groupId) => !(book.optionGroups ?? []).some((group) => group.id === groupId))) {
          throw new AppError('A configuration in the cart is no longer available', 409, 'PRODUCT_OPTION_UNAVAILABLE');
        }
        const selectedSpecs = [];
        for (const [groupId, optionIds] of requestedOptions) {
          const group = book.optionGroups.find((item) => item.id === groupId);
          for (const optionId of optionIds) {
            const option = group.items.find((item) => item.id === optionId);
            if (!option) throw new AppError('A configuration in the cart is no longer available', 409, 'PRODUCT_OPTION_UNAVAILABLE');
            selectedSpecs.push({ groupId, groupName: group.groupName, optionItemId: option.id, optionName: option.optionName, extraCost: Number(option.extraCost) });
          }
        }
        const unitPriceCents = effectiveUnitPrice(book) + selectedSpecs.reduce((sum, option) => sum + toCents(option.extraCost), 0);
        const lineCents = unitPriceCents * item.quantity;
        subtotalCents += lineCents;
        orderItems.push({ bookId: book.id, cartItemId: item.id, title: book.title, quantity: item.quantity, unitPrice: fromCents(unitPriceCents), subtotal: fromCents(lineCents), selectedSpecs });
      }

      let promotion = null;
      let discountCents = 0;
      if (promotionCode) {
        promotion = await repository.findPromotionByCode(promotionCode.trim().toUpperCase());
        discountCents = calculatePromotion(promotion, subtotalCents);
        const reserved = await repository.reservePromotion(promotion.id, promotion.usageLimit);
        if (reserved.count !== 1) throw new AppError('Promotion usage limit has been reached', 409, 'PROMOTION_EXHAUSTED');
      }

      const shippingCents = subtotalCents >= FREE_SHIPPING_THRESHOLD * 100 ? 0 : STANDARD_SHIPPING_FEE * 100;
      const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents);

      for (const item of cart.items) {
        const updated = await repository.decrementStock(item.bookId, item.quantity);
        if (updated.count !== 1) throw new AppError(`${item.book.title} no longer has enough stock`, 409, 'INSUFFICIENT_STOCK');
      }

      const order = await repository.createOrder({
        orderNumber: orderNumber(),
        userId,
        subtotal: fromCents(subtotalCents),
        discount: fromCents(discountCents),
        shippingFee: fromCents(shippingCents),
        total: fromCents(totalCents),
        shippingAddress: shippingAddress.trim(),
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        paymentMethod,
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        promotionId: promotion?.id,
        items: { create: orderItems },
        statusHistory: { create: { status: 'PENDING', description: 'Đơn hàng đã được tạo và đang chờ xác nhận.' } },
      });

      await repository.createPayment({
        orderId: order.id,
        method: paymentMethod,
        status: 'PENDING',
        amount: fromCents(totalCents),
      });
      if (paymentMethod === 'COD') await repository.clearCartItems(cart.id);

      const pointsEarned = Math.floor((totalCents / 100) / 10000) * MEMBERSHIP_POINTS_PER_10000;
      if (pointsEarned > 0) {
        const user = await repository.findUser(userId);
        const tiers = await repository.listMembershipTiers();
        const points = user.points + pointsEarned;
        await repository.updateMembershipPoints(userId, points, nextMembershipLevel(points, tiers));
      }

      const completedOrder = await repository.findOrderForUser(order.id, userId);
      return { ...completedOrder, pointsEarned, paymentPending: true };
    });
    if (paymentMethod !== 'VNPAY') return order;
    return { ...order, paymentUrl: vnpayService.createPaymentUrl(order, ipAddress) };
  },

  async track(orderNumber, phone) {
    const order = await customerRepository.findOrderForTracking(orderNumber.trim(), phone.trim());
    if (!order) throw new AppError('Sai thông tin đơn hàng.', 404, 'ORDER_TRACKING_NOT_FOUND');
    return order;
  },

  async resolveVnpayResult(params) {
    if (!vnpayService.verifyCallback(params)) throw new AppError('Chữ ký phản hồi VNPAY không hợp lệ.', 400, 'INVALID_VNPAY_SIGNATURE');
    const orderNumberValue = String(params.vnp_TxnRef ?? '');
    const order = await customerRepository.transaction(async (repository) => {
      const existing = await repository.findOrderByNumber(orderNumberValue);
      if (!existing) throw new AppError('Không tìm thấy đơn hàng VNPAY.', 404, 'ORDER_NOT_FOUND');
      if (existing.paymentStatus !== 'PENDING') return existing;
      const success = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
      if (success) {
        await repository.updatePaymentResult(existing.id, 'PAID', String(params.vnp_TransactionNo ?? ''));
        await repository.updateOrder(existing.id, { paymentStatus: 'PAID' });
        const cart = await repository.findCartByUser(existing.userId);
        if (cart) await repository.clearCartItemIds(cart.id, existing.items.map((item) => item.cartItemId).filter(Boolean));
      } else {
        for (const item of existing.items) await repository.incrementStock(item.bookId, item.quantity);
        if (existing.promotionId) await repository.releasePromotion(existing.promotionId);
        await repository.updatePaymentResult(existing.id, 'FAILED', String(params.vnp_TransactionNo ?? ''));
        const pointsToReverse = Math.floor((toCents(existing.total) / 100) / 10000) * MEMBERSHIP_POINTS_PER_10000;
        if (pointsToReverse > 0) {
          const user = await repository.findUser(existing.userId);
          const tiers = await repository.listMembershipTiers();
          const points = Math.max(0, user.points - pointsToReverse);
          await repository.updateMembershipPoints(existing.userId, points, nextMembershipLevel(points, tiers));
        }
        const cancelled = await repository.updateOrder(existing.id, { orderStatus: 'CANCELLED', paymentStatus: 'FAILED' });
        await repository.createOrderStatusHistory({ orderId: existing.id, status: 'CANCELLED', description: 'Giao dịch VNPAY thất bại hoặc bị hủy.' });
        return cancelled;
      }
      return repository.findOrderById(existing.id);
    });
    return { order, success: order.paymentStatus === 'PAID' };
  },

  async list(userId, query = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 10));
    const [items, total] = await Promise.all([
      customerRepository.listOrdersForUser(userId, { skip: (page - 1) * limit, take: limit }),
      customerRepository.countOrdersForUser(userId),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async get(userId, orderId) {
    const order = await customerRepository.findOrderForUser(orderId, userId);
    if (!order) throw new AppError('Order was not found', 404, 'ORDER_NOT_FOUND');
    return order;
  },

  async cancel(userId, orderId) {
    return customerRepository.transaction(async (repository) => {
      const order = await repository.findOrderForUser(orderId, userId);
      if (!order) throw new AppError('Order was not found', 404, 'ORDER_NOT_FOUND');
      if (!['PENDING', 'CONFIRMED'].includes(order.orderStatus) || order.paymentStatus === 'PAID') {
        throw new AppError('This order can no longer be cancelled', 409, 'ORDER_CANNOT_BE_CANCELLED');
      }
      for (const item of order.items) await repository.incrementStock(item.bookId, item.quantity);
      if (order.promotionId) await repository.releasePromotion(order.promotionId);
      await repository.updateOrderPaymentsStatus(order.id, 'FAILED');
      await repository.updateOrder(order.id, { orderStatus: 'CANCELLED', paymentStatus: 'FAILED' });
      await repository.createOrderStatusHistory({ orderId: order.id, status: 'CANCELLED', description: 'Khách hàng đã hủy đơn hàng.' });

      const pointsToReverse = Math.floor((toCents(order.total) / 100) / 10000) * MEMBERSHIP_POINTS_PER_10000;
      if (pointsToReverse > 0) {
        const user = await repository.findUser(userId);
        const tiers = await repository.listMembershipTiers();
        const points = Math.max(0, user.points - pointsToReverse);
        await repository.updateMembershipPoints(userId, points, nextMembershipLevel(points, tiers));
      }
      return { cancelled: true, id: order.id };
    });
  },

  async updateStatusAsAdmin(orderId, nextStatus) {
    return customerRepository.transaction(async (repository) => {
      const order = await repository.findOrderById(orderId);
      if (!order) throw new AppError('Order was not found', 404, 'ORDER_NOT_FOUND');
      if (!(ORDER_TRANSITIONS[order.orderStatus] || []).includes(nextStatus)) {
        throw new AppError(`Cannot transition order from ${order.orderStatus} to ${nextStatus}`, 409, 'INVALID_ORDER_TRANSITION');
      }
      if (nextStatus === 'CANCELLED' && order.paymentStatus === 'PAID') {
        throw new AppError('A paid order must be refunded before it can be cancelled', 409, 'REFUND_REQUIRED');
      }
      if (nextStatus === 'DELIVERED' && order.paymentMethod !== 'COD' && order.paymentStatus !== 'PAID') {
        throw new AppError('The order must be paid before it can be marked delivered', 409, 'PAYMENT_REQUIRED');
      }

      const update = { orderStatus: nextStatus };
      if (nextStatus === 'CANCELLED') {
        for (const item of order.items) await repository.incrementStock(item.bookId, item.quantity);
        if (order.promotionId) await repository.releasePromotion(order.promotionId);
        await repository.updateOrderPaymentsStatus(order.id, 'FAILED');
        update.paymentStatus = 'FAILED';

        const pointsToReverse = Math.floor((toCents(order.total) / 100) / 10000) * MEMBERSHIP_POINTS_PER_10000;
        if (pointsToReverse > 0) {
          const user = await repository.findUser(order.userId);
          const tiers = await repository.listMembershipTiers();
          const points = Math.max(0, user.points - pointsToReverse);
          await repository.updateMembershipPoints(order.userId, points, nextMembershipLevel(points, tiers));
        }
      }
      if (nextStatus === 'DELIVERED' && order.paymentMethod === 'COD') {
        await repository.updateOrderPaymentsStatus(order.id, 'PAID');
        update.paymentStatus = 'PAID';
      }
      const updated = await repository.updateOrder(order.id, update);
      await repository.createOrderStatusHistory({ orderId: order.id, status: nextStatus, description: `Admin cập nhật trạng thái đơn hàng: ${nextStatus}.` });
      return updated;
    });
  },

  async validatePromotion(userId, code) {
    const cart = await customerRepository.findCartByUser(userId);
    if (!cart?.items?.length) throw new AppError('Your cart is empty', 422, 'EMPTY_CART');
    const subtotalCents = cart.items.reduce((sum, item) => sum + effectiveUnitPrice(item.book) * item.quantity, 0);
    const promotion = await customerRepository.findPromotionByCode(code.trim().toUpperCase());
    const discountCents = calculatePromotion(promotion, subtotalCents);
    return { code: promotion.code, name: promotion.name, discount: fromCents(discountCents), subtotal: fromCents(subtotalCents) };
  },
};
