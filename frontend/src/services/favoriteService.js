import api from './api.js';

export const favoriteService = {
  list: async () => (await api.get('/users/me/favorites')).data.data,
  toggle: async (bookId) => (await api.put(`/users/me/favorites/${encodeURIComponent(bookId)}`)).data?.data,
};
