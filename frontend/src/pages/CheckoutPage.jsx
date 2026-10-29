import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, Tag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PageState from '../components/PageState.jsx';
import { useApi } from '../hooks/useApi.js';
import { cartService } from '../services/cartService.js';
import { orderService } from '../services/orderService.js';
import { promotionService } from '../services/promotionService.js';
import { profileService } from '../services/profileService.js';
import { asList, formatCurrency, getErrorMessage, unwrapData } from '../utils/apiData.js';
import { getCartItemPrice } from '../utils/catalog.js';
import { useCart } from '../contexts/CartContext.jsx';

export default function CheckoutPage() {
  const load = useCallback(() => cartService.get(), []);
  const { data, loading, error } = useApi(load);
  const { refreshCart } = useCart();
  const loadAddresses = useCallback(() => profileService.listAddresses(), []);
  const addressState = useApi(loadAddresses);
  const items = asList(data?.items ?? data?.cart?.items);
  const addresses = asList(addressState.data);
  const [receiverName, setReceiverName] = useState('');
  const [address, setAddress] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [promotionCode, setPromotionCode] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [promotionMessage, setPromotionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const estimate = items.reduce((sum, item) => sum + getCartItemPrice(item) * Number(item.quantity), 0);

  useEffect(() => {
    const preferred = addresses.find((item) => item.defaultAddress);
    if (preferred && !selectedAddressId) {
      setSelectedAddressId(preferred.id);
      setReceiverName(preferred.receiverName);
      setReceiverPhone(preferred.phoneNumber);
      setAddress(preferred.fullAddress);
    }
  }, [addresses, selectedAddressId]);

  async function applyPromotion() {
    setPromotionMessage('');
    try {
      const result = unwrapData(await promotionService.validate(promotionCode.trim()));
      setPromotion(result);
      setPromotionMessage(result?.message || 'Mã ưu đãi đã được xác nhận.');
    } catch (requestError) {
      setPromotion(null);
      setPromotionMessage(getErrorMessage(requestError));
    }
  }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setErrorMessage('');
    try {
      const order = unwrapData(await orderService.checkout({ receiverName, shippingAddress: address, receiverPhone, paymentMethod, promotionCode: promotion?.code }));
      if (!order?.id) throw new Error('Đơn hàng đã gửi nhưng phản hồi không có mã đơn. Hãy kiểm tra lịch sử đơn hàng.');
      await refreshCart();
      if (paymentMethod === 'VNPAY') {
        if (!order.paymentUrl) throw new Error('Không nhận được đường dẫn thanh toán VNPAY.');
        window.location.assign(order.paymentUrl);
        return;
      }
      navigate(`/order-success/${encodeURIComponent(order.id)}`, { replace: true, state: { order } });
    } catch (requestError) { setErrorMessage(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <div className="shell page-shell"><div className="screen-title"><div><p className="eyebrow">THANH TOÁN</p><h1>Hoàn tất đơn hàng</h1><p className="screen-description">Backend sẽ xác nhận lại giá, tồn kho, ưu đãi và phí giao hàng trước khi tạo đơn.</p></div><Link className="text-link" to="/cart">← Quay lại giỏ hàng</Link></div>
    <PageState loading={loading} error={error} empty={!loading && !error && !items.length ? 'Giỏ hàng đang trống.' : null}>
      {items.length > 0 && <div className="checkout-layout"><form className="checkout-form form-stack" onSubmit={submit}>
        <section className="checkout-section"><p className="checkout-step">01</p><div><h2>Thông tin giao hàng</h2>{addresses.length > 0 && <label>Địa chỉ đã lưu<select value={selectedAddressId} onChange={(e) => { const id = e.target.value; setSelectedAddressId(id); const saved = addresses.find((item) => item.id === id); if (saved) { setReceiverName(saved.receiverName); setReceiverPhone(saved.phoneNumber); setAddress(saved.fullAddress); } }}><option value="">Nhập địa chỉ khác</option>{addresses.map((item) => <option key={item.id} value={item.id}>{item.receiverName} · {item.fullAddress}{item.defaultAddress ? ' (Mặc định)' : ''}</option>)}</select></label>}<label>Người nhận<input required minLength="2" maxLength="120" value={receiverName} onChange={(e) => { setReceiverName(e.target.value); setSelectedAddressId(''); }} autoComplete="name" /></label><label>Số điện thoại nhận hàng<input required type="tel" minLength="7" maxLength="30" value={receiverPhone} onChange={(e) => { setReceiverPhone(e.target.value); setSelectedAddressId(''); }} placeholder="Ví dụ: 0901234567" autoComplete="tel" /></label><label>Địa chỉ nhận hàng<textarea required minLength="8" rows="3" value={address} onChange={(e) => { setAddress(e.target.value); setSelectedAddressId(''); }} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" /></label>{addressState.error && <p className="inline-error" role="alert">Không tải được địa chỉ đã lưu: {addressState.error}</p>}</div></section>
        <section className="checkout-section"><p className="checkout-step">02</p><div><h2>Phương thức thanh toán</h2><div className="payment-options">{[['COD', 'Thanh toán khi nhận hàng'], ['VNPAY', 'Thanh toán trực tuyến qua VNPAY']].map(([value, label]) => <label className={`payment-option ${paymentMethod === value ? 'selected' : ''}`} key={value}><input type="radio" name="paymentMethod" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} /><span><strong>{label}</strong><small>{value === 'COD' ? 'Thanh toán khi nhận sản phẩm' : 'Chuyển tới cổng thanh toán bảo mật VNPAY'}</small></span>{paymentMethod === value && <Check size={17} />}</label>)}</div></div></section>
        <section className="checkout-section"><p className="checkout-step">03</p><div><h2>Mã ưu đãi</h2><div className="promotion-input"><span className="promo-icon"><Tag size={16} /></span><input value={promotionCode} onChange={(e) => { setPromotionCode(e.target.value); setPromotion(null); setPromotionMessage(''); }} placeholder="Nhập mã khuyến mãi" /><button className="button button-outline" type="button" disabled={!promotionCode.trim()} onClick={applyPromotion}>Áp dụng</button></div>{promotionMessage && <p className={promotion ? 'inline-success' : 'inline-error'}>{promotionMessage}</p>}</div></section>
        {errorMessage && <div className="inline-error" role="alert">{errorMessage}</div>}
        <button className="button button-primary checkout-confirm" disabled={busy}>{busy ? 'Đang xác nhận…' : 'Xác nhận đặt hàng'} <ArrowRight size={17} /></button>
      </form><aside className="order-summary checkout-summary"><p className="eyebrow">ĐƠN HÀNG CỦA BẠN</p>{items.map((item) => <div className="checkout-summary-item" key={item.id}><div><strong>{item.book?.title || 'Sản phẩm'}</strong><span>{item.book?.brand || item.book?.author} · SL {item.quantity}</span>{item.selectedOptions?.map((option) => <small key={option.optionItemId}>{option.groupName}: {option.optionName}</small>)}</div><strong>{formatCurrency(getCartItemPrice(item) * Number(item.quantity))}</strong></div>)}<div className="price-breakdown"><div><span>Tạm tính ước tính</span><strong>{formatCurrency(estimate)}</strong></div>{promotion && <div><span>Ưu đãi</span><strong>{promotion.code}</strong></div>}<div><span>Phí giao hàng</span><strong>Tính khi đặt hàng</strong></div><div className="summary-total"><span>Tổng thanh toán</span><strong>Xác nhận khi đặt hàng</strong></div></div><p className="summary-note">Giá sản phẩm trong trang này chỉ để tham khảo. Máy chủ sẽ tính lại toàn bộ đơn hàng.</p></aside></div>}
    </PageState></div>;
}
