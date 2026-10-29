import api from './api.js';

export const categoryService = {
  list: (params) => api.get('/categories', { params }),
};
