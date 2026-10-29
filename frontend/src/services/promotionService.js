import api from './api.js';

export const promotionService = {
  active: () => api.get('/promotions/active'),
  validate: (code) => api.post('/promotions/validate', { code }),
};
