import api from './api.js';

export const newsletterService = {
  subscribe: (email) => api.post('/newsletter/subscribe', { email }),
};
