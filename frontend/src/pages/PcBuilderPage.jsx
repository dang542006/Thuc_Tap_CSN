import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, RotateCcw, Sparkles } from 'lucide-react';
import ProductImage from '../components/ProductImage.jsx';
import PageState from '../components/PageState.jsx';
import { pcBuilderService } from '../services/pcBuilderService.js';
import { asList, formatCurrency, getErrorMessage } from '../utils/apiData.js';
import '../styles/pc-builder.css';

const slotLabels = {
  cpu: 'CPU — Bộ xử lý', motherboard: 'Mainboard — Bo mạch chủ', ram: 'RAM — Bộ nhớ trong',
  gpu: 'GPU — Card đồ họa', storage: 'SSD/HDD — Lưu trữ', psu: 'PSU — Bộ nguồn',
  cooler: 'Tản nhiệt CPU', case: 'Case — Vỏ máy tính', fan: 'Quạt case',
};
const statusText = { compatible: 'Đã xác minh tương thích', incompatible: 'Có xung đột', incomplete: 'Chưa đủ linh kiện', unverified: 'Chưa đủ dữ liệu xác minh' };
const checkText = { COMPATIBLE: 'Đạt', INCOMPATIBLE: 'Xung đột', UNKNOWN: 'Chưa xác minh' };

