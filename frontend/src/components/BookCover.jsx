import ProductImage from './ProductImage.jsx';

export default function BookCover({ book }) {
  return <ProductImage src={book.image} alt={`Ảnh sản phẩm ${book.title} — ${book.brand || book.author}`} />;
}
