import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, onSubmit, placeholder = 'Tìm laptop, linh kiện, hãng…' }) {
  return (
    <form className="search-bar" onSubmit={onSubmit} role="search">
      <Search size={18} aria-hidden="true" />
      <input value={value} onChange={onChange} placeholder={placeholder} aria-label="Tìm sản phẩm" />
      <button type="submit">Tìm sản phẩm</button>
    </form>
  );
}