export default function PcBuilderPage() {
  const [catalog, setCatalog] = useState(null);
  const [selection, setSelection] = useState({});
  const [slotSearch, setSlotSearch] = useState({});
  const [priceOrder, setPriceOrder] = useState('asc');
  const [owned, setOwned] = useState({});
  const [checked, setChecked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [error, setError] = useState('');
  const [budget, setBudget] = useState('');
  const [purpose, setPurpose] = useState('gaming');
  const [notes, setNotes] = useState('');
  const [advice, setAdvice] = useState(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState('');

  useEffect(() => {
    let active = true;
    pcBuilderService.catalog().then((data) => { if (active) setCatalog(data); })
      .catch((cause) => { if (active) setError(getErrorMessage(cause, 'Không tải được danh sách linh kiện.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectionKey = useMemo(() => JSON.stringify(selection), [selection]);
  const loadCheck = useCallback(async () => {
    if (!catalog) return;
    setCheckLoading(true);
    try { setChecked(await pcBuilderService.check(selection)); }
    catch (cause) { setError(getErrorMessage(cause, 'Không thể kiểm tra cấu hình.')); }
    finally { setCheckLoading(false); }
  // selectionKey serializes these controlled inputs so the check effect runs only when a selection changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, selectionKey]);
  useEffect(() => { loadCheck(); }, [loadCheck]);

  function setPart(slot, id) {
    setSelection((current) => ({ ...current, [slot]: id || null }));
    setError(''); setAdvice(null);
  }

  function reset() {
    const empty = Object.fromEntries(Object.keys(slotLabels).map((slot) => [slot, null]));
    setSelection(empty); setOwned({}); setAdvice(null); setError(''); setAdviceError('');
  }

  async function requestAdvice(event) {
    event.preventDefault(); setAdviceError(''); setAdvice(null); setAdviceLoading(true);
    try {
      const request = {
        ...(budget ? { budget: Number(budget) } : {}),
        ...(purpose ? { purpose } : {}),
        ownedProductIds: Object.values(owned).filter(Boolean),
        notes: notes.trim(),
      };
      setAdvice(await pcBuilderService.advise(request));
    } catch (cause) { setAdviceError(getErrorMessage(cause, 'Không thể tư vấn cấu hình lúc này.')); }
    finally { setAdviceLoading(false); }
  }

  function useBuild(build) {
    setSelection(Object.fromEntries(Object.keys(slotLabels).map((slot) => [slot, build.parts[slot]?.id || null])));
    setAdvice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const slots = catalog?.slots || {};
  const products = Object.values(slots).flatMap((group) => asList(group.products));
  const ownedIdSet = new Set(Object.values(owned).filter(Boolean));

  return <div className="pc-builder-page shell page-shell">
    <header className="pc-builder-hero"><div><p className="eyebrow">TECHSTORE · TỰ CHỌN LINH KIỆN</p><h1>PC Builder</h1><p>Chọn linh kiện đang có trên website. Giá được tính từ dữ liệu sản phẩm; thông số còn thiếu sẽ được đánh dấu để bạn kiểm tra thêm.</p></div><span className="pc-builder-mark"><Cpu size={34} /></span></header>
    <PageState loading={loading} error={error && !catalog ? error : ''} empty={!loading && !catalog ? 'Chưa tải được danh sách linh kiện.' : null}>
      {catalog && <>
        {catalog.catalogStatus === 'incomplete' && <div className="pc-builder-notice" role="status"><AlertTriangle size={18} /><span>Hiện còn thiếu một số nhóm linh kiện để hoàn thiện cấu hình. Nhóm chưa có hàng sẽ được ghi rõ.</span></div>}
        <div className="pc-builder-layout">
          <section className="pc-builder-panel" aria-labelledby="parts-title">
            <div className="pc-builder-panel-heading"><div><p className="eyebrow">CHỌN TỪNG THÀNH PHẦN</p><h2 id="parts-title">Linh kiện cấu hình</h2></div><button className="button button-outline" type="button" onClick={reset}><RotateCcw size={15} /> Đặt lại</button></div>
            <div className="pc-builder-fields">
              {Object.entries(slotLabels).map(([slot, label]) => {
                const group = slots[slot]; const available = asList(group?.products);
                const query = (slotSearch[slot] || '').trim().toLocaleLowerCase('vi');
                const visible = available
                  .filter((product) => !query || `${product.title} ${product.brand} ${JSON.stringify(product.specifications || {})}`.toLocaleLowerCase('vi').includes(query))
                  .sort((left, right) => (left.effectivePrice - right.effectivePrice) * (priceOrder === 'asc' ? 1 : -1));
                return <div className="pc-builder-select" key={slot}>
                  <span>{label}<small>{available.length} sản phẩm trong dữ liệu</small></span>
                  <input type="search" aria-label={`Tìm ${label}`} placeholder="Tìm theo model, hãng, thông số…" value={slotSearch[slot] || ''} onChange={(event) => setSlotSearch((current) => ({ ...current, [slot]: event.target.value }))} />
                  <select value={selection[slot] || ''} onChange={(event) => setPart(slot, event.target.value)}>
                    <option value="">{available.length ? 'Chọn sản phẩm…' : 'Chưa có sản phẩm thuộc nhóm này'}</option>
                    {visible.map((product) => <option key={product.id} value={product.id} disabled={product.stock < 1}>{product.title} — {formatCurrency(product.effectivePrice)}{product.stock < 1 ? ' · Hết hàng mẫu' : ''}</option>)}
                  </select>
                  {available.length > 1 && <select aria-label={`Sắp xếp giá nhóm ${label}`} value={priceOrder} onChange={(event) => setPriceOrder(event.target.value)}><option value="asc">Giá tăng dần</option><option value="desc">Giá giảm dần</option></select>}
                  {query && !visible.length && <small role="status">Không có sản phẩm khớp từ khóa trong nhóm này.</small>}
                </div>;
              })}
            </div>
            {error && catalog && <p className="inline-error" role="alert">{error}</p>}
            {checked && <div className={`pc-builder-result pc-result-${checked.compatibility.status}`}>
              <div className="pc-builder-total"><div><p className="eyebrow">TỔNG GIÁ THEO DATABASE</p><strong>{formatCurrency(checked.totalPrice)}</strong><small>{checked.compatibility.missing.length ? `Còn thiếu ${checked.compatibility.missing.length} nhóm linh kiện` : 'Đã chọn đủ các nhóm bắt buộc'}</small></div><span className={`pc-status pc-status-${checked.compatibility.status}`}>{checked.compatibility.verifiedCompatible ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{statusText[checked.compatibility.status]}</span></div>
              <p className="pc-builder-summary">{checked.compatibility.message}</p>
              {checked.compatibility.checks.length > 0 && <ul className="pc-check-list">{checked.compatibility.checks.map((check) => <li key={check.key} className={`pc-check-${check.status.toLowerCase()}`}><span>{checkText[check.status]}</span><p>{check.message}</p></li>)}</ul>}
              <p className="pc-builder-footnote">Giá và tồn kho là dữ liệu demo. Tương thích chỉ được xác nhận khi đủ các thông số cần thiết; các mục “Chưa xác minh” cần đối chiếu thêm với nhà sản xuất.</p>
              {checkLoading && <small role="status">Đang cập nhật kiểm tra…</small>}
            </div>}
          </section>

          <aside className="pc-builder-panel pc-builder-advice-panel"><p className="eyebrow"><Sparkles size={14} /> TƯ VẤN CẤU HÌNH</p><h2>Nhờ trợ lý chọn linh kiện</h2><p className="muted">Trợ lý chỉ đề xuất các sản phẩm đang có và đã qua kiểm tra tương thích. Nếu thiếu linh kiện hoặc thông số, hệ thống sẽ nói rõ.</p>
            <form className="pc-advice-form" onSubmit={requestAdvice}>
              <label>Ngân sách tối đa (VNĐ)<input type="number" min="1" max="10000000000" step="500000" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Ví dụ: 20000000" /></label>
              <label>Mục đích sử dụng<select value={purpose} onChange={(event) => setPurpose(event.target.value)}><option value="gaming">Gaming</option><option value="office">Văn phòng và học tập</option><option value="creative">Đồ họa và sáng tạo</option><option value="development">Lập trình</option></select></label>
              <fieldset><legend>Linh kiện bạn đã có</legend><p>Chọn nếu sản phẩm đó có trong danh sách đang bán.</p>{Object.entries(slotLabels).map(([slot, label]) => <label className="owned-part" key={slot}><span>{label}</span><select value={owned[slot] || ''} onChange={(event) => setOwned((current) => ({ ...current, [slot]: event.target.value || null }))}><option value="">Chưa có / không dùng</option>{asList(slots[slot]?.products).map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label>)}</fieldset>
              <label>Nhu cầu bổ sung<textarea value={notes} maxLength={400} onChange={(event) => setNotes(event.target.value)} placeholder="Ví dụ: chơi game 1080p, thỉnh thoảng lập trình; đã có màn hình, chuột và bàn phím." /></label>
              <button className="button button-primary" disabled={adviceLoading}><Sparkles size={16} />{adviceLoading ? 'Đang tìm cấu hình phù hợp…' : 'Tư vấn cấu hình'}</button>
            </form>
            {adviceError && <p className="inline-error" role="alert">{adviceError}</p>}
            {advice && <div className="pc-advice-result" role="status"><span className={`advisor-mode advisor-mode-${advice.mode}`}>{advice.mode === 'ai' ? 'AI đã chọn trong cấu hình được hệ thống kiểm tra' : advice.aiStatus === 'not_configured' ? 'Tư vấn theo tiêu chí · AI chưa cấu hình' : advice.aiStatus === 'catalog_incomplete' ? 'Chưa đủ dữ liệu để xác nhận cấu hình' : 'Tư vấn theo tiêu chí'}</span><p>{advice.message}</p>
              {asList(advice.recommendations).map((build) => <article className="pc-build-suggestion" key={build.id}><strong>{formatCurrency(build.totalPrice)}</strong><p>{build.reason}</p><ul>{Object.entries(slotLabels).map(([slot, label]) => <li key={slot}><span>{label}</span><b>{build.parts[slot]?.title || 'Không có trong đề xuất'}</b></li>)}</ul><small>{build.limitation}</small><button type="button" className="button button-outline" onClick={() => useBuild(build)}>Dùng cấu hình này</button></article>)}</div>}
          </aside>
        </div>
        <section className="pc-builder-selected" aria-label="Linh kiện đã chọn"><h2>Thành phần đang chọn</h2>{Object.entries(slotLabels).map(([slot, label]) => {
          const product = checked?.parts?.[slot];
          return <article key={slot} className="pc-selected-part"><span className="pc-selected-type">{label}</span>{product ? <><ProductImage src={product.image} alt={product.title} /><div><strong>{product.title}</strong><small>{product.brand} · {formatCurrency(product.effectivePrice)}{ownedIdSet.has(product.id) ? ' · Bạn đã có' : ''}</small></div></> : <span className="pc-part-empty">Chưa chọn</span>}</article>;
        })}</section>
        <p className="pc-builder-data-note">Cấu hình chỉ sử dụng sản phẩm đang có trên TechStore. Hiện chưa đủ nhóm vỏ máy và thông số tương thích để xác nhận trọn bộ hoặc thêm cấu hình hoàn chỉnh vào giỏ.</p>
      </>}
    </PageState>
  </div>;
}
