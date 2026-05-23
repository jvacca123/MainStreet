import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = window.__mainstreet_token__;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const msg = err?.response?.data?.error?.message || err?.response?.data?.error || err.message || 'Request failed';

    if (status === 401 && err.config && !err.config._retry) {
      err.config._retry = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        window.__mainstreet_token__ = data.token;
        err.config.headers.Authorization = `Bearer ${data.token}`;
        return api(err.config);
      } catch {
        window.__mainstreet_token__ = null;
        window.dispatchEvent(new Event('mainstreet:logout'));
      }
    }
    return Promise.reject(new Error(msg));
  },
);

export default api;

export const auth = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  refresh: () => api.post('/auth/refresh').then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`).then((r) => r.data),
  resendVerification: () => api.post('/auth/resend-verification').then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }).then((r) => r.data),
};

export const sellers = {
  saveProfile: (payload) => api.post('/sellers/profile', payload).then((r) => r.data),
  getProfile: () => api.get('/sellers/profile').then((r) => r.data),
  updateRoadmap: (id, status) => api.put('/sellers/roadmap', { id, status }).then((r) => r.data),
  mentors: () => api.get('/sellers/mentors').then((r) => r.data),
};

export const buyers = {
  saveProfile: (payload) => api.post('/buyers/profile', payload).then((r) => r.data),
  getProfile: () => api.get('/buyers/profile').then((r) => r.data),
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
  deleteAccount: () => api.delete('/users/me').then((r) => r.data),
  exportData: () => api.get('/users/me/export').then((r) => r.data),
};
