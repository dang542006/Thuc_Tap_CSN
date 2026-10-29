import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { favoriteService } from '../services/favoriteService.js';
import { getErrorMessage } from '../utils/apiData.js';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  return <FavoritesStore key={user?.id || 'guest'} authenticated={Boolean(user)}>{children}</FavoritesStore>;
}

function FavoritesStore({ children, authenticated }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(authenticated);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState([]);
  const locks = useRef(new Set());
  const request = useRef(0);
  const reload = useCallback(async () => {
    if (!authenticated) return;
    const version = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await favoriteService.list();
      if (!Array.isArray(result)) throw new Error('Danh sách yêu thích trả về không hợp lệ.');
      if (version === request.current) setBooks(result);
    } catch (err) {
      if (version === request.current) setError(getErrorMessage(err));
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [authenticated]);
  useEffect(() => { reload(); return () => { request.current += 1; }; }, [reload]);

  async function toggle(book) {
    if (!authenticated) { setOpen(true); return; }
    if (loading || error) { setOpen(true); return; }
    if (locks.current.has(book.id)) return;
    locks.current.add(book.id);
    setPending([...locks.current]);
    try {
      const result = await favoriteService.toggle(book.id);
      if (typeof result?.isFavorite !== 'boolean') throw new Error('Phản hồi yêu thích không hợp lệ.');
      setBooks((current) => result.isFavorite
        ? [book, ...current.filter((item) => item.id !== book.id)]
        : current.filter((item) => item.id !== book.id));
    } finally {
      locks.current.delete(book.id);
      setPending([...locks.current]);
    }
  }

  return <FavoritesContext.Provider value={{ books, loading, error, open, setOpen, pending, toggle, reload, authenticated }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() { return useContext(FavoritesContext); }
