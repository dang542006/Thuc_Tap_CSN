import axios from 'axios';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '../constants/api.js';
import { getErrorMessage } from '../utils/apiData.js';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    if (typeof config.headers?.set === 'function') config.headers.set('Authorization', `Bearer ${token}`);
    else config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const messages = {
      401: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      403: 'Bạn không có quyền thực hiện thao tác này.',
      404: 'Không tìm thấy dữ liệu được yêu cầu.',
      500: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
    };
    error.userMessage = error.response?.data?.message || messages[status] || getErrorMessage(error);

    if (status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bookshop:unauthorized'));
    }
    if ([403, 404, 500].includes(status) && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bookshop:api-error', {
        detail: { status, message: error.userMessage },
      }));
    }
    return Promise.reject(error);
  },
);

export default api;
