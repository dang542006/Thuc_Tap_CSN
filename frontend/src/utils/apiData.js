export function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export function asList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

export function getErrorMessage(error, fallback = 'Không thể tải dữ liệu. Vui lòng thử lại.') {
  return error?.response?.data?.message || error?.message || fallback;
}

export function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
}
