export default function BookSkeleton({ count = 4 }) {
  return <div className="book-grid skeleton-grid" aria-label="Đang tải sản phẩm">{Array.from({ length: count }, (_, index) => <div className="book-skeleton" key={index}><div className="skeleton-block skeleton-cover" /><div className="skeleton-block skeleton-line" /><div className="skeleton-block skeleton-line short" /><div className="skeleton-block skeleton-line price" /></div>)}</div>;
}
