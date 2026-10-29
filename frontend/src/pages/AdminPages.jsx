import { useCallback, useEffect, useState } from 'react';
export { default as AdminDashboard } from './AdminDashboard.jsx';
import PageState from '../components/PageState.jsx';
import Toast from '../components/Toast.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { orderLabels, paymentLabels } from '../constants/statusLabels.js';
import BookImageUpload from '../components/admin/BookImageUpload.jsx';
import BookFormFields from '../components/admin/BookFormFields.jsx';
import { createBookForm, buildBookPayload } from '../utils/adminBookForm.js';
import { useApi } from '../hooks/useApi.js';
import { adminService } from '../services/adminService.js';
import { categoryService } from '../services/categoryService.js';
import { asList, formatCurrency, formatDate } from '../utils/apiData.js';
import { RevenueChart } from '../components/admin/DashboardCharts.jsx';

function AdminTitle({ title, description, action }) {
  return <div className="admin-page-title"><div><p className="eyebrow">TECHSTORE ADMIN</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

const resources = {
  books: { title: 'Quản lý sản phẩm', description: 'Quản lý laptop, linh kiện và phụ kiện công nghệ.', fields: [['title', 'Tên sản phẩm'], ['brand', 'Hãng'], ['category', 'Danh mục'], ['price', 'Giá'], ['stock', 'Tồn kho'], ['status', 'Trạng thái']] },
  categories: { title: 'Quản lý danh mục', description: 'Sắp xếp và theo dõi các nhóm sản phẩm.', fields: [['name', 'Tên danh mục'], ['slug', 'Đường dẫn'], ['bookCount', 'Số sản phẩm'], ['status', 'Trạng thái']] },
  orders: { title: 'Quản lý đơn hàng', description: 'Theo dõi trạng thái và thông tin các đơn đặt hàng.', fields: [['orderNumber', 'Mã đơn'], ['customerName', 'Khách hàng'], ['createdAt', 'Ngày đặt'], ['total', 'Tổng tiền'], ['orderStatus', 'Trạng thái']] },
  customers: { title: 'Khách hàng', description: 'Thông tin tài khoản và hoạt động mua sắm.', fields: [['name', 'Khách hàng'], ['email', 'Email'], ['phone', 'Điện thoại'], ['points', 'Điểm'], ['membershipLevel', 'Hạng'], ['status', 'Trạng thái']] },
  reviews: { title: 'Đánh giá', description: 'Nội dung đánh giá do khách hàng gửi lên.', fields: [['bookTitle', 'Sản phẩm'], ['customerName', 'Khách hàng'], ['rating', 'Điểm'], ['comment', 'Nhận xét'], ['status', 'Trạng thái'], ['createdAt', 'Ngày gửi']] },
  promotions: { title: 'Khuyến mãi', description: 'Mã ưu đãi và chương trình giảm giá.', fields: [['code', 'Mã'], ['name', 'Tên chương trình'], ['discountType', 'Loại'], ['discountValue', 'Giá trị'], ['status', 'Trạng thái']] },
  giftCards: { title: 'Thẻ quà tặng', description: 'Giá trị còn lại và trạng thái thẻ quà tặng.', fields: [['code', 'Mã thẻ'], ['initialValue', 'Giá trị ban đầu'], ['balance', 'Số dư'], ['expiresAt', 'Ngày hết hạn'], ['status', 'Trạng thái']] },
  gifts: { title: 'Quà tặng', description: 'Quà đổi điểm và số lượng tồn kho.', fields: [['name', 'Tên quà'], ['pointsCost', 'Điểm đổi'], ['stock', 'Tồn kho'], ['status', 'Trạng thái']] },
  membership: { title: 'Thành viên', description: 'Hạng thành viên, ngưỡng điểm và quyền lợi.', fields: [['name', 'Hạng'], ['level', 'Mã hạng'], ['minPoints', 'Điểm tối thiểu'], ['description', 'Quyền lợi'], ['status', 'Trạng thái']] },
  reports: { title: 'Báo cáo', description: 'Số liệu tổng hợp được cung cấp bởi API quản trị.', fields: [['period', 'Kỳ báo cáo'], ['revenue', 'Doanh thu'], ['orders', 'Đơn hàng'], ['averageOrderValue', 'Giá trị trung bình'], ['createdAt', 'Cập nhật']] },
};

function displayValue(value, field) {
  if (value == null || value === '') return '—';
  if (['price', 'total', 'revenue', 'averageOrderValue', 'initialValue', 'balance'].includes(field)) return formatCurrency(value);
  if (field === 'createdAt' || field === 'expiresAt') return formatDate(value);
  if (typeof value === 'object') return value.name ?? value.title ?? '—';
  return String(value);
}

function AdminResourcePage({ resource }) {
  const config = resources[resource];
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [productFilterDraft, setProductFilterDraft] = useState({ categoryId: '', brand: '', minPrice: '', maxPrice: '' });
  const [productFilters, setProductFilters] = useState({});
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(resource === 'books');
  const [categoriesError, setCategoriesError] = useState('');
  const load = useCallback(() => adminService.resource(resource, { q: search || undefined, status: status || undefined, ...(resource === 'books' ? productFilters : {}), page, limit: 12 }), [resource, search, status, page, productFilters]);
  const { data, loading, error, reload } = useApi(load, [resource, search, status, page, productFilters]);
  const rows = asList(data?.items ?? data?.records ?? data);
  useEffect(() => {
    if (resource !== 'books') return undefined;
    let active = true;
    setCategoriesLoading(true);
    setCategoriesError('');
    categoryService.list()
      .then((response) => {
        if (active) setCategories(asList(response?.data?.data ?? response?.data));
      })
      .catch((requestError) => {
        if (active) setCategoriesError(requestError?.response?.data?.message || requestError.message || 'Không thể tải danh mục.');
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => { active = false; };
  }, [resource]);
  const hasSelectedActiveBookCategory = resource === 'books' && categories.some((category) => category.id === form.categoryId);
  const currentBookCategoryIsInactive = resource === 'books' && editingRow && !categoriesLoading && !categoriesError
    && !categories.some((category) => category.id === editingRow.categoryId);
  const canSave = !saving && (resource !== 'books' || (!categoriesLoading && !categoriesError && categories.length > 0));
  const createFields = {
    books: [['title', 'Tên sản phẩm'], ['brand', 'Hãng sản xuất'], ['categoryId', 'Danh mục'], ['price', 'Giá'], ['discountPrice', 'Giá ưu đãi'], ['stock', 'Tồn kho'], ['description', 'Mô tả'], ['specifications', 'Thông số kỹ thuật']],
    categories: [['name', 'Tên danh mục'], ['description', 'Mô tả']],
    promotions: [['code', 'Mã ưu đãi'], ['name', 'Tên chương trình'], ['discountType', 'PERCENTAGE hoặc FIXED_AMOUNT'], ['discountValue', 'Giá trị'], ['minOrderAmount', 'Đơn hàng tối thiểu'], ['startsAt', 'Bắt đầu (ISO)'], ['endsAt', 'Kết thúc (ISO)'], ['usageLimit', 'Giới hạn lượt dùng']],
    membership: [['level', 'Mã hạng'], ['name', 'Tên hạng'], ['minPoints', 'Điểm tối thiểu'], ['description', 'Mô tả']],
    giftCards: [['code', 'Mã thẻ'], ['initialValue', 'Giá trị ban đầu'], ['balance', 'Số dư'], ['expiresAt', 'Ngày hết hạn']],
    gifts: [['name', 'Tên quà'], ['description', 'Mô tả'], ['pointsCost', 'Điểm đổi'], ['stock', 'Tồn kho'], ['imageUrl', 'URL ảnh']],
  }[resource] || [];
  async function createRecord(event) {
    event.preventDefault();
    if (saving) return;
    if (resource === 'books') {
      if (categoriesLoading || categoriesError) {
        setToast({ message: categoriesError || 'Đang tải danh mục, vui lòng thử lại.', type: 'error' });
        return;
      }
      if (!form.categoryId || !hasSelectedActiveBookCategory) {
        setToast({ message: 'Hãy chọn một danh mục đang hoạt động.', type: 'error' });
        return;
      }
    }
    setSaving(true);
    try {
      const payload = resource === 'books' ? buildBookPayload(form, editingRow) : resource === 'categories'
        ? { name: form.name, description: form.description, status: form.status }
        : { ...form };
      for (const key of ['price', 'discountPrice', 'discountValue', 'stock', 'minPoints', 'minOrderAmount', 'usageLimit', 'initialValue', 'balance', 'pointsCost']) if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') payload[key] = Number(payload[key]);
      if (payload.discountPrice === '') payload.discountPrice = null;
      for (const key of ['minOrderAmount', 'usageLimit', 'balance', 'expiresAt']) if (payload[key] === '') delete payload[key];
      if (payload.imageUrl === '') payload.imageUrl = null;
      if (editingRow && !Object.keys(payload).length) { setToast({ message: 'Chưa có thông tin thay đổi.', type: 'success' }); return; }
      if (editingRow) await adminService.update(resource, editingRow.id, payload);
      else await adminService.create(resource, payload);
      setModalOpen(false); setEditingRow(null); setForm({}); setToast({ message: editingRow ? 'Đã cập nhật bản ghi.' : 'Đã tạo bản ghi.', type: 'success' }); await reload();
    } catch (requestError) { setToast({ message: requestError?.response?.data?.message || requestError.message || 'Không thể lưu bản ghi.', type: 'error' }); }
    finally { setSaving(false); }
  }
  async function performRowAction(row, action) {
    try {
      if (action === 'edit') {
        setEditingRow(row);
        setForm(resource === 'books' ? createBookForm(row) : resource === 'categories'
          ? { name: row.name, description: row.description, status: row.status }
          : { ...row, startsAt: row.startsAt ? new Date(row.startsAt).toISOString().slice(0, 16) : '', endsAt: row.endsAt ? new Date(row.endsAt).toISOString().slice(0, 16) : '', expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString().slice(0, 10) : '' });
        setModalOpen(true);
        return;
      }
      if (action === 'details') {
        const response = await adminService.orderDetails(row.id);
        setDetailOrder(response.data?.data ?? response.data);
        return;
      }
      if (action === 'customer-details') {
        const response = await adminService.customerDetails(row.id);
        setDetailCustomer(response.data?.data ?? response.data);
        return;
      }
      let successMessage = 'Đã cập nhật dữ liệu.';
      if (resource === 'categories' && action === 'hide') {
        if (!window.confirm(`Ẩn danh mục “${row.name}”? Danh mục và sản phẩm thuộc danh mục này sẽ được giữ nguyên.`)) return;
        await adminService.update('categories', row.id, { status: 'INACTIVE' });
        successMessage = 'Đã ẩn danh mục. Danh mục và sản phẩm liên quan vẫn được giữ nguyên.';
      } else if (resource === 'categories' && action === 'activate') {
        await adminService.update('categories', row.id, { status: 'ACTIVE' });
        successMessage = 'Đã kích hoạt danh mục.';
      } else if (resource === 'categories' && action === 'delete') {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn danh mục “${row.name}”? Hành động này không thể khôi phục.`)) return;
        await adminService.remove('categories', row.id);
        successMessage = 'Đã xóa vĩnh viễn danh mục.';
      } else if (resource === 'books' && action === 'hide') {
        if (!window.confirm(`Ẩn sản phẩm “${row.title}”? Sản phẩm sẽ không còn hiển thị cho khách hàng; đơn hàng và dữ liệu liên quan được giữ nguyên.`)) return;
        await adminService.update('books', row.id, { status: 'INACTIVE' });
        successMessage = 'Đã ẩn sản phẩm. Bản ghi và dữ liệu liên quan vẫn được giữ nguyên.';
      } else if (resource === 'books' && action === 'activate') {
        await adminService.update('books', row.id, { status: 'ACTIVE' });
        successMessage = 'Đã kích hoạt sản phẩm.';
      } else if (resource === 'books' && action === 'delete') {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm “${row.title}”? Hành động này có thể không khôi phục được.`)) return;
        await adminService.remove('books', row.id);
        successMessage = 'Đã xóa vĩnh viễn sản phẩm.';
      }
      if (resource === 'membership' && action === 'deactivate') {
        if (!window.confirm('Ẩn bậc thành viên này? Bản ghi vẫn được lưu và có thể khôi phục.')) return;
        await adminService.remove(resource, row.id);
      } else if (resource === 'membership' && action === 'activate') {
        await adminService.update(resource, row.id, { status: 'ACTIVE' });
      } else if (resource !== 'books' && resource !== 'categories' && action === 'delete') {
        if (!window.confirm('Bạn có chắc muốn xóa hoặc ẩn bản ghi này?')) return;
        await adminService.remove(resource, row.id);
      } else if (resource === 'customers' && action === 'lock') {
        if (!window.confirm(`Khóa tài khoản ${row.name}? Tài khoản sẽ không thể đăng nhập.`)) return;
        await adminService.lockCustomer(row.id);
      } else if (resource === 'customers' && action === 'unlock') {
        if (!window.confirm(`Mở khóa tài khoản ${row.name}?`)) return;
        await adminService.unlockCustomer(row.id);
      }
      else if (resource === 'reviews' && action === 'approve') await adminService.approveReview(row.id);
      else if (resource === 'reviews' && action === 'hide') await adminService.hideReview(row.id);
      else if (resource === 'promotions' && action === 'activate') await adminService.activatePromotion(row.id);
      else if (resource === 'promotions' && action === 'deactivate') await adminService.deactivatePromotion(row.id);
      else if (resource === 'orders' && action.startsWith('order:')) await adminService.updateOrderStatus(row.id, action.slice(6));
      if (resource === 'reviews') successMessage = action === 'approve' ? 'Đã duyệt và công khai đánh giá.' : action === 'hide' ? 'Đã ẩn đánh giá khỏi trang công khai và điểm sao.' : successMessage;
      if (resource === 'membership') successMessage = action === 'activate' ? 'Đã khôi phục bậc thành viên.' : action === 'deactivate' ? 'Đã ẩn bậc thành viên.' : 'Đã cập nhật bậc thành viên.';
      else if (resource === 'customers') successMessage = action === 'lock' ? 'Đã khóa tài khoản khách hàng.' : action === 'unlock' ? 'Đã mở khóa tài khoản khách hàng.' : successMessage;
      setToast({ message: successMessage, type: 'success' });
      await reload();
    } catch (requestError) {
      setToast({ message: requestError?.response?.data?.message || requestError.message || 'Không thể cập nhật dữ liệu.', type: 'error' });
    }
  }
  return <div className="admin-page"><AdminTitle title={config.title} description={config.description} />
      <section className="admin-panel resource-panel"><div className="admin-panel-heading"><div><p className="eyebrow">DỮ LIỆU TECHSTORE</p><h2>{config.title}</h2></div><div className="resource-heading-actions"><span className="data-period">{loading ? 'Đang tải…' : `${data?.total ?? rows.length} bản ghi`}</span>{createFields.length > 0 && <button className="button button-primary" onClick={() => { setEditingRow(null); setForm({}); setModalOpen(true); }}>Thêm mới</button>}</div></div>
      <form className="admin-resource-tools" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchText.trim()); if (resource === 'books') setProductFilters({ ...productFilterDraft }); }}><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder={`Tìm trong ${config.title.toLowerCase()}…`} aria-label="Tìm kiếm" /><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Lọc trạng thái"><option value="">Mọi trạng thái</option><option value="ACTIVE">{resource === 'reviews' ? 'Đã duyệt' : 'Đang hoạt động'}</option><option value="INACTIVE">{resource === 'reviews' ? 'Chưa duyệt / Đã ẩn' : 'Tạm ẩn'}</option></select>{resource === 'books' && <><select value={productFilterDraft.categoryId} onChange={(event) => setProductFilterDraft({ ...productFilterDraft, categoryId: event.target.value })} aria-label="Lọc danh mục"><option value="">Mọi danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input value={productFilterDraft.brand} onChange={(event) => setProductFilterDraft({ ...productFilterDraft, brand: event.target.value })} placeholder="Hãng sản xuất" aria-label="Lọc hãng sản xuất" /><input type="number" min="0" value={productFilterDraft.minPrice} onChange={(event) => setProductFilterDraft({ ...productFilterDraft, minPrice: event.target.value })} placeholder="Giá từ" aria-label="Giá tối thiểu" /><input type="number" min="0" value={productFilterDraft.maxPrice} onChange={(event) => setProductFilterDraft({ ...productFilterDraft, maxPrice: event.target.value })} placeholder="Giá đến" aria-label="Giá tối đa" /></>}<button className="button button-outline" type="submit">Tìm kiếm</button></form>
      <PageState loading={loading} error={error} empty={!loading && !error && !rows.length ? 'API chưa trả về dữ liệu cho mục này.' : null}>
        {rows.length > 0 && <div className="table-scroll"><table className="admin-table"><thead><tr>{config.fields.map(([field, label]) => <th key={field}>{label}</th>)}<th>Thao tác</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id || row.orderNumber}>{config.fields.map(([field]) => { const value = row[field] ?? (field === 'bookTitle' ? row.book?.title : field === 'customerName' ? row.user?.name : undefined); return <td key={field}>{['status', 'orderStatus', 'paymentStatus'].includes(field) ? <StatusBadge value={value} field={field} resource={resource} /> : displayValue(value, field)}</td>; })}<td><div className="admin-row-actions">
          {resource === 'books' && <><button className="row-action-edit" type="button" onClick={() => performRowAction(row, 'edit')}>Sửa</button><button className={row.status === 'ACTIVE' ? 'row-action-hide' : 'row-action-activate'} type="button" onClick={() => performRowAction(row, row.status === 'ACTIVE' ? 'hide' : 'activate')}>{row.status === 'ACTIVE' ? 'Ẩn sản phẩm' : 'Kích hoạt'}</button><button className="row-action-danger" type="button" onClick={() => performRowAction(row, 'delete')}>Xóa vĩnh viễn</button></>}
          {resource === 'categories' && <><button className="row-action-edit" type="button" onClick={() => performRowAction(row, 'edit')}>Sửa</button><button className={row.status === 'ACTIVE' ? 'row-action-hide' : 'row-action-activate'} type="button" onClick={() => performRowAction(row, row.status === 'ACTIVE' ? 'hide' : 'activate')}>{row.status === 'ACTIVE' ? 'Ẩn danh mục' : 'Kích hoạt'}</button><button className="row-action-danger" type="button" onClick={() => performRowAction(row, 'delete')}>Xóa vĩnh viễn</button></>}
          {['promotions', 'giftCards', 'gifts'].includes(resource) && <><button className="row-action-edit" type="button" onClick={() => performRowAction(row, 'edit')}>Sửa</button><button className="row-action-danger" type="button" onClick={() => performRowAction(row, 'delete')}>Xóa/ẩn</button></>}
          {resource === 'membership' && <><button className="row-action-edit" type="button" onClick={() => performRowAction(row, 'edit')}>Sửa</button><button className={row.status === 'ACTIVE' ? 'row-action-hide' : 'row-action-activate'} type="button" onClick={() => performRowAction(row, row.status === 'ACTIVE' ? 'deactivate' : 'activate')}>{row.status === 'ACTIVE' ? 'Ẩn' : 'Khôi phục'}</button></>}
          {resource === 'orders' && <><button className="row-action-edit" type="button" onClick={() => performRowAction(row, 'details')}>Chi tiết</button><select aria-label={`Trạng thái đơn ${row.orderNumber}`} value={row.orderStatus} onChange={(event) => performRowAction(row, `order:${event.target.value}`)}>{Object.entries(orderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></>}
          {resource === 'customers' && <><button className="row-action-edit" type="button" onClick={() => performRowAction(row, 'customer-details')}>Chi tiết</button><button className={row.status === 'INACTIVE' ? 'row-action-activate' : 'row-action-danger'} type="button" onClick={() => performRowAction(row, row.status === 'INACTIVE' ? 'unlock' : 'lock')}>{row.status === 'INACTIVE' ? 'Mở khóa' : 'Khóa'}</button></>}
          {resource === 'reviews' && <><button className="row-action-activate" type="button" disabled={row.status === 'ACTIVE'} onClick={() => performRowAction(row, 'approve')}>Duyệt</button><button className="row-action-hide" type="button" onClick={() => performRowAction(row, 'hide')}>Ẩn</button><button className="row-action-danger" type="button" onClick={() => performRowAction(row, 'delete')}>Xóa</button></>}
          {resource === 'promotions' && <button className={row.status === 'ACTIVE' ? 'row-action-hide' : 'row-action-activate'} type="button" onClick={() => performRowAction(row, row.status === 'ACTIVE' ? 'deactivate' : 'activate')}>{row.status === 'ACTIVE' ? 'Tắt' : 'Bật'}</button>}
        </div></td></tr>)}</tbody></table></div>}
      </PageState>
      {(Number(data?.totalPages) > 1 || page > 1) && <div className="admin-pagination"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Trước</button><span>Trang {page}{data?.totalPages ? ` / ${data.totalPages}` : ''}</span><button disabled={data?.totalPages ? page >= Number(data.totalPages) : rows.length < 12} onClick={() => setPage((current) => current + 1)}>Tiếp →</button></div>}
    </section>
    {modalOpen && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setModalOpen(false); setEditingRow(null); } }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title"><div className="admin-modal-heading"><div><h2 id="admin-modal-title">{editingRow ? 'Sửa' : 'Thêm'} {config.title.toLowerCase()}</h2><p>Thông tin sẽ được lưu qua API quản trị.</p></div><button type="button" onClick={() => { setModalOpen(false); setEditingRow(null); }} aria-label="Đóng">×</button></div><form className="form-stack" onSubmit={createRecord}>
      {resource === 'books' ? <BookFormFields form={form} setForm={setForm} categories={categories} loading={categoriesLoading} error={categoriesError} disabled={saving} /> : createFields.map(([key, label]) => <label key={key}>{label}{resource === 'books' && key === 'categoryId' ? <select required disabled={categoriesLoading || Boolean(categoriesError) || saving || !categories.length} value={categories.some((category) => category.id === form.categoryId) ? form.categoryId : ''} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}><option value="">{categoriesLoading ? 'Đang tải danh mục…' : categoriesError ? 'Không tải được danh mục' : currentBookCategoryIsInactive ? 'Danh mục hiện tại đã ẩn — hãy chọn danh mục khác' : categories.length ? 'Chọn danh mục' : 'Không có danh mục đang hoạt động'}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : <input required={!['discountPrice', 'description', 'minOrderAmount', 'usageLimit', 'balance', 'expiresAt', 'imageUrl'].includes(key)} type={key === 'expiresAt' ? 'date' : ['price', 'discountPrice', 'discountValue', 'stock', 'minPoints', 'minOrderAmount', 'usageLimit', 'initialValue', 'balance', 'pointsCost'].includes(key) ? 'number' : 'text'} min={['price', 'discountPrice', 'discountValue', 'stock', 'minPoints', 'minOrderAmount', 'usageLimit', 'initialValue', 'balance', 'pointsCost'].includes(key) ? '0' : undefined} value={form[key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />}</label>)}
      {resource === 'books' && categoriesError && <p className="inline-error" role="alert">Không thể tải danh mục: {categoriesError}</p>}
      {resource === 'books' && !categoriesLoading && !categoriesError && !categories.length && <p className="inline-error" role="status">Chưa có danh mục đang hoạt động. Hãy tạo hoặc kích hoạt danh mục trước khi lưu sản phẩm.</p>}
      {resource === 'categories' && editingRow && <label>Trạng thái<select required disabled={saving} value={form.status ?? editingRow.status} onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, status: value })); }}><option value="ACTIVE">ACTIVE — Đang hoạt động</option><option value="INACTIVE">INACTIVE — Đang ẩn</option></select></label>}
      {resource === 'books' && editingRow && <label>Trạng thái<select required disabled={saving} value={form.status ?? editingRow.status} onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, status: value })); }}><option value="ACTIVE">ACTIVE — Đang hoạt động</option><option value="INACTIVE">INACTIVE — Đang ẩn</option></select></label>}
      {resource === 'books' && editingRow && <BookImageUpload bookId={editingRow.id} value={form.image ?? editingRow.image} onChange={(image) => setForm((current) => ({ ...current, image }))} disabled={saving} />}
      <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => { setModalOpen(false); setEditingRow(null); }}>Hủy</button><button className="button button-primary" disabled={!canSave}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div></form></section></div>}
    {detailOrder && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailOrder(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title"><div className="admin-modal-heading"><div><h2 id="order-detail-title">Đơn {detailOrder.orderNumber}</h2><p>{detailOrder.user?.name} · {detailOrder.user?.email}</p></div><button type="button" onClick={() => setDetailOrder(null)} aria-label="Đóng">×</button></div><p>Người nhận: {detailOrder.receiverName || detailOrder.user?.name} · {detailOrder.receiverPhone || detailOrder.user?.phone}</p><p>Giao đến: {detailOrder.shippingAddress}</p><p>Trạng thái: {orderLabels[detailOrder.orderStatus] || detailOrder.orderStatus} · Thanh toán: {paymentLabels[detailOrder.paymentStatus] || detailOrder.paymentStatus}</p><div className="admin-order-lines">{asList(detailOrder.items).map((item) => <div key={item.id}><span>{item.title} × {item.quantity}</span><strong>{formatCurrency(item.subtotal)}</strong></div>)}</div><p className="summary-total">Tổng đơn hàng: {formatCurrency(detailOrder.total)}</p></section></div>}
    {detailCustomer && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailCustomer(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="customer-detail-title"><div className="admin-modal-heading"><div><h2 id="customer-detail-title">Tài khoản khách hàng</h2><p>{detailCustomer.name}</p></div><button type="button" onClick={() => setDetailCustomer(null)} aria-label="Đóng">×</button></div><dl className="customer-detail-list"><div><dt>Email</dt><dd>{detailCustomer.email}</dd></div><div><dt>Số điện thoại</dt><dd>{detailCustomer.phone || 'Chưa cập nhật'}</dd></div><div><dt>Ngày tạo</dt><dd>{formatDate(detailCustomer.createdAt)}</dd></div><div><dt>Trạng thái</dt><dd>{detailCustomer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}</dd></div><div><dt>Số đơn hàng</dt><dd>{detailCustomer.orderCount ?? 0}</dd></div></dl></section></div>}
    <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
  </div>;
}

export function AdminBooks() { return <AdminResourcePage resource="books" />; }
export function AdminCategories() { return <AdminResourcePage resource="categories" />; }
export function AdminOrders() { return <AdminResourcePage resource="orders" />; }
export function AdminCustomers() { return <AdminResourcePage resource="customers" />; }
export function AdminReviews() { return <AdminResourcePage resource="reviews" />; }
export function AdminPromotions() { return <AdminResourcePage resource="promotions" />; }
export function AdminMembership() { return <AdminResourcePage resource="membership" />; }
export function AdminReports() {
  const today = new Date();
  const dateValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const fromDefault = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const [filters, setFilters] = useState({ from: dateValue(fromDefault), to: dateValue(today), type: 'month' });
  const [applied, setApplied] = useState(filters);
  const load = useCallback(() => adminService.resource('reports', applied).then((response) => response.data?.data ?? response.data), [applied]);
  const { data, loading, error } = useApi(load, [applied]);
  const rows = asList(data?.items);
  const totals = data?.totals || { revenue: 0, orders: 0, successfulOrders: 0 };
  function exportReport() {
    const csv = [['Kỳ', 'Doanh thu (VND)', 'Tổng đơn hàng', 'Đơn thanh toán thành công', 'Giá trị trung bình'], ...rows.map((row) => [row.period, row.revenue, row.orders, row.successfulOrders, Math.round(row.averageOrderValue)])]
      .map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `techstore-report-${applied.from}-${applied.to}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  function submit(event) {
    event.preventDefault();
    if (filters.from > filters.to) return;
    setApplied({ ...filters });
  }
  return <div className="admin-page"><AdminTitle title="Thống kê và báo cáo" description="Doanh thu, đơn hàng và giao dịch thành công trong khoảng thời gian đã chọn." />
    <section className="admin-panel"><form className="admin-resource-tools" onSubmit={submit}>
      <label>Loại báo cáo<select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="month">Theo tháng</option><option value="day">Theo ngày</option></select></label>
      <label>Từ ngày<input type="date" required value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
      <label>Đến ngày<input type="date" required value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
      <button className="button button-primary" type="submit" disabled={filters.from > filters.to}>Xem báo cáo</button>
      <button className="button button-outline" type="button" onClick={exportReport} disabled={loading || !rows.length}>Xuất CSV</button>
    </form></section>
    <PageState loading={loading} error={error} empty={!loading && !error && !rows.length ? 'Không có dữ liệu thống kê phù hợp trong khoảng thời gian này.' : null}>
      {rows.length > 0 && <>
        <div className="dashboard-metrics"><article><span>Doanh thu đã thanh toán</span><strong>{formatCurrency(totals.revenue)}</strong></article><article><span>Tổng đơn hàng</span><strong>{totals.orders}</strong></article><article><span>Đơn thành công</span><strong>{totals.successfulOrders}</strong></article></div>
        <section className="admin-panel dashboard-panel"><div className="admin-panel-heading"><div><p className="eyebrow">BIỂU ĐỒ DOANH THU</p><h2>{applied.type === 'day' ? 'Theo ngày' : 'Theo tháng'}</h2></div><span className="data-period">{applied.from} – {applied.to}</span></div><RevenueChart rows={rows} /></section>
        <section className="admin-panel resource-panel"><div className="admin-panel-heading"><div><p className="eyebrow">BẢNG SỐ LIỆU</p><h2>Kết quả tổng hợp</h2></div><span className="data-period">{rows.length} kỳ</span></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>Kỳ</th><th>Doanh thu</th><th>Đơn hàng</th><th>Đơn thành công</th><th>Giá trị TB/đơn thành công</th></tr></thead><tbody>{rows.map((row) => <tr key={row.period}><td>{row.period}</td><td>{formatCurrency(row.revenue)}</td><td>{row.orders}</td><td>{row.successfulOrders}</td><td>{formatCurrency(row.averageOrderValue)}</td></tr>)}</tbody></table></div></section>
      </>}
    </PageState>
  </div>;
}
export function AdminGiftCards() { return <AdminResourcePage resource="giftCards" />; }
export function AdminGifts() { return <AdminResourcePage resource="gifts" />; }
