import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import FavoritesDialog from '../components/FavoritesDialog.jsx';
import BookAdvisor from '../components/BookAdvisor.jsx';

export default function CustomerLayout() {
  return <div className="customer-layout"><Header /><main className="customer-main"><Outlet /></main><Footer /><FavoritesDialog /><BookAdvisor /></div>;
}
