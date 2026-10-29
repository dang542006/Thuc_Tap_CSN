import { customerRepository } from '../repositories/customer.repository.js';
import { AppError } from '../utils/AppError.js';

function effectiveUnitPrice(book) {
  const basePrice = Number(book.price);
  const discountedPrice = book.discountPrice == null ? null : Number(book.discountPrice);
  return Number.isFinite(discountedPrice) && discountedPrice > 0 && discountedPrice < basePrice
    ? discountedPrice
    : basePrice;
}

function optionSurcharge(selectedOptions = []) {
  return selectedOptions.reduce((total, option) => total + Number(option.extraCost || 0), 0);
}

function normalizeOptions(book, requested = []) {
  const groups = book.optionGroups ?? [];
  const byGroup = new Map();
  for (const selection of requested) {
    if (byGroup.has(selection.groupId)) throw new AppError('Each configuration group can only be selected once', 422, 'DUPLICATE_OPTION_GROUP');
    byGroup.set(selection.groupId, selection.optionItemIds);
  }
  for (const groupId of byGroup.keys()) {
    if (!groups.some((group) => group.id === groupId)) throw new AppError('A selected configuration is not available for this product', 422, 'INVALID_PRODUCT_OPTION');
  }
  const selected = [];
  for (const group of groups) {
    const ids = byGroup.get(group.id) ?? [];
    if (new Set(ids).size !== ids.length) throw new AppError('Duplicate configuration choices are not allowed', 422, 'DUPLICATE_PRODUCT_OPTION');
    if (group.required && !ids.length) throw new AppError(`Choose an option for ${group.groupName}`, 422, 'REQUIRED_PRODUCT_OPTION');
    if (ids.length > group.maxChoose) throw new AppError(`Choose no more than ${group.maxChoose} option(s) for ${group.groupName}`, 422, 'TOO_MANY_PRODUCT_OPTIONS');
    for (const id of ids) {
      const item = group.items.find((option) => option.id === id);
      if (!item) throw new AppError('A selected configuration is no longer available', 409, 'PRODUCT_OPTION_UNAVAILABLE');
      selected.push({ groupId: group.id, groupName: group.groupName, optionItemId: item.id, optionName: item.optionName, extraCost: Number(item.extraCost) });
    }
  }
  return selected;
}

function sameOptions(left = [], right = []) {
  const ids = (items) => items.map((item) => item.optionItemId).sort();
  return JSON.stringify(ids(left)) === JSON.stringify(ids(right));
}

async function getOrCreateCart(repository, userId) {
  let cart = await repository.findCartByUser(userId);
  if (!cart) {
    try { await repository.createCart(userId); }
    catch (error) { if (error?.code !== 'P2002') throw error; }
    cart = await repository.findCartByUser(userId);
  }
  return cart;
}

export const cartService = {
  async getCart(userId) {
    const cart = await getOrCreateCart(customerRepository, userId);
    const items = cart.items.map((item) => ({
      ...item,
      selectedOptions: item.selectedOptions ?? [],
      unitPrice: effectiveUnitPrice(item.book) + optionSurcharge(item.selectedOptions ?? []),
      lineSubtotal: (effectiveUnitPrice(item.book) + optionSurcharge(item.selectedOptions ?? [])) * item.quantity,
    }));
    return { ...cart, items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
  },

  async addToCart(userId, bookId, quantity, requestedOptions = []) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new AppError('Quantity must be a positive integer', 422, 'INVALID_QUANTITY');
    return customerRepository.transaction(async (repository) => {
      const book = await repository.findBookForPurchase(bookId);
      if (!book || book.status !== 'ACTIVE') throw new AppError('Book was not found', 404, 'BOOK_NOT_FOUND');
      const selectedOptions = normalizeOptions(book, requestedOptions);
      const cart = await getOrCreateCart(repository, userId);
      const existingItems = await repository.findCartItems(cart.id, bookId);
      const existing = existingItems.find((item) => sameOptions(item.selectedOptions ?? [], selectedOptions));
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      const totalBookQuantity = existingItems.reduce((sum, item) => sum + item.quantity, 0) + quantity;
      if (totalBookQuantity > book.stock) throw new AppError(`Only ${book.stock} copies are available`, 409, 'INSUFFICIENT_STOCK');
      const item = existing
        ? await repository.updateCartItem(existing.id, nextQuantity)
        : await repository.createCartItem({ cartId: cart.id, bookId, quantity, selectedOptions });
      const unitPrice = effectiveUnitPrice(book) + optionSurcharge(selectedOptions);
      return { ...item, book, selectedOptions, unitPrice, lineSubtotal: unitPrice * nextQuantity };
    });
  },

  async updateQuantity(userId, itemId, quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new AppError('Quantity must be a positive integer', 422, 'INVALID_QUANTITY');
    return customerRepository.transaction(async (repository) => {
      const cart = await getOrCreateCart(repository, userId);
      const item = cart.items.find((cartItem) => cartItem.id === itemId);
      if (!item) throw new AppError('Cart item was not found', 404, 'CART_ITEM_NOT_FOUND');
      if (item.book.status !== 'ACTIVE') throw new AppError('This book is no longer available', 409, 'BOOK_UNAVAILABLE');
      const totalBookQuantity = cart.items.filter((line) => line.bookId === item.bookId).reduce((sum, line) => sum + line.quantity, 0) - item.quantity + quantity;
      if (totalBookQuantity > item.book.stock) throw new AppError(`Only ${item.book.stock} copies are available`, 409, 'INSUFFICIENT_STOCK');
      return repository.updateCartItem(itemId, quantity);
    });
  },

  async removeFromCart(userId, itemId) {
    const cart = await getOrCreateCart(customerRepository, userId);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);
    if (!item) throw new AppError('Cart item was not found', 404, 'CART_ITEM_NOT_FOUND');
    await customerRepository.deleteCartItem(itemId);
    return { removed: true, itemId };
  },

  async clearCart(userId) {
    const cart = await getOrCreateCart(customerRepository, userId);
    await customerRepository.clearCartItems(cart.id);
    return { cleared: true };
  },
};
