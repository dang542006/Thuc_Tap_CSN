import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ArrowRight, ShoppingBag, Star } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BookCard from '../components/BookCard.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import ProductImage from '../components/ProductImage.jsx';
import PageState from '../components/PageState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { bookService } from '../services/bookService.js';
import { cartService } from '../services/cartService.js';
import { reviewService } from '../services/reviewService.js';
import { asList, formatCurrency, formatDate, getErrorMessage } from '../utils/apiData.js';
import { getEffectiveBookPrice, resolveImageUrl } from '../utils/catalog.js';
import { getProductHighlights } from '../utils/productHighlights.js';
import { useCart } from '../contexts/CartContext.jsx';

export default function BookDetailPage() {
  const { idOrSlug } = useParams();
  return <BookDetailContent key={idOrSlug} idOrSlug={idOrSlug} />;
}

function BookDetailContent({ idOrSlug }) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);
  const { isAuthenticated } = useAuth();
  const { refreshCart, notifyAdded } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedImage, setSelectedImage] = useState('');
  const [tab, setTab] = useState('description');
  const [message, setMessage] = useState('');
  const [cartBusy, setCartBusy] = useState(false);
  const loadBook = useCallback(() => bookService.get(idOrSlug), [idOrSlug]);
  const loadReviews = useCallback(() => reviewService.listPublic({ bookId: idOrSlug }), [idOrSlug]);
  const loadRelated = useCallback(() => bookService.related(idOrSlug), [idOrSlug]);
  const bookState = useApi(loadBook, [idOrSlug]);
  const reviewState = useApi(loadReviews, [idOrSlug]);
  const relatedState = useApi(loadRelated, [idOrSlug]);
  const book = bookState.data?.book ?? bookState.data;
  const optionGroups = book?.optionGroups ?? [];
  useEffect(() => {
    if (!book) return;
    setSelectedOptions(Object.fromEntries(optionGroups.map((group) => [group.id, group.required && group.items.length ? [group.items[0].id] : []])));
  }, [book?.id]);
  const selectedOptionItems = optionGroups.flatMap((group) => (selectedOptions[group.id] ?? []).map((id) => group.items.find((item) => item.id === id)).filter(Boolean));
  const unitPrice = getEffectiveBookPrice(book) + selectedOptionItems.reduce((sum, item) => sum + Number(item.extraCost), 0);
  const images = book ? [book.image, ...(Array.isArray(book.images) ? book.images : [])].filter(Boolean).map(resolveImageUrl) : [];
  const heroImage = selectedImage || images[0];
  const highlights = getProductHighlights(book?.specifications, 3);

  async function addToCart(andCheckout = false) {
    if (cartBusy || !book?.id) return;
    setMessage('');
    setCartBusy(true);
    try {
      await cartService.addItem(book.id, quantity, optionGroups.map((group) => ({ groupId: group.id, optionItemIds: selectedOptions[group.id] ?? [] })).filter((selection) => selection.optionItemIds.length));
      await refreshCart();
      if (andCheckout) navigate('/checkout');
      else { setMessage(''); notifyAdded(quantity); }
    } catch (error) { setMessage(getErrorMessage(error)); }
    finally { setCartBusy(false); }
  }

  return <div className="shell page-shell"><PageState loading={bookState.loading} error={bookState.error} empty={!bookState.loading && !bookState.error && !book ? 'Không tìm thấy sản phẩm này.' : null}>
    {book && <>
      <div className="book-detail"><div className="detail-gallery"><div className="detail-cover"><ProductImage src={heroImage} alt={`Ảnh sản phẩm ${book.title}`} loading="eager" />{book.discountPrice && <span className="book-badge badge-sale">Ưu đãi</span>}</div>{images.length > 1 && <div className="gallery-thumbnails">{images.map((image) => <button key={image} className={heroImage === image ? 'selected' : ''} onClick={() => setSelectedImage(image)} aria-label="Chọn ảnh sản phẩm"><ProductImage src={image} alt="" /></button>)}</div>}</div>
        <div className="detail-copy"><p className="eyebrow">{book.category?.name || 'SẢN PHẨM CÔNG NGHỆ'}</p><h1>{book.title}</h1><p className="detail-author">{book.brand || book.author}</p>{highlights.length > 0 && <ul className="detail-spec-highlights">{highlights.map(({ label, value }) => <li key={label}><span>{label}</span><strong>{value}</strong></li>)}</ul>}<div className="detail-rating"><span className="review-stars"><Star size={15} fill="currentColor" /></span><strong>{book.rating ?? '—'}</strong><span>{book.reviewCount ?? asList(book.reviews).length} đánh giá</span></div><p className="detail-price">{formatCurrency(unitPrice)} {book.discountPrice && <del>{formatCurrency(book.price)}</del>}</p>{optionGroups.length > 0 && <div className="product-options">{optionGroups.map((group) => { const chosen = selectedOptions[group.id] ?? []; return <fieldset className="product-option-group" key={group.id}><legend>{group.groupName}{group.required ? ' · Bắt buộc' : ''}</legend>{group.maxChoose === 1 ? <select aria-label={group.groupName} required={group.required} value={chosen[0] ?? ''} onChange={(event) => setSelectedOptions((current) => ({ ...current, [group.id]: event.target.value ? [event.target.value] : [] }))}>{!group.required && <option value="">M?c ??nh</option>}{group.items.map((option) => <option key={option.id} value={option.id}>{option.optionName}{Number(option.extraCost) ? ` (+${formatCurrency(option.extraCost)})` : ''}</option>)}</select> : group.items.map((option) => { const checked = chosen.includes(option.id); const limitReached = chosen.length >= group.maxChoose; return <label className="product-option-choice" key={option.id}><input type="checkbox" checked={checked} disabled={cartBusy || (!checked && limitReached)} onChange={() => setSelectedOptions((current) => { const currentIds = current[group.id] ?? []; if (group.required && checked && currentIds.length === 1) return current; const nextIds = checked ? currentIds.filter((id) => id !== option.id) : [...currentIds, option.id]; return { ...current, [group.id]: nextIds }; })} /><span>{option.optionName}</span><strong>{Number(option.extraCost) ? `+ ${formatCurrency(option.extraCost)}` : 'Không phụ phí'}</strong></label>; })}</fieldset>; })}</div>}<p className={`stock-state ${book.stock > 0 ? 'in-stock' : 'out-of-stock'}`}><span />{book.stock > 0 ? `Còn ${book.stock} sản phẩm` : 'Tạm hết hàng'}</p><p className="detail-description">{book.description || 'Thông tin giới thiệu sản phẩm chưa được cập nhật.'}</p><dl className="detail-meta"><div><dt>Hãng</dt><dd>{book.brand || book.author}</dd></div><div><dt>Danh mục</dt><dd>{book.category?.name || '—'}</dd></div><div><dt>Mã sản phẩm</dt><dd>{book.id}</dd></div></dl><div className="detail-buy-row"><div className="quantity-control"><button disabled={quantity <= 1 || cartBusy} onClick={() => setQuantity((n) => Math.max(1, n - 1))} aria-label="Giảm số lượng">−</button><span>{quantity}</span><button disabled={quantity >= Number(book.stock || 1) || cartBusy} onClick={() => setQuantity((n) => Math.min(Number(book.stock || 1), n + 1))} aria-label="Tăng số lượng">+</button></div>{isAuthenticated ? <><button className="button button-outline" disabled={!book.stock || cartBusy} onClick={() => addToCart(false)}><ShoppingBag size={16} /> {cartBusy ? 'Đang thêm…' : 'Thêm giỏ'}</button><button className="button button-primary" disabled={!book.stock || cartBusy} onClick={() => addToCart(true)}>{cartBusy ? 'Đang xử lý…' : 'Mua ngay'} <ArrowRight size={16} /></button></> : <Link className="button button-primary" to="/login">Đăng nhập để mua</Link>}</div><FavoriteButton book={book} detailed />{message && <p className="form-feedback" role="status">{message}</p>}</div>
      </div>
      <section className="book-detail-lower"><div className="detail-tabs" role="tablist"><button className={tab === 'description' ? 'active' : ''} onClick={() => setTab('description')}>Mô tả</button><button className={tab === 'information' ? 'active' : ''} onClick={() => setTab('information')}>Thông số kỹ thuật</button><button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>Đánh giá ({asList(reviewState.data).length})</button></div>
        {tab === 'description' && <div className="detail-tab-content"><h2>Thông tin sản phẩm</h2><p>{book.description || 'Thông tin giới thiệu sản phẩm chưa được cập nhật.'}</p></div>}
        {tab === 'information' && <div className="detail-tab-content detail-information"><h2>Thông số kỹ thuật</h2><p><span>Hãng sản xuất</span><strong>{book.brand || book.author}</strong></p><p><span>Danh mục</span><strong>{book.category?.name || '—'}</strong></p>{Object.entries(book.specifications || {}).map(([name, value]) => <p key={name}><span>{name}</span><strong>{String(value)}</strong></p>)}</div>}
        {tab === 'reviews' && <div className="detail-tab-content"><h2>Đánh giá từ khách hàng</h2><PageState loading={reviewState.loading} error={reviewState.error} empty={!reviewState.loading && !reviewState.error && !asList(reviewState.data).length ? 'Sản phẩm chưa có đánh giá.' : null}><div className="home-review-grid">{asList(reviewState.data).map((review) => <article className="home-review-card" key={review.id}><div className="review-stars">{Array.from({ length: Number(review.rating) || 0 }, (_, index) => <Star key={index} size={14} fill="currentColor" />)}</div><p>{review.comment}</p><strong>{review.user?.name || 'Khách hàng TechStore'}</strong><span>{formatDate(review.createdAt)}</span></article>)}</div></PageState><Link className="text-link" to="/reviews">Viết đánh giá <ArrowRight size={15} /></Link></div>}
      </section>
      <section className="related-books"><div className="section-heading"><div><p className="eyebrow">CÓ THỂ BẠN SẼ THÍCH</p><h2>Sản phẩm liên quan</h2></div></div><PageState loading={relatedState.loading} error={relatedState.error} empty={!relatedState.loading && !relatedState.error && !asList(relatedState.data).length ? 'Chưa có gợi ý liên quan.' : null}>{asList(relatedState.data).length > 0 && <div className="book-grid">{asList(relatedState.data).map((relatedBook) => <BookCard key={relatedBook.id} book={relatedBook} />)}</div>}</PageState></section>
    </>}
  </PageState></div>;
}
