import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { resolveImageUrl } from '../utils/catalog.js';

export default function ProductImage({ src, alt, className = '', loading = 'lazy', fetchPriority }) {
  const url = resolveImageUrl(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return <span className={`product-image-fallback ${className}`} role="img" aria-label={`${alt}: ảnh không khả dụng`}>
      <Cpu size={30} aria-hidden="true" />
      <small>Ảnh sản phẩm tạm thời không khả dụng</small>
    </span>;
  }
  return <img className={className} src={url} alt={alt} loading={loading} decoding="async" fetchPriority={fetchPriority} onError={() => setFailed(true)} />;
}
