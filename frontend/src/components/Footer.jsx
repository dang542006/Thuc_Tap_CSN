import { ArrowUpRight, Cpu, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand"><Link className="brand" to="/"><span className="brand-mark"><Cpu size={20} /></span><span>tech<span>store</span></span></Link><p>Laptop, linh kiện và phụ kiện cho công việc, học tập và giải trí.</p></div>
        <div><p className="footer-label">Khám phá</p><Link to="/books">Tất cả sản phẩm</Link><Link to="/membership">Thành viên</Link><Link to="/track-order">Tra cứu đơn hàng</Link></div>
        <div><p className="footer-label">Kết nối</p><a href="mailto:hello@techstore.vn"><Mail size={15} /> hello@techstore.vn</a><span>Thứ 2 – Thứ 7, 9:00 – 18:00</span></div>
        <div className="footer-note"><span>Cấu hình phù hợp, mua sắm an tâm.</span><ArrowUpRight size={17} /></div>
      </div>
      <p className="shell footer-demo-notice">Giá bán và số lượng tồn kho trên website là dữ liệu mẫu phục vụ trình diễn, chưa được xác minh là giá bán hoặc hàng hóa thực tế.</p>
      <div className="shell footer-bottom"><span>© {new Date().getFullYear()} TechStore</span><span>Thiết bị và linh kiện máy tính</span></div>
    </footer>
  );
}
