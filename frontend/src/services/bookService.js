import api from './api.js';

export const bookService = {
  list: (params) => api.get('/books', { params }),
  get: (idOrSlug) => api.get(`/books/${encodeURIComponent(idOrSlug)}`),
  related: (idOrSlug) => api.get(`/books/${encodeURIComponent(idOrSlug)}/related`),
};
