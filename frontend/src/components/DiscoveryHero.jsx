import { ArrowRight, ArrowUpRight, Cpu, Laptop, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { asList, formatCurrency } from '../utils/apiData.js';

const shortcuts = [
  { slug: 'laptop-van-phong-hoc-tap', label: 'Laptop văn phòng', icon: Laptop },
  { slug: 'laptop-gaming', label: 'Laptop gaming', icon: Laptop },
  { slug: 'linh-kien', label: 'Linh kiện máy tính', icon: Cpu },
  { slug: 'phu-kien', label: 'Phụ kiện', icon: Monitor },
];

export default function DiscoveryHero({ categories, products }) {
  const available = asList(categories.data);
  const targets = shortcuts.map((item) => ({ ...item, category: available.find((category) => category.slug === item.slug) })).filter((item) => item.category);
  const photos = asList(products.data);
  return (
    <section className="discovery-hero shell" aria-labelledby="discovery-title">
      <div className="discovery-copy">
        <p className="eyebrow">TECHSTORE · CỬA HÀNG CÔNG NGHỆ</p>
        <h1 id="discovery-title">Thiết bị phù hợp. Thông tin rõ ràng.</h1>
        <p>Chọn laptop, linh kiện và phụ kiện theo nhu cầu. Xem thông tin sản phẩm và giá ngay trên trang.</p>
        <Link className="button button-primary" to="/books">Xem tất cả sản phẩm <ArrowRight size={17} /></Link>
        <div className="discovery-shortcuts" aria-label="Lối vào danh mục">
          {targets.map(({ category, label, icon: Icon }) => <Link className="discovery-shortcut" key={category.id} to={`/books?category=${encodeURIComponent(category.id)}`}>
            <span className="discovery-shortcut-icon"><Icon size={17} /></span><div><strong>{label}</strong><small>{category.bookCount} sản phẩm</small></div><ArrowUpRight size={16} aria-hidden="true" />
          </Link>)}
        </div>
      </div>
      <div className="discovery-products" aria-label="Sản phẩm có ảnh đã đối chiếu model">
        {photos.length ? photos.map((product, index) => <Link className="discovery-product" key={product.id} to={`/books/${product.slug || product.id}`}>
          <ProductImage src={product.image} alt={product.title} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : undefined} />
          <span className="discovery-product-copy"><strong>{product.title}</strong><small>{product.brand || product.author}</small><b>{formatCurrency(product.discountPrice || product.price)}</b></span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>) : products.loading ? Array.from({ length: 4 }, (_, index) => <div className="discovery-product is-loading" key={index} aria-hidden="true"><span /><i /></div>) : <p className="discovery-products-error">Chưa tải được nhóm sản phẩm nổi bật.</p>}
      </div>
    </section>
  );
}
