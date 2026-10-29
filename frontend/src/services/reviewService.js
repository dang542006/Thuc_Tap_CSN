import api from './api.js';

export const reviewService = {
  listPublic: (params) => api.get('/reviews', { params }),
  listMine: (params) => api.get('/reviews/mine', { params }),
  create: (payload) => api.post('/reviews', payload),
  update: (id, payload) => api.patch(`/reviews/${encodeURIComponent(id)}`, payload),
};
