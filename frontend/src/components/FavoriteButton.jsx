import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '../contexts/FavoritesContext.jsx';
import { getErrorMessage } from '../utils/apiData.js';

export default function FavoriteButton({ book, detailed = false }) {
  const { books, pending, loading, toggle } = useFavorites();
  const [error, setError] = useState('');
  const selected = books.some((item) => item.id === book.id);
  const busy = pending.includes(book.id);
  async function onClick() {
    setError('');
    try { await toggle(book); } catch (err) { setError(getErrorMessage(err)); }
  }
  return <div className={detailed ? 'detail-favorite' : 'favorite-control'}>
    <button type="button" className={`${detailed ? 'button button-outline' : 'favorite-button'} ${selected ? 'is-favorite' : ''}`} onClick={onClick} disabled={busy || loading} aria-pressed={selected} aria-label={selected ? `Bỏ yêu thích ${book.title}` : `Yêu thích ${book.title}`}>
      <Heart size={18} fill={selected ? 'currentColor' : 'none'} />
      {detailed && (busy ? 'Đang lưu…' : selected ? 'Đã yêu thích' : 'Lưu vào yêu thích')}
    </button>
    {error && <p className="favorite-error" role="alert">{error}</p>}
  </div>;
}
