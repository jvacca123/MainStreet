import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { auth as authApi, setAccessToken, onAuthCleared_ } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const refreshTimerRef = useRef(null);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Schedule a silent refresh ~1 minute before the 15-min access token expires
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const data = await authApi.refresh();
        if (data?.token) {
          setAccessToken(data.token);
          if (data.user) setUser(data.user);
          scheduleRefresh();
        } else { clearAuth(); }
      } catch { clearAuth(); }
    }, 14 * 60 * 1000); // 14 min
  }, [clearAuth]);

  // On mount: try to silently restore session via the refresh-token cookie
  useEffect(() => {
    onAuthCleared_(clearAuth);
    (async () => {
      try {
        const data = await authApi.refresh();
        if (data?.token && data?.user) {
          setAccessToken(data.token);
          setUser(data.user);
          scheduleRefresh();
        }
      } catch { /* not logged in */ }
      setBootstrapping(false);
    })();
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [clearAuth, scheduleRefresh]);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    setAccessToken(data.token);
    setUser(data.user);
    scheduleRefresh();
    return data.user;
  }, [scheduleRefresh]);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setAccessToken(data.token);
    setUser(data.user);
    scheduleRefresh();
    return data.user;
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    const data = await authApi.me();
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, bootstrapping, login, register, logout, refresh: refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
