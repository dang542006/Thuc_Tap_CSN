import { orderLabels, paymentLabels, statusLabels } from '../constants/statusLabels.js';

export default function StatusBadge({ value, field = 'status', resource }) {
  if (value == null || value === '') return '—';

  const normalized = String(value).toUpperCase();
  const labels = field === 'orderStatus'
    ? orderLabels
    : field === 'paymentStatus'
      ? paymentLabels
      : statusLabels;
  const label = resource === 'reviews' && ['ACTIVE', 'INACTIVE'].includes(normalized)
    ? (normalized === 'ACTIVE' ? 'Đã duyệt' : 'Chưa duyệt / Đã ẩn')
    : normalized === 'INACTIVE' && resource === 'customers'
    ? 'Đã khóa'
    : labels[normalized] || String(value);
  const lockedClass = normalized === 'INACTIVE' && resource === 'customers' ? ' status-badge-locked' : '';

  return (
    <span className={`status-badge status-badge-${normalized.toLowerCase()}${lockedClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
