import api from './api.js';

export const cartService = {
  get: () => api.get('/cart'),
  addItem: (bookId, quantity = 1, selectedOptions = []) => api.post('/cart/items', { bookId, quantity, selectedOptions }),
  updateItem: (itemId, quantity) => api.patch(`/cart/items/${encodeURIComponent(itemId)}`, { quantity }),
  removeItem: (itemId) => api.delete(`/cart/items/${encodeURIComponent(itemId)}`),
  clear: () => api.delete('/cart'),
};
