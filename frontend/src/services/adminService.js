import api from './api.js';

export const adminService = {
  dashboard: () => api.get('/admin/dashboard'),
  resource: (name, params) => api.get(`/admin/${name}`, { params }),
  create: (name, payload) => api.post(`/admin/${name}`, payload),
  update: (name, id, payload) => api.patch(`/admin/${name}/${encodeURIComponent(id)}`, payload),
  remove: (name, id) => api.delete(`/admin/${name}/${encodeURIComponent(id)}`),
  updateOrderStatus: (id, orderStatus) => api.patch(`/admin/orders/${encodeURIComponent(id)}/status`, { orderStatus }),
  orderDetails: (id) => api.get(`/admin/orders/${encodeURIComponent(id)}`),
  customerDetails: (id) => api.get(`/admin/customers/${encodeURIComponent(id)}`),
  lockCustomer: (id) => api.patch(`/admin/customers/${encodeURIComponent(id)}/lock`),
  unlockCustomer: (id) => api.patch(`/admin/customers/${encodeURIComponent(id)}/unlock`),
  approveReview: (id) => api.patch(`/admin/reviews/${encodeURIComponent(id)}/approve`),
  hideReview: (id) => api.patch(`/admin/reviews/${encodeURIComponent(id)}/hide`),
  activatePromotion: (id) => api.patch(`/admin/promotions/${encodeURIComponent(id)}/activate`),
  deactivatePromotion: (id) => api.patch(`/admin/promotions/${encodeURIComponent(id)}/deactivate`),
};
