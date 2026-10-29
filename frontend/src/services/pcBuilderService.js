import api from './api.js';

export const pcBuilderService = {
  catalog: async () => (await api.get('/pc-builder/catalog')).data.data,
  check: async (selections) => (await api.post('/pc-builder/check', { selections })).data.data,
  advise: async (request) => (await api.post('/pc-builder/advice', request)).data.data,
};
