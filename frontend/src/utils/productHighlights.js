const labels = {
  cpu: 'CPU', processor: 'CPU', gpu: 'GPU', graphics: 'Đồ họa',
  coresthreads: 'Nhân / luồng', capacity: 'Dung lượng', memory: 'Bộ nhớ',
  storage: 'Lưu trữ', resolution: 'Độ phân giải', screensize: 'Màn hình',
  display: 'Màn hình', refreshrate: 'Tần số quét', wireless: 'Kết nối',
  speed: 'Tốc độ', socket: 'Socket', type: 'Loại', interface: 'Giao tiếp',
};

const priorityKeys = [
  'cpu', 'processor', 'gpu', 'graphics', 'coresThreads', 'capacity', 'storage',
  'memory', 'resolution', 'screenSize', 'display', 'refreshRate', 'wireless',
  'speed', 'socket', 'type', 'interface',
];

export function getProductHighlights(specifications, limit = 2) {
  let source = specifications;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch { return []; }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];

  const entries = Object.entries(source).filter(([, value]) => ['string', 'number'].includes(typeof value) && String(value).trim());
  const byKey = new Map(entries.map((entry) => [entry[0].toLowerCase(), entry]));
  const ordered = priorityKeys.map((key) => byKey.get(key.toLowerCase())).filter(Boolean);
  const seen = new Set(ordered.map(([key]) => key));
  for (const entry of entries) if (!seen.has(entry[0])) ordered.push(entry);

  return ordered.slice(0, limit).map(([key, value]) => ({
    label: labels[key.toLowerCase()] || key.replace(/([a-z])([A-Z])/g, '$1 $2'),
    value: String(value).trim(),
  }));
}
