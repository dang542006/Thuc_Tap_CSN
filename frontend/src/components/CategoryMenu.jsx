import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { categoryService } from '../services/categoryService.js';
import { asList, getErrorMessage, unwrapData } from '../utils/apiData.js';

const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function CategoryMenu({ onNavigate }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const menu = useRef(null);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    categoryService.list().then((response) => {
      if (active) setCategories(asList(unwrapData(response)));
    }).catch((cause) => {
      if (active) setError(getErrorMessage(cause, 'Không thể tải danh mục.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => { if (menu.current) menu.current.open = false; setQuery(''); }, [location.key]);
  useEffect(() => {
    const dismiss = (event) => { if (menu.current && !menu.current.contains(event.target)) menu.current.open = false; };
    const escape = (event) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);
  const q = normalize(query.trim());
  const visible = categories.filter((category) => !category.parentId).map((parent) => ({
    ...parent,
    children: categories.filter((child) => child.parentId === parent.id && (!q || normalize(child.name).includes(q))),
  })).filter((parent) => !q || normalize(parent.name).includes(q) || parent.children.length);
  const selected = new URLSearchParams(location.search).get('category');
  function close() { if (menu.current) menu.current.open = false; onNavigate?.(); }

  return <details className="category-menu" ref={menu} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
    <summary>Danh mục sản phẩm <ChevronDown size={15} /></summary>
    <div className="category-mega">
      <div className="category-mega-heading"><div><strong>Khám phá theo nhóm sản phẩm</strong><p>Chọn nhóm hàng để xem đúng loại thiết bị.</p></div><Link to="/books" onClick={close}>Tất cả sản phẩm →</Link></div>
      <label className="category-mega-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm danh mục…" aria-label="Tìm danh mục sản phẩm" /></label>
      {loading ? <p role="status">Đang tải danh mục…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button></div> : <>
        <div className="category-groups">{visible.map((parent) => <section className="category-group" key={parent.id}>
          <Link className="category-group-title" to={`/books?category=${encodeURIComponent(parent.id)}`} onClick={close} aria-current={location.pathname === '/books' && selected === parent.id ? 'page' : undefined}><strong>{parent.name}</strong><small>{parent.bookCount} sản phẩm</small></Link>
          {parent.children.length > 0 && <div className="category-group-links">{parent.children.map((child) => <Link key={child.id} to={`/books?category=${encodeURIComponent(child.id)}`} onClick={close} aria-current={location.pathname === '/books' && selected === child.id ? 'page' : undefined}>{child.name}<small>{child.bookCount}</small></Link>)}</div>}
        </section>)}</div>
        {!visible.length && <p role="status">{query ? 'Không có danh mục phù hợp.' : 'Chưa có danh mục sản phẩm.'}</p>}
      </>}
    </div>
  </details>;
}
