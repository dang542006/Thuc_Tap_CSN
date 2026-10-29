import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, X } from 'lucide-react';
import { useFavorites } from '../contexts/FavoritesContext.jsx';
import BookCover from './BookCover.jsx';
import PageState from './PageState.jsx';
import { cartService } from '../services/cartService.js';
import { formatCurrency, getErrorMessage } from '../utils/apiData.js';
import { getEffectiveBookPrice } from '../utils/catalog.js';
import '../styles/favorites.css';
import { useCart } from '../contexts/CartContext.jsx';

function FavoriteRow({ book, close }) {
  const { toggle, pending } = useFavorites();
  const { refreshCart, notifyAdded } = useCart();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const unavailable = book.status !== 'ACTIVE';
  async function action(remove) {
    setMessage(''); setError('');
    if (!remove) setAdding(true);
    try {
      if (remove) await toggle(book);
      else { await cartService.addItem(book.id); await refreshCart(); notifyAdded(); setMessage(''); }
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setAdding(false); }
  }
  const href = `/books/${book.slug || book.id}`;
  return <article className="wishlist-row">
    {unavailable ? <div className="wishlist-book"><BookCover book={book} /></div> : <Link className="wishlist-book" to={href} onClick={close}><BookCover book={book} /></Link>}
    <div className="wishlist-info"><h3>{unavailable ? book.title : <Link to={href} onClick={close}>{book.title}</Link>}</h3><p>{book.author}</p><strong>{formatCurrency(getEffectiveBookPrice(book))}</strong>
      <p className="muted">{unavailable ? 'Sản phẩm hiện ngừng kinh doanh' : book.stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}</p>
      <div className="wishlist-row-actions"><button className="button button-outline" type="button" disabled={adding || unavailable || book.stock <= 0} onClick={() => action(false)}><ShoppingBag size={15} />{adding ? 'Đang thêm…' : 'Thêm vào giỏ'}</button><button className="text-link" type="button" disabled={pending.includes(book.id)} onClick={() => action(true)}>{pending.includes(book.id) ? 'Đang bỏ…' : 'Bỏ yêu thích'}</button></div>
      {message && <p role="status">{message}</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    </div>
  </article>;
}

export default function FavoritesDialog() {
  const { books, loading, error, open, setOpen, reload, authenticated } = useFavorites();
  const dialog = useRef(null);
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.current?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [open]);
  return <dialog ref={dialog} className="wishlist-dialog" aria-labelledby="wishlist-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
    <header className="wishlist-heading"><div><p className="eyebrow">BỘ SƯU TẬP CỦA BẠN</p><h2 id="wishlist-title">Sản phẩm yêu thích {authenticated && !loading && !error && <span>({books.length})</span>}</h2></div><button className="icon-button" aria-label="Đóng sản phẩm yêu thích" onClick={close}><X size={22} /></button></header>
    <div className="wishlist-content">{!authenticated ? <div className="wishlist-empty"><Heart size={32} /><h3>Lưu sản phẩm bạn quan tâm</h3><p>Đăng nhập để lưu bộ sưu tập và xem lại trên mọi thiết bị.</p><Link className="button button-primary" to="/login" onClick={close}>Đăng nhập</Link></div> : <>
      <PageState loading={loading} error={error}>{books.length ? books.map((book) => <FavoriteRow key={book.id} book={book} close={close} />) : <div className="wishlist-empty"><Heart size={32} /><h3>Một chỗ dành cho sản phẩm bạn thích</h3><p>Nhấn trái tim trên sản phẩm để lưu vào bộ sưu tập của bạn.</p><Link className="button button-primary" to="/books" onClick={close}>Khám phá sản phẩm</Link></div>}</PageState>
      {error && <button className="button button-outline" onClick={reload}>Thử tải lại</button>}
    </>}</div><footer className="wishlist-footer"><button className="button button-outline" onClick={close}>Tiếp tục khám phá</button>{authenticated && books.length > 0 && <Link className="button button-primary" to="/cart" onClick={close}>Xem giỏ hàng</Link>}</footer>
  </dialog>;
}
