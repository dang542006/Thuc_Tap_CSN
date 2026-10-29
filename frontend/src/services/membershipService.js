import api from './api.js';

export const membershipService = {
  getMine: () => api.get('/membership/me'),
  getTiers: () => api.get('/membership/tiers'),
};
