import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { cartService } from '../services/cartService.js';
import { asList } from '../utils/apiData.js';
import Toast from '../components/Toast.jsx';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  return <CartStore key={user?.id || 'guest'} authenticated={Boolean(user)}>{children}</CartStore>;
}

function CartStore({ children, authenticated }) {
  const [count, setCount] = useState(0);
  const [notice, setNotice] = useState(null);
  const requestId = useRef(0);
  const timer = useRef(null);

  const refreshCart = useCallback(async () => {
    const request = ++requestId.current;
    if (!authenticated) {
      setCount(0);
      return 0;
    }
    try {
      const response = await cartService.get();
      const data = response?.data?.data ?? response?.data;
      const items = asList(data?.items ?? data?.cart?.items);
      const nextCount = items.reduce((sum, item) => sum + Math.max(0, Number(item?.quantity) || 0), 0);
      if (request === requestId.current) setCount(nextCount);
      return nextCount;
    } catch {
      return null;
    }
  }, [authenticated]);

  const notifyAdded = useCallback((quantity = 1) => {
    const amount = Math.max(1, Number(quantity) || 1);
    setNotice({ message: `Đã thêm ${amount > 1 ? `${amount} sản phẩm` : 'sản phẩm'} vào giỏ hàng.`, type: 'success' });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 3800);
  }, []);

  useEffect(() => {
    refreshCart();
    return () => {
      requestId.current += 1;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [refreshCart]);

  return <CartContext.Provider value={{ count, refreshCart, notifyAdded }}>
    {children}
    <Toast message={notice?.message} type={notice?.type} onClose={() => setNotice(null)} />
  </CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
