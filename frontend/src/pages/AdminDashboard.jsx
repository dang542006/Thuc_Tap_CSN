import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CircleAlert, PackageCheck, Users, RefreshCw } from 'lucide-react';
import PageState from '../components/PageState.jsx';
import { RevenueChart, OrderStatusChart, RankingChart } from '../components/admin/DashboardCharts.jsx';
import { useApi } from '../hooks/useApi.js';
import { adminService } from '../services/adminService.js';
import { asList, formatCurrency } from '../utils/apiData.js';
import '../styles/dashboard.css';

const metrics = [ ['revenue','Doanh thu','Tổng giá trị đơn đã thanh toán',ArrowUpRight], ['orders','Đơn hàng','Tất cả trạng thái',PackageCheck], ['customers','Khách hàng','Tài khoản CUSTOMER',Users], ['books','Sản phẩm đang bán','Sản phẩm ACTIVE',BookOpen] ];
function Panel({ title, caption, action, className = '', children }) {
  return <section className={`admin-panel dashboard-panel ${className}`}><header><div><h2>{title}</h2><p>{caption}</p></div>{action}</header>{children}</section>;
}
export default function AdminDashboard() {
  const load = useCallback(() => adminService.dashboard(), []);
  const { data, loading, error, reload } = useApi(load);
  const [months, setMonths] = useState(6);
  const trend = asList(data?.revenueTrend).slice(-months);
  const categoryRows = asList(data?.categoryDistribution).map((row) => ({id:row.id,label:row.name,value:row.count})).sort((a,b)=>b.value-a.value);
  return <div className="admin-page dashboard-page">
    <div className="admin-page-title"><div><p className="eyebrow">TECHSTORE / TỔNG QUAN</p><h1>Nhịp hoạt động cửa hàng</h1><p>Theo dõi kinh doanh, sản phẩm và đơn hàng.</p></div><button className="button button-outline" disabled={loading} onClick={reload}><RefreshCw size={15} className={loading?'spin':''} /> Làm mới</button></div>
    {error && <button className="button button-outline" onClick={reload}>Thử tải lại</button>}
    <PageState loading={loading} error={error}>
      <div className="dashboard-context"><span>Số liệu tổng quan • Toàn thời gian</span>{data?.generatedAt && <span>Cập nhật {new Date(data.generatedAt).toLocaleString('vi-VN')}</span>}</div>
      <div className="metric-grid">{metrics.map(([key,label,note,Icon])=><article className="metric-card" key={key}><div className="metric-top"><span>{label}</span><Icon size={18}/></div><strong>{key==='revenue'?formatCurrency(data?.metrics?.[key]??0):new Intl.NumberFormat('vi-VN').format(data?.metrics?.[key]??0)}</strong><small>{note}</small></article>)}</div>
      <div className="dashboard-visual-grid">
        <Panel className="dashboard-revenue" title="Doanh thu theo tháng" caption="Đơn đã thanh toán, nhóm theo tháng tạo đơn (UTC)." action={<label className="dashboard-period"><span>Khoảng thời gian</span><select value={months} onChange={(event)=>setMonths(Number(event.target.value))}><option value={6}>6 tháng gần nhất</option><option value={12}>12 tháng gần nhất</option></select></label>}><RevenueChart rows={trend}/></Panel>
        <Panel title="Trạng thái đơn hàng" caption="Phân bổ đơn hàng trong toàn bộ lịch sử."><OrderStatusChart rows={asList(data?.orderStatuses)}/></Panel>
        <Panel title="Danh mục sản phẩm" caption="Số sản phẩm đang hoạt động theo danh mục." action={<Link to="/admin/categories">Quản lý ↗</Link>}><RankingChart rows={categoryRows} empty="Chưa có danh mục sản phẩm."/></Panel>
        <Panel title="Top 5 sản phẩm bán chạy" caption="Số lượng sản phẩm trong các đơn đã giao, toàn thời gian." action={<Link to="/admin/orders">Đơn hàng ↗</Link>}><RankingChart rows={asList(data?.bestSellers).map((book)=>({id:book.id,label:book.title,value:book.quantitySold}))} unit="sản phẩm" empty="Chưa có đơn đã giao. Sản phẩm bán chạy sẽ xuất hiện tại đây khi có dữ liệu."/></Panel>
      </div>
      <Panel className="dashboard-stock" title="Theo dõi tồn kho" caption={`${data?.metrics?.lowStock??0} sản phẩm đang hoạt động có tồn kho từ 5 sản phẩm trở xuống. Hiển thị tối đa 8 mặt hàng.`} action={<Link to="/admin/books">Quản lý sản phẩm ↗</Link>}>
        {asList(data?.lowStock).length ? <div className="dashboard-stock-list">{data.lowStock.map((book)=><div key={book.id}><span>{book.title}</span><strong>{book.stock} sản phẩm</strong></div>)}</div> : <p className="dashboard-stock-ok"><CircleAlert size={18}/> Hiện không có sản phẩm cần bổ sung tồn kho.</p>}
      </Panel>
    </PageState>
  </div>;
}
