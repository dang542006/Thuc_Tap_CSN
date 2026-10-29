import { Check, CircleAlert } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const success = params.get('status') === 'success';
  const orderNumber = params.get('orderNumber');
  return <div className="shell page-shell"><section className="success-card"><span className="success-icon">{success ? <Check size={28} /> : <CircleAlert size={28} />}</span><p className="eyebrow">KẾT QUẢ VNPAY</p><h1>{success ? 'Thanh toán thành công' : 'Thanh toán chưa hoàn tất'}</h1><p>{success ? 'VNPAY đã xác nhận thanh toán. Đơn hàng đang được cập nhật.' : 'Giao dịch bị hủy hoặc chưa được xác nhận. Giỏ hàng của bạn được giữ lại để thử lại.'}</p>{orderNumber && <p className="order-number">Mã đơn hàng <strong>{orderNumber}</strong></p>}<div className="hero-actions"><Link className="button button-primary" to="/track-order">Tra cứu đơn hàng</Link><Link className="text-link" to="/books">Tiếp tục mua sắm</Link></div></section></div>;
}
