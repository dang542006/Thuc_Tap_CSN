import { BarChart3, BookOpen, Boxes, CreditCard, Gift, LayoutDashboard, LogOut, Menu, MessageSquareText, PackageCheck, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

const navItems = [
  ['/admin', 'Tổng quan', LayoutDashboard, true],
  ['/admin/books', 'Sản phẩm', BookOpen],
  ['/admin/categories', 'Danh mục', Boxes],
  ['/admin/orders', 'Đơn hàng', PackageCheck],
  ['/admin/customers', 'Khách hàng', Users],
  ['/admin/reviews', 'Đánh giá', MessageSquareText],
  ['/admin/promotions', 'Khuyến mãi', Gift],
  ['/admin/gift-cards', 'Thẻ quà tặng', CreditCard],
  ['/admin/gifts', 'Quà tặng', Gift],
  ['/admin/membership', 'Thành viên', Users],
  ['/admin/reports', 'Báo cáo', BarChart3],
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="admin-brand"><Link className="admin-brand-link" to="/" onClick={() => setOpen(false)} aria-label="TechStore - Trang chủ"><span className="brand-mark"><BookOpen size={19} /></span><span>TECHSTORE <small>ADMIN</small></span></Link><button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Đóng"><X size={18} /></button></div>
        <p className="sidebar-caption">QUẢN LÝ CỬA HÀNG</p>
        <nav>{navItems.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar-user"><span className="avatar">{user?.name?.slice(0, 1) || 'A'}</span><span><strong>{user?.name || 'Quản trị viên'}</strong><small>Quản trị viên</small></span><button className="icon-button" aria-label="Đăng xuất" onClick={() => { logout(); navigate('/login'); }}><LogOut size={17} /></button></div>
      </aside>
      <div className="admin-main-column">
        <header className="admin-topbar"><button className="mobile-menu icon-button" onClick={() => setOpen(!open)} aria-label="Mở menu"><Menu /></button><div><span className="admin-top-kicker">TECHSTORE / ADMIN</span><strong>Không gian quản trị</strong></div><span className="admin-top-user">Xin chào, {user?.name}</span><ThemeToggle /></header>
        <main className="admin-content"><Outlet /></main>
      </div>
      {open && <button className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
    </div>
  );
}
