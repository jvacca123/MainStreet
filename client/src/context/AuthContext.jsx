import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { auth as authApi } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  function scheduleRefresh(expiresInMs) {
    clearTimeout(refreshTimer.current);
    // Refresh 1 minute before expiry, min 10 seconds
    const delay = Math.max(expiresInMs - 60_000, 10_000);
    refreshTimer.current = setTimeout(() => {
      silentRefresh();
    }, delay);
  }

  const silentRefresh = useCallback(async () => {
    try {
      const data = await authApi.refresh();
      window.__mainstreet_token__ = data.token;
      setUser(data.user);
      scheduleRefresh(14 * 60 * 1000); // 15m token, refresh at 14m
    } catch {
      window.__mainstreet_token__ = null;
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // On app load, try silent refresh via httpOnly cookie
    silentRefresh().finally(() => setLoading(false));

    // Handle forced logout events (e.g., 401 with failed refresh)
    function onLogout() {
      window.__mainstreet_token__ = null;
      setUser(null);
      clearTimeout(refreshTimer.current);
    }
    window.addEventListener('mainstreet:logout', onLogout);
    return () => {
      window.removeEventListener('mainstreet:logout', onLogout);
      clearTimeout(refreshTimer.current);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    window.__mainstreet_token__ = data.token;
    setUser(data.user);
    scheduleRefresh(14 * 60 * 1000);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    window.__mainstreet_token__ = data.token;
    setUser({ ...data.user, hasProfile: false });
    scheduleRefresh(14 * 60 * 1000);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    clearTimeout(refreshTimer.current);
    try { await authApi.logout(); } catch { /* */ }
    window.__mainstreet_token__ = null;
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
