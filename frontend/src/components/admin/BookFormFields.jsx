export default function BookFormFields({ form, setForm, categories, loading, error, disabled }) {
  // Capture the value immediately, before React executes the state updater.
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <>
    <label>Tên sản phẩm<input required maxLength={255} disabled={disabled} value={form.title ?? ''} onChange={(event) => change('title', event.target.value)} /></label>
    <label>Hãng sản xuất<input required maxLength={120} disabled={disabled} value={form.brand ?? ''} onChange={(event) => change('brand', event.target.value)} /></label>
    <label>Danh mục<select required disabled={disabled || loading || Boolean(error) || !categories.length} value={categories.some((item) => item.id === form.categoryId) ? form.categoryId : ''} onChange={(event) => change('categoryId', event.target.value)}><option value="">{loading ? 'Đang tải danh mục…' : error ? 'Không tải được danh mục' : 'Chọn danh mục đang hoạt động'}</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {[['price', 'Giá'], ['discountPrice', 'Giá ưu đãi'], ['stock', 'Tồn kho']].map(([key, label]) => <label key={key}>{label}<input type="text" inputMode={key === 'stock' ? 'numeric' : 'decimal'} required={key !== 'discountPrice'} maxLength={24} autoComplete="off" disabled={disabled} value={form[key] ?? ''} onChange={(event) => change(key, event.target.value)} placeholder={key === 'discountPrice' ? 'Để trống nếu không có ưu đãi' : undefined} /></label>)}
    <label>Mô tả<textarea rows={6} maxLength={4000} disabled={disabled} value={form.description ?? ''} onChange={(event) => change('description', event.target.value)} /></label>
    <label>Thông số kỹ thuật (JSON)<textarea rows={6} maxLength={4000} disabled={disabled} value={form.specifications ?? ''} onChange={(event) => change('specifications', event.target.value)} placeholder={'{"CPU":"Intel Core i5",\n "RAM":"16GB",\n "SSD":"512GB"}'} /></label>
    <label>Cấu hình tùy chọn (JSON)<textarea rows={8} maxLength={8000} disabled={disabled} value={form.optionGroups ?? ''} onChange={(event) => change('optionGroups', event.target.value)} placeholder={'[{"groupName":"RAM","maxChoose":1,"required":true,"items":[{"optionName":"16GB","extraCost":0},{"optionName":"32GB","extraCost":1500000}]}]'} /></label>
  </>;
}
