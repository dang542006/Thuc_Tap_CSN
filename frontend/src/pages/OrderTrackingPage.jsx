import { useState } from 'react';
import { ArrowRight, PackageSearch } from 'lucide-react';
import { orderService } from '../services/orderService.js';
import { formatCurrency, formatDate, getErrorMessage, unwrapData } from '../utils/apiData.js';
import { orderLabels, paymentLabels } from '../constants/statusLabels.js';

export default function OrderTrackingPage() {
  const [form, setForm] = useState({ orderNumber: '', phone: '' });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setOrder(null);
    try { setOrder(unwrapData(await orderService.track({ orderNumber: form.orderNumber.trim(), phone: form.phone.trim() }))); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Không thể tra cứu đơn hàng.')); }
    finally { setBusy(false); }
  }
  return <div className="shell page-shell"><div className="screen-title"><div><p className="eyebrow">TRA CỨU ĐƠN HÀNG</p><h1>Theo dõi đơn hàng</h1><p className="screen-description">Nhập mã đơn hàng và số điện thoại đã dùng khi đặt hàng.</p></div></div>
    <div className="panel form-stack" style={{ maxWidth: 680 }}><form className="form-stack" onSubmit={submit}><label>Mã đơn hàng<input required maxLength="40" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} placeholder="Ví dụ: BS-20261027-..." /></label><label>Số điện thoại đặt hàng<input required type="tel" minLength="7" maxLength="30" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><button className="button button-primary" disabled={busy}>{busy ? 'Đang tra cứu…' : 'Tra cứu'} <ArrowRight size={16} /></button></form>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {order && <section className="track-result" aria-live="polite"><p className="eyebrow"><PackageSearch size={15} /> KẾT QUẢ TRA CỨU</p><h2>{order.orderNumber}</h2><p><strong>Người nhận:</strong> {order.receiverName || '—'} · {order.receiverPhone}</p><p><strong>Trạng thái đơn:</strong> {orderLabels[order.orderStatus] || order.orderStatus}</p><p><strong>Thanh toán:</strong> {paymentLabels[order.paymentStatus] || order.paymentStatus} · {order.paymentMethod}</p><p><strong>Ngày đặt:</strong> {formatDate(order.createdAt)}</p><p><strong>Địa chỉ giao:</strong> {order.shippingAddress}</p><p><strong>Tổng tiền:</strong> {formatCurrency(order.total)}</p><h3>Hành trình đơn hàng</h3><ol className="order-history">{order.statusHistory?.map((event, index) => <li key={`${event.status}-${event.createdAt}-${index}`}><strong>{orderLabels[event.status] || event.status}</strong><span>{event.description}</span><time>{formatDate(event.createdAt)}</time></li>)}</ol><h3>Sản phẩm</h3>{order.items?.map((item) => <p key={item.id}>{item.title} × {item.quantity}</p>)}</section>}
    </div></div>;
}
