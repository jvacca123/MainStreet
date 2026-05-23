import axios from 'axios';

// Base URL: in dev Vite proxies /api to :3001. In production it's the same origin.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,                        // sends refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

// Access token is held in memory only. Set via setAccessToken().
let accessToken = null;
let onAuthCleared = null;

export function setAccessToken(token) { accessToken = token || null; }
export function getAccessToken() { return accessToken; }
export function onAuthCleared_(fn) { onAuthCleared = fn; }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On 401, try a single silent refresh; if it fails, clear auth and bubble.
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config || {};
    const status = err.response?.status;

    // Don't try to refresh requests that ARE the refresh, or that already retried.
    const isRefreshCall = original.url?.endsWith('/auth/refresh');
    if (status === 401 && !original._retried && !isRefreshCall) {
      original._retried = true;
      try {
        if (!refreshPromise) refreshPromise = api.post('/auth/refresh');
        const r = await refreshPromise;
        refreshPromise = null;
        const newToken = r.data?.token;
        if (newToken) {
          setAccessToken(newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch (refreshErr) {
        refreshPromise = null;
        setAccessToken(null);
        if (onAuthCleared) onAuthCleared();
      }
    }

    const body = err.response?.data?.error;
    const message = body?.message || err.response?.data?.error || err.message || 'Request failed';
    const out = new Error(message);
    out.status = status;
    out.code = body?.code;
    out.meta = body?.meta;
    return Promise.reject(out);
  }
);

export default api;

// ── API helpers ──────────────────────────────────────────────────────────────
export const auth = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login:    (payload) => api.post('/auth/login', payload).then((r) => r.data),
  refresh:  ()        => api.post('/auth/refresh').then((r) => r.data),
  logout:   ()        => api.post('/auth/logout').then((r) => r.data),
  me:       ()        => api.get('/auth/me').then((r) => r.data),
  verifyEmail:        (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`).then((r) => r.data),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }).then((r) => r.data),
  forgotPassword:     (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword:      (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
};

export const sellers = {
  saveProfile:   (payload) => api.post('/sellers/profile', payload).then((r) => r.data),
  getProfile:    () => api.get('/sellers/profile').then((r) => r.data),
  updateRoadmap: (id, status) => api.put('/sellers/roadmap', { id, status }).then((r) => r.data),
  mentors:       () => api.get('/sellers/mentors').then((r) => r.data),
};

export const buyers = {
  saveProfile:     (payload) => api.post('/buyers/profile', payload).then((r) => r.data),
  getProfile:      () => api.get('/buyers/profile').then((r) => r.data),
  updateChecklist: (id, done) => api.put('/buyers/checklist', { id, done }).then((r) => r.data),
};

export const matches = {
  forUser: (userId) => api.get(`/matches/${userId}`).then((r) => r.data),
};

export const connections = {
  request: (targetUserId, message) =>
    api.post('/connections', { targetUserId, message }).then((r) => r.data),
  list: () => api.get('/connections').then((r) => r.data),
};

export const users = {
  exportData:    () => api.get('/users/me/export').then((r) => r.data),
  deleteAccount: () => api.delete('/users/me').then((r) => r.data),
};
