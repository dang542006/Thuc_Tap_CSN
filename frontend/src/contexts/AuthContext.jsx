import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_TOKEN_KEY } from '../constants/api.js';
import { authService } from '../services/authService.js';
import { unwrapData } from '../utils/apiData.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    const data = unwrapData(response);
    if (!data?.token || !data?.user) throw new Error('Phản hồi đăng nhập không hợp lệ.');
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const response = await authService.register(payload);
    return unwrapData(response);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await authService.me();
    const currentUser = unwrapData(response);
    setUser(currentUser);
    return currentUser;
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return () => { active = false; };
    }
    authService.me()
      .then((response) => { if (active) setUser(unwrapData(response)); })
      .catch(() => { if (active) logout(); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [logout]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('bookshop:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('bookshop:unauthorized', handleUnauthorized);
  }, [logout]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    register,
    logout,
    refreshUser,
  }), [user, loading, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
