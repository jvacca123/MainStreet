import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mainstreet_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err?.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

export default api;

export const auth = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
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
