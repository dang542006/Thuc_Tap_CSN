import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import CustomerRoute from './CustomerRoute.jsx';
import AdminRoute from './AdminRoute.jsx';
import {
  Home, Login, Register, Books, Cart, OrderSuccess,
  Orders, OrderDetail, Profile, Membership, Reviews, NotFound,
} from '../pages/CustomerPages.jsx';
import {
  AdminDashboard, AdminBooks, AdminCategories, AdminOrders, AdminCustomers,
  AdminReviews, AdminPromotions, AdminMembership, AdminReports,
  AdminGiftCards, AdminGifts,
} from '../pages/AdminPages.jsx';
import CheckoutPage from '../pages/CheckoutPage.jsx';
import BookDetailPage from '../pages/BookDetailPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import CartPage from '../pages/CartPage.jsx';
import OrderTrackingPage from '../pages/OrderTrackingPage.jsx';
import PaymentResultPage from '../pages/PaymentResultPage.jsx';
import PcBuilderPage from '../pages/PcBuilderPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="books" element={<Books />} />
        <Route path="books/:idOrSlug" element={<BookDetailPage />} />
        <Route path="pc-builder" element={<PcBuilderPage />} />
        <Route path="track-order" element={<OrderTrackingPage />} />
        <Route path="payment-result" element={<PaymentResultPage />} />
        <Route element={<CustomerRoute />}>
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-success" element={<OrderSuccess />} />
          <Route path="order-success/:orderId" element={<OrderSuccess />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="membership" element={<Membership />} />
          <Route path="reviews" element={<Reviews />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<AdminRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="books" element={<AdminBooks />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="gift-cards" element={<AdminGiftCards />} />
          <Route path="gifts" element={<AdminGifts />} />
          <Route path="membership" element={<AdminMembership />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Route>
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
