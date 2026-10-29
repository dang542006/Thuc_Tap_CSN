import api from './api.js';
import { resolveImageUrl } from '../utils/catalog.js';

export async function uploadAdminBookImage(bookId, file, onProgress) {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post(`/admin/books/${bookId}/image`, formData, {
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded * 100) / event.total));
    },
  });
  return data.data;
}

export async function deleteAdminBookImage(bookId) {
  const { data } = await api.delete(`/admin/books/${bookId}/image`);
  return data.data;
}

export const resolveBookImageUrl = resolveImageUrl;
