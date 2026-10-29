import { useCallback, useState } from 'react';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageState from '../components/PageState.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { useApi } from '../hooks/useApi.js';
import { cartService } from '../services/cartService.js';
import { asList, formatCurrency, getErrorMessage } from '../utils/apiData.js';
import { getCartItemPrice } from '../utils/catalog.js';
import { useCart } from '../contexts/CartContext.jsx';

export default function CartPage() {
  const load = useCallback(() => cartService.get(), []);
  const { data, loading, error, reload } = useApi(load);
  const [actionError, setActionError] = useState('');
  const { refreshCart } = useCart();
  const items = asList(data?.items ?? data?.cart?.items);
  const estimatedSubtotal = items.reduce((sum, item) => sum + getCartItemPrice(item) * Number(item.quantity), 0);

  async function mutate(action) {
    setActionError('');
    try { await action(); await reload(); await refreshCart(); }
    catch (requestError) { setActionError(getErrorMessage(requestError)); }
  }

  return <div className="shell page-shell"><div className="screen-title"><div><p className="eyebrow">GIỎ HÀNG</p><h1>Sản phẩm bạn đã chọn</h1><p className="screen-description">Kiểm tra sản phẩm và số lượng trước khi thanh toán.</p></div>{items.length > 0 && <button className="remove-link clear-cart-button" onClick={() => mutate(() => cartService.clear())}><Trash2 size={15} /> Xóa toàn bộ giỏ hàng</button>}</div>
    <PageState loading={loading} error={error} empty={!loading && !error && !items.length ? 'Giỏ hàng đang trống.' : null}>
      {items.length > 0 && <div className="cart-layout"><section className="cart-list"><div className="cart-list-heading"><span>Sản phẩm</span><span>Đơn giá</span><span>Số lượng</span><span>Tạm tính</span></div>{items.map((item) => {
        const book = item.book || {};
        const unitPrice = getCartItemPrice(item);
        return <article className="cart-item" key={item.id}><div className="cart-thumb"><ProductImage src={book.image} alt={`?nh s?n ph?m ${book.title}`} /></div><div className="cart-item-info"><Link to={`/books/${book.slug || item.bookId}`}><strong>{book.title || 'Sản phẩm'}</strong></Link><span>{book.brand || book.author}</span>{item.selectedOptions?.length > 0 && <span>{item.selectedOptions.map((option) => `${option.groupName}: ${option.optionName}`).join(' · ')}</span>}<span className="cart-mobile-price">{formatCurrency(unitPrice)}</span></div><strong className="cart-desktop-price">{formatCurrency(unitPrice)}</strong><div className="cart-quantity-wrap"><div className="quantity-control"><button disabled={item.quantity <= 1} onClick={() => mutate(() => cartService.updateItem(item.id, item.quantity - 1))} aria-label="Giảm số lượng">−</button><span>{item.quantity}</span><button disabled={item.quantity >= Number(book.stock ?? item.quantity)} onClick={() => mutate(() => cartService.updateItem(item.id, item.quantity + 1))} aria-label="Tăng số lượng">+</button></div><button className="remove-link" onClick={() => { if (window.confirm(`Xóa “${book.title || 'sản phẩm này'}” khỏi giỏ hàng?`)) mutate(() => cartService.removeItem(item.id)); }}>Xóa</button></div><strong className="cart-line-subtotal">{formatCurrency(unitPrice * Number(item.quantity))}</strong></article>;
      })}{actionError && <p className="inline-error" role="alert">{actionError}</p>}</section><aside className="order-summary"><p className="eyebrow">TÓM TẮT ĐƠN HÀNG</p><div><span>Tạm tính ước tính</span><strong>{formatCurrency(estimatedSubtotal)}</strong></div><div><span>Phí vận chuyển</span><span>Tính ở bước sau</span></div><hr /><div className="summary-total"><span>Tổng tạm tính</span><strong>{formatCurrency(estimatedSubtotal)}</strong></div><p className="summary-note">Backend xác nhận giá, tồn kho, ưu đãi, phí giao hàng và tổng tiền cuối cùng.</p><Link className="button button-primary button-wide" to="/checkout">Tiến hành đặt hàng <ArrowRight size={17} /></Link><Link className="text-link" to="/books">Tiếp tục mua sắm</Link></aside></div>}
    </PageState></div>;
}
