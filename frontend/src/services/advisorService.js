import api from './api.js';

export const advisorService = {
  reply: async (messages, signal) => (await api.post('/advisor', { messages }, { signal })).data.data,
};
