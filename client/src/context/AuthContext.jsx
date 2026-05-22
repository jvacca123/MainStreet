import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth as authApi } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mainstreet_token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then((data) => setUser(data.user))
      .catch(() => { localStorage.removeItem('mainstreet_token'); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('mainstreet_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    localStorage.setItem('mainstreet_token', data.token);
    setUser({ ...data.user, hasProfile: false });
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mainstreet_token');
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const data = await authApi.me();
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
