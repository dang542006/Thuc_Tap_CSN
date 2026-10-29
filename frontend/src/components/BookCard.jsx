import { Link } from 'react-router-dom';
import { ArrowUpRight, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { cartService } from '../services/cartService.js';
import FavoriteButton from './FavoriteButton.jsx';
import { getErrorMessage } from '../utils/apiData.js';
import { formatCurrency } from '../utils/apiData.js';
import { getEffectiveBookPrice } from '../utils/catalog.js';
import { getProductHighlights } from '../utils/productHighlights.js';
import BookCover from './BookCover.jsx';
import { useCart } from '../contexts/CartContext.jsx';

export default function BookCard({ book }) {
  const price = getEffectiveBookPrice(book);
  const highlights = getProductHighlights(book.specifications, 2);
  const discount = price < Number(book.price) ? Math.round((1 - price / Number(book.price)) * 100) : 0;
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const { isAuthenticated } = useAuth();
  const { refreshCart, notifyAdded } = useCart();
  async function addToCart() {
    if (!isAuthenticated) { setFeedback('Đăng nhập để thêm sản phẩm vào giỏ.'); return; }
    setBusy(true); setFeedback('');
    try { await cartService.addItem(book.id); await refreshCart(); notifyAdded(); setFeedback(''); }
    catch (error) { setFeedback(getErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return (
    <article className="book-card">
      <div className="book-cover">
        <Link className="cover-image-link" to={`/books/${book.slug || book.id}`} aria-label={`Xem ${book.title}`}>
        <BookCover book={book} />
        {(book.badge || book.isNew || discount > 0) && <span className={`book-badge ${discount ? 'badge-sale' : ''}`}>{book.badge || (discount ? `−${discount}%` : 'Mới')}</span>}
        </Link>
        <FavoriteButton book={book} />
      </div>
      <div className="book-card-body">
        <p className="eyebrow">{book.category?.name || 'Sản phẩm công nghệ'}</p>
        <h3><Link to={`/books/${book.slug || book.id}`}>{book.title}</Link></h3>
        <p className="muted">{book.brand || book.author}</p>
        {highlights.length > 0 && <ul className="book-spec-highlights" aria-label="Thông tin nổi bật">{highlights.map(({ label, value }) => <li key={label}><span>{label}</span><strong>{value}</strong></li>)}</ul>}
        {book.description && <p className="book-summary">{book.description}</p>}
        <div className="book-rating" aria-label={book.rating ? `${book.rating} trên 5 sao` : 'Chưa có đánh giá'}><Star size={13} fill={book.rating ? 'currentColor' : 'none'} /><strong>{book.rating ?? '—'}</strong><span>({book.reviewCount ?? 0})</span></div>
        <div className="book-price-row">
          <strong>{formatCurrency(price)}</strong>
          {discount > 0 && <del>{formatCurrency(book.price)}</del>}
          <Link to={`/books/${book.slug || book.id}`} className="icon-link" aria-label="Xem chi tiết"><ArrowUpRight size={17} /></Link>
        </div>
        <p className={`book-availability ${book.stock > 0 ? 'in-stock' : ''}`}>{book.stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}{book.publisher ? ` · ${book.publisher}` : ''}</p>
        <button className="card-add-button" type="button" disabled={busy || book.stock === 0} onClick={addToCart}><ShoppingBag size={14} />{busy ? 'Đang thêm…' : book.stock === 0 ? 'Tạm hết hàng' : 'Thêm vào giỏ'}</button>
        {feedback && <p className="card-feedback" role="status">{feedback}</p>}
      </div>
    </article>
  );
}
