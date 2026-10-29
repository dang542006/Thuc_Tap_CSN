import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import PageState from '../components/PageState.jsx';

export default function AdminRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageState loading label="Đang xác thực quyền truy cập…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}
