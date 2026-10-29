import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import ProductImage from './ProductImage.jsx';
import { advisorService } from '../services/advisorService.js';
import { formatCurrency, getErrorMessage } from '../utils/apiData.js';
import { getEffectiveBookPrice } from '../utils/catalog.js';
import '../styles/advisor.css';

const welcome = { role: 'assistant', message: 'Mô tả nhu cầu, ngân sách hoặc ứng dụng bạn thường dùng. Mình sẽ tìm sản phẩm đang có tại TechStore và nêu rõ điểm phù hợp cùng giới hạn của từng lựa chọn.', recommendations: [] };

export default function BookAdvisor() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([welcome]);
  const [draft, setDraft] = useState('');
  const [budget, setBudget] = useState('');
  const [purpose, setPurpose] = useState('');
  const [device, setDevice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const input = useRef(null);
  const end = useRef(null);
  const pending = useRef(null);
  const history = useRef([]);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.current.showModal(); document.body.style.overflow = 'hidden'; input.current?.focus();
    return () => { dialog.current?.close(); document.body.style.overflow = overflow; focus?.focus(); };
  }, [open]);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy, open]);

  async function send(text = draft) {
    const parts = [text.trim(), budget && `Ngân sách dự kiến: ${budget} VNĐ`, purpose && `Mục đích: ${purpose}`, device && `Ưu tiên: ${device}`].filter(Boolean);
    const message = parts.join('. ');
    if (!message || pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    const nextHistory = [...history.current, message].slice(-8);
    setError(''); setBusy(true); setDraft('');
    setMessages((current) => [...current, { role: 'user', message }]);
    try {
      const result = await advisorService.reply(nextHistory, controller.signal);
      if (!result?.message || !Array.isArray(result.recommendations)) throw new Error('Phản hồi tư vấn không hợp lệ.');
      history.current = nextHistory;
      setMessages((current) => [...current, { role: 'assistant', ...result }]);
    } catch (err) {
      if (!controller.signal.aborted) { setError(getErrorMessage(err)); setDraft(text); setMessages((current) => current.slice(0, -1)); }
    } finally { if (pending.current === controller) { pending.current = null; setBusy(false); } }
  }
  function reset() {
    pending.current?.abort(); pending.current = null; history.current = [];
    setMessages([welcome]); setDraft(''); setBudget(''); setPurpose(''); setDevice(''); setError(''); setBusy(false); input.current?.focus();
  }

  return <>
    <button className="advisor-launcher" type="button" onClick={() => setOpen(true)} aria-label="Mở AI tư vấn máy tính" aria-haspopup="dialog"><MessageCircle size={21} /><span>AI tư vấn máy tính</span></button>
    <dialog ref={dialog} className="advisor-dialog" aria-labelledby="advisor-title" onCancel={(event) => { event.preventDefault(); setOpen(false); }}>
      <header className="advisor-heading"><div><h2 id="advisor-title">Trợ lý chọn máy tính</h2><p>Tư vấn dựa trên sản phẩm và thông tin đang có</p></div><button type="button" className="icon-button" onClick={reset} aria-label="Bắt đầu tư vấn mới"><RotateCcw size={18} /></button><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Đóng tư vấn"><X size={20} /></button></header>
      <div className="advisor-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Nội dung tư vấn">
        {messages.map((item, index) => <div className={`advisor-message advisor-${item.role}`} key={index}>
          <p>{item.message}</p>
          {item.mode && <span className={`advisor-mode advisor-mode-${item.mode}`}>{item.mode === 'ai' ? 'Đề xuất do AI tạo' : item.aiStatus === 'not_configured' ? 'Tư vấn theo quy tắc · AI chưa cấu hình' : item.aiStatus === 'no_candidates' ? 'Không có sản phẩm phù hợp' : item.aiStatus === 'quota_or_rate_limited' ? 'Tư vấn theo quy tắc · AI đang bận hoặc hết quota' : item.aiStatus === 'timeout' ? 'Tư vấn theo quy tắc · AI quá thời gian chờ' : item.aiStatus === 'invalid_response' ? 'Tư vấn theo quy tắc · AI trả dữ liệu không hợp lệ' : 'Tư vấn theo quy tắc · AI tạm không khả dụng'}</span>}
          {item.recommendations?.map(({ product, reason, limitation }) => <article className="advisor-product" key={product.id}>
            <Link className="advisor-book" to={`/books/${product.slug || product.id}`} onClick={() => setOpen(false)}><ProductImage src={product.image} alt={product.title} /><div><strong>{product.title}</strong><span>{product.category?.name} · {product.brand || product.author}</span><b>{formatCurrency(getEffectiveBookPrice(product))}</b><small>Xem sản phẩm <ArrowUpRight size={13} /></small></div></Link>
            {reason && <p className="advisor-reason"><b>Phù hợp vì:</b> {reason}</p>}
            {limitation && <p className="advisor-limit"><b>Lưu ý:</b> {limitation}</p>}
          </article>)}
        </div>)}
        {busy && <p className="advisor-loading" role="status">Đang tìm sản phẩm và chuẩn bị tư vấn…</p>}<div ref={end} />
      </div>
      <form className="advisor-form" onSubmit={(event) => { event.preventDefault(); send(); }}>
        {error && <p className="inline-error" role="alert">{error} Bạn có thể gửi lại yêu cầu.</p>}
        <div className="advisor-fields">
          <label>Ngân sách (VNĐ)<input value={budget} maxLength={20} inputMode="numeric" onChange={(event) => setBudget(event.target.value)} placeholder="Ví dụ: 20000000" /></label>
          <label>Mục đích<select value={purpose} onChange={(event) => setPurpose(event.target.value)}><option value="">Chưa chọn</option><option>Văn phòng và học tập</option><option>Gaming</option><option>Đồ họa và sáng tạo</option><option>Lập trình và làm việc chuyên môn</option></select></label>
          <label>Ưu tiên thiết bị<select value={device} onChange={(event) => setDevice(event.target.value)}><option value="">Bất kỳ</option><option>Laptop</option><option>PC để bàn</option><option>Linh kiện và phụ kiện</option></select></label>
        </div>
        <label htmlFor="advisor-input">Mô tả nhu cầu (không bắt buộc nếu đã chọn tiêu chí)</label>
        <div><input ref={input} id="advisor-input" value={draft} maxLength={350} disabled={busy} placeholder="Game/ứng dụng, RAM, lưu trữ, nâng cấp…" onChange={(event) => setDraft(event.target.value)} /><button type="submit" disabled={busy || (!draft.trim() && !budget && !purpose && !device)} aria-label="Gửi yêu cầu tư vấn"><Send size={18} /></button></div>
        <p>Giá và tình trạng hàng là dữ liệu mẫu, có thể khác thực tế. AI chỉ đề xuất sản phẩm đang có trên website. Không nhập thông tin cá nhân.</p>
      </form>
    </dialog>
  </>;
}
