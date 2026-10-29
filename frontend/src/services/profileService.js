import api from './api.js';

export const profileService = {
  get: () => api.get('/users/me'),
  update: (payload) => api.patch('/users/me', payload),
  changePassword: (payload) => api.patch('/users/me/password', payload),
  listAddresses: () => api.get('/users/me/addresses'),
  createAddress: (payload) => api.post('/users/me/addresses', payload),
  updateAddress: (id, payload) => api.patch(`/users/me/addresses/${encodeURIComponent(id)}`, payload),
  deleteAddress: (id) => api.delete(`/users/me/addresses/${encodeURIComponent(id)}`),
  setDefaultAddress: (id) => api.patch(`/users/me/addresses/${encodeURIComponent(id)}/default`),
};
