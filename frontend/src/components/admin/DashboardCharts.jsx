import { useState } from 'react';
import { formatCurrency } from '../../utils/apiData.js';

export function RevenueChart({ rows }) {
  const [selected, setSelected] = useState(null);
  const current = rows.find((row) => row.period === selected) || rows.at(-1);
  if (!rows.length) return <p className="dashboard-empty">Chưa có dữ liệu doanh thu.</p>;
  const max = Math.max(...rows.map((row) => Number(row.revenue)), 1000000);
  const points = rows.map((row, index) => ({ x: 66 + index / Math.max(rows.length - 1, 1) * 590, y: 218 - Number(row.revenue) / max * 170 }));
  const path = points.map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
  const compact = (value) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  return <>
    <div className="revenue-readout" aria-live="polite"><span>{current.period.length === 10 ? current.period : `Tháng ${current.period.slice(5)}/${current.period.slice(0, 4)}`}</span><strong>{formatCurrency(current.revenue)}</strong><small>{current.successfulOrders ?? current.orders} đơn đã thanh toán</small></div>
    <svg className="dashboard-line-chart" viewBox="0 0 680 260" role="group" aria-label="Doanh thu theo tháng, đơn vị VNĐ">
      {[0, .5, 1].map((ratio) => <g key={ratio}><line x1="66" x2="656" y1={218 - ratio * 170} y2={218 - ratio * 170} className="dashboard-gridline" /><text x="56" y={222 - ratio * 170} textAnchor="end">{compact(ratio * max)}</text></g>)}
      <path d={`${path} L656,218 L66,218 Z`} className="dashboard-area" /><path d={path} className="dashboard-line" />
      {rows.map((row, i) => <g key={row.period}><circle cx={points[i].x} cy={points[i].y} r={row === current ? 6 : 4} className="dashboard-point" tabIndex="0" role="button" aria-label={`${row.period}: ${formatCurrency(row.revenue)}, ${row.orders} đơn`} onFocus={() => setSelected(row.period)} onMouseEnter={() => setSelected(row.period)} onClick={() => setSelected(row.period)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(row.period); } }} /><text x={points[i].x} y="246" textAnchor="middle">{row.period.slice(5)}</text></g>)}
    </svg>
    {rows.every((row) => !Number(row.revenue)) && <p className="dashboard-note">Chưa phát sinh doanh thu trong khoảng thời gian này.</p>}
    <details className="dashboard-data"><summary>Xem bảng số liệu</summary><div className="table-wrap"><table><thead><tr><th>Kỳ</th><th>Doanh thu</th><th>Đơn đã thanh toán</th></tr></thead><tbody>{rows.map((row) => <tr key={row.period}><td>{row.period}</td><td>{formatCurrency(row.revenue)}</td><td>{row.successfulOrders ?? row.orders}</td></tr>)}</tbody></table></div></details>
  </>;
}

const statuses = [ ['PENDING', 'Chờ xác nhận', '#9b8bc3'], ['CONFIRMED', 'Đã xác nhận', '#719bd0'], ['PROCESSING', 'Đang xử lý', '#c49d55'], ['SHIPPING', 'Đang giao', '#59a6aa'], ['DELIVERED', 'Đã giao', '#458573'], ['CANCELLED', 'Đã hủy', '#be7474'] ];
export function OrderStatusChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  let offset = 0;
  return <div className="order-breakdown"><div className="dashboard-donut"><svg viewBox="0 0 160 160" role="img" aria-label={`${total} đơn hàng. Chi tiết trạng thái trong chú giải bên cạnh.`}><circle cx="80" cy="80" r="62" className="donut-track" fill="none" strokeWidth="15" />{statuses.map(([status, label, color]) => {
    const count = rows.find((row) => row.status === status)?.count || 0;
    const share = total ? count / total * 100 : 0;
    const start = offset; offset += share;
    return <circle key={status} cx="80" cy="80" r="62" pathLength="100" fill="none" stroke={color} strokeWidth="15" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 80 80)"><title>{label}: {count} đơn</title></circle>;
  })}</svg><div><strong>{total}</strong><span>đơn hàng</span></div></div><ul className="dashboard-legend">{statuses.map(([status,label,color]) => <li key={status}><span><i style={{background:color}} />{label}</span><strong>{rows.find((row)=>row.status===status)?.count || 0}</strong></li>)}</ul>{!total && <p className="dashboard-note">Chưa có đơn hàng. Biểu đồ sẽ cập nhật khi có giao dịch.</p>}</div>;
}

export function RankingChart({ rows, empty, unit = 'sản phẩm' }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) return <div className="dashboard-empty">{empty}</div>;
  return <ol className="dashboard-ranking">{rows.map((row, index) => <li key={row.id}><div><span><small>{String(index + 1).padStart(2, '0')}</small>{row.label}</span><strong>{row.value} <small>{unit}</small></strong></div><div className="ranking-track"><span style={{width:`${row.value / max * 100}%`}} /></div></li>)}</ol>;
}
