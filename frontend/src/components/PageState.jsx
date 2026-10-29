import { AlertCircle, BookOpen, LoaderCircle } from 'lucide-react';

export default function PageState({ loading, error, empty, label, children }) {
  if (loading) return <div className="state-box" role="status"><LoaderCircle className="spin" size={20} />{label || 'Đang tải dữ liệu…'}</div>;
  if (error) return <div className="state-box state-error" role="alert"><AlertCircle size={20} /><span>{error}</span></div>;
  if (empty) return <div className="state-box state-empty"><BookOpen size={22} /><span>{empty}</span></div>;
  return children ?? null;
}
